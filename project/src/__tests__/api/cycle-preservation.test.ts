import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/admin/cycles/[id]/route";
import { GET as assessment } from "@/app/api/assessment/route";
import { POST as submit } from "@/app/api/attempts/route";
import { GET as download } from "@/app/api/certificates/[id]/route";
import { GET as recipients } from "@/app/api/admin/assessments/[cycleId]/recipients/route";
import { GET as session } from "@/app/api/auth/route";
import connectDB from "@/db";
import { verifyToken } from "@/lib/auth";
import { generateCertificate } from "@/lib/pdf";
import { AssessmentCycle, AdminAuditLog, Invitation, Attempt, Certificate, Employee } from "@/db/models";

jest.mock("@/db", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"), verifyToken: jest.fn(),
}));
jest.mock("@/lib/pdf", () => ({ generateCertificate: jest.fn() }));
jest.mock("@/lib/email", () => ({ sendCertificateEmail: jest.fn() }));
jest.mock("@/db/models", () => {
  const model = () => Object.fromEntries([
    "findById", "findOne", "find", "create", "deleteMany", "findByIdAndDelete", "countDocuments", "updateOne",
  ].map((key) => [key, jest.fn()]));
  return { AssessmentCycle: model(), AdminAuditLog: model(), Invitation: model(),
    Attempt: model(), Certificate: model(), Employee: model(), Question: model(), AdminUser: model() };
});
const mocked = (fn: unknown) => fn as jest.Mock;
function query(value: unknown): any {
  const q = { lean: jest.fn().mockResolvedValue(value), select: jest.fn(), sort: jest.fn(), populate: jest.fn() };
  q.select.mockReturnValue(q); q.sort.mockReturnValue(q); q.populate.mockReturnValue(q);
  return q;
}
function req(method: string, role = "admin", body?: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method, headers: { "x-user-id": role === "admin" ? "admin-1" : "employee-1", "x-user-role": role,
      "content-type": "application/json", cookie: "token=test" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const params = { params: { id: "cycle-1" } };
let cycle: any;
beforeEach(() => {
  jest.resetAllMocks();
  cycle = { _id: "cycle-1", label: "Historical cycle", status: "active", openedAt: new Date("2026-01-01"),
    openedBy: "admin-1", closedAt: null, save: jest.fn().mockResolvedValue(undefined) };
  mocked(AssessmentCycle.findById).mockResolvedValue(cycle);
  mocked(AdminAuditLog.create).mockResolvedValue({});
});

test.each(["active", "deactivated", "closed"])("DELETE refuses a %s cycle without database access", async (status) => {
  cycle.status = status;
  const response = await DELETE(req("DELETE"));
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("PATCH");
  expect(connectDB).not.toHaveBeenCalled();
  expect(AssessmentCycle.findByIdAndDelete).not.toHaveBeenCalled();
  expect(Invitation.deleteMany).not.toHaveBeenCalled();
});
test("employees cannot delete or change cycle status", async () => {
  expect((await DELETE(req("DELETE", "employee"))).status).toBe(403);
  expect((await PATCH(req("PATCH", "employee", { action: "deactivate" }), params)).status).toBe(403);
  expect(connectDB).not.toHaveBeenCalled();
});
test("deactivation changes only status/audit fields and preserves history relationships", async () => {
  const before = { openedAt: cycle.openedAt, openedBy: cycle.openedBy, closedAt: cycle.closedAt, label: cycle.label };
  expect((await PATCH(req("PATCH", "admin", { action: "deactivate" }), params)).status).toBe(200);
  expect(cycle).toMatchObject({ ...before, status: "deactivated", deactivatedBy: "admin-1" });
  expect(cycle.deactivatedAt).toBeInstanceOf(Date);
  expect(cycle.save).toHaveBeenCalledTimes(1);
  expect(AdminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: "cycle_deactivated" }));
  for (const model of [Invitation, Attempt, Certificate]) {
    expect(model.deleteMany).not.toHaveBeenCalled();
    expect(model.updateOne).not.toHaveBeenCalled();
  }
});
test("reactivates a deactivated cycle when no other cycle is active", async () => {
  cycle.status = "deactivated";
  mocked(AssessmentCycle.findOne).mockReturnValue(query(null));
  expect((await PATCH(req("PATCH", "admin", { action: "reactivate" }), params)).status).toBe(200);
  expect(cycle.status).toBe("active");
  expect(cycle.save).toHaveBeenCalledTimes(1);
});
test("reactivation respects the existing active-cycle guard", async () => {
  cycle.status = "deactivated";
  mocked(AssessmentCycle.findOne).mockReturnValue(query({ label: "Other cycle" }));
  expect((await PATCH(req("PATCH", "admin", { action: "reactivate" }), params)).status).toBe(409);
  expect(cycle.save).not.toHaveBeenCalled();
});
test("inactive cycles cannot supply assessment questions or accept submissions", async () => {
  mocked(AssessmentCycle.findOne).mockReturnValue(query(null));
  expect((await assessment(req("GET", "employee"))).status).toBe(404);
  mocked(Invitation.findOne).mockReturnValue(query({ expiresAt: new Date("2099-01-01"), status: "pending" }));
  mocked(Attempt.find).mockReturnValue(query([]));
  const answers = Object.fromEntries(Array.from({ length: 10 }, (_, i) => ["q" + i, "a"]));
  expect((await submit(req("POST", "employee", { cycleId: "cycle-1", answers }))).status).toBe(404);
  expect(Attempt.create).not.toHaveBeenCalled();
  expect(Certificate.create).not.toHaveBeenCalled();
});
function certificateFixture(owner = "employee-1") {
  mocked(Certificate.findOne).mockReturnValue(query({ attemptId: "attempt-1", certificateNumber: "cert-1" }));
  mocked(Attempt.findById).mockReturnValue(query({ employeeId: owner, cycleId: "cycle-1", score: 9, submittedAt: new Date("2026-01-02") }));
  mocked(Employee.findById).mockReturnValue(query({ fullName: "Employee", email: "employee@example.com" }));
  mocked(AssessmentCycle.findById).mockReturnValue(query({ label: "Historical cycle", status: "deactivated" }));
  mocked(Attempt.countDocuments).mockResolvedValue(1);
  mocked(generateCertificate).mockResolvedValue(Buffer.from("%PDF-test"));
}
test("the owner can download a certificate from a deactivated cycle", async () => {
  certificateFixture();
  const response = await download(req("GET", "employee"), { params: { id: "cert-1" } });
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("application/pdf");
  expect(await response.text()).toBe("%PDF-test");
  expect(generateCertificate).toHaveBeenCalledWith(expect.objectContaining({ cycleLabel: "Historical cycle", score: 9, certificateNumber: "cert-1" }));
});
test("certificate ownership and role restrictions remain enforced", async () => {
  certificateFixture("another-employee");
  expect((await download(req("GET", "employee"), { params: { id: "cert-1" } })).status).toBe(403);
  expect((await download(req("GET", "admin"), { params: { id: "cert-1" } })).status).toBe(403);
  expect(generateCertificate).not.toHaveBeenCalled();
});
test("employee certificate history remains visible with no active cycle", async () => {
  mocked(verifyToken).mockResolvedValue({ sub: "employee-1", role: "employee" });
  mocked(Employee.findById).mockReturnValue(query({ _id: "employee-1", fullName: "Employee" }));
  mocked(AssessmentCycle.findOne).mockReturnValue(query(null));
  mocked(Attempt.find).mockReturnValue(query([{ _id: "attempt-1", cycleId: { label: "Historical cycle" }, score: 9 }]));
  mocked(Certificate.find).mockReturnValue(query([{ _id: "cert-id", attemptId: "attempt-1", certificateNumber: "cert-1", issuedAt: new Date("2026-01-02") }]));
  const response = await session(req("GET", "employee"));
  const json = await response.json();
  expect(response.status).toBe(200);
  expect(json.data.activeCycle).toBeNull();
  expect(json.data.certificates).toEqual([expect.objectContaining({ certificateNumber: "cert-1", score: 9, cycleLabel: "Historical cycle" })]);
  expect(Attempt.find).toHaveBeenCalledWith({ employeeId: "employee-1" });
});
test("admins can read completed recipients and scores for inactive cycles", async () => {
  mocked(Invitation.find).mockReturnValue(query([{ employeeId: "employee-1", status: "completed", emailStatus: "sent", sentAt: new Date("2026-01-01"), expiresAt: new Date("2026-01-08") }]));
  mocked(Attempt.find).mockReturnValue(query([{ employeeId: "employee-1", score: 9, passed: true, isFinal: true, attemptNumber: 1 }]));
  mocked(Employee.find).mockReturnValue(query([{ _id: "employee-1", fullName: "Employee" }]));
  const response = await recipients(req("GET"), { params: { cycleId: "cycle-1" } });
  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual([expect.objectContaining({ invitationStatus: "completed", latestScore: 9, passFail: "Pass" })]);
});
