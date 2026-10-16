import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/auth/route";
import { GET as assessment } from "@/app/api/assessment/route";
import { POST as submit } from "@/app/api/attempts/route";
import { hashPassword, verifyToken } from "@/lib/auth";
import { Employee, AdminUser, AssessmentCycle, Attempt, Certificate, Invitation } from "@/db/models";

jest.mock("@/db", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/pdf", () => ({ generateCertificate: jest.fn() }));
jest.mock("@/lib/email", () => ({ sendCertificateEmail: jest.fn() }));
jest.mock("@/db/models", () => {
  const model = () => Object.fromEntries(["findOne", "findById", "find", "create", "updateOne"].map(key => [key, jest.fn()]));
  return { Employee: model(), AdminUser: model(), AssessmentCycle: model(), Attempt: model(), Certificate: model(), Invitation: model(), Question: model() };
});

const mock = (fn: unknown) => fn as jest.Mock;
function query(value: unknown) {
  const q = { lean: jest.fn().mockResolvedValue(value), select: jest.fn(), sort: jest.fn(), populate: jest.fn() };
  q.select.mockReturnValue(q); q.sort.mockReturnValue(q); q.populate.mockReturnValue(q);
  return q;
}

const email = "account@example.test";
const password = "test-only-password";
let passwordHash: string;
beforeAll(async () => {
  process.env.JWT_SECRET = "isolated-auth-regression-test-secret-32-chars";
  passwordHash = await hashPassword(password);
});
beforeEach(() => jest.resetAllMocks());

async function login(role: "employee" | "admin", submittedPassword = password) {
  const user = { _id: "user-1", fullName: "Test Account", email, passwordHash, status: "active" };
  mock(Employee.findOne).mockReturnValue(query(role === "employee" ? user : null));
  mock(AdminUser.findOne).mockReturnValue(query(role === "admin" ? user : null));
  return POST(new NextRequest("http://localhost/api/auth", {
    method: "POST", body: JSON.stringify({ email, password: submittedPassword }),
    headers: { "Content-Type": "application/json" },
  }));
}

test.each(["employee", "admin"] as const)("%s login verifies the password and issues a role-specific HTTP-only session", async role => {
  const response = await login(role);
  expect(response.status).toBe(200);
  expect((await response.json()).data.role).toBe(role);
  const token = response.cookies.get("token");
  expect(token?.httpOnly).toBe(true);
  expect(await verifyToken(token!.value)).toMatchObject({ sub: "user-1", role, email });
});

test.each(["employee", "admin"] as const)("%s invalid password does not issue a session", async role => {
  const response = await login(role, "wrong-password");
  expect(response.status).toBe(401);
  expect(response.cookies.get("token")).toBeUndefined();
});

async function sessionRequest() {
  const response = await login("employee");
  return new NextRequest("http://localhost/api/auth", {
    headers: { cookie: `token=${response.cookies.get("token")!.value}` },
  });
}

test("dashboard reports exact invitation metadata and counts final cycles without counting retries twice", async () => {
  const req = await sessionRequest();
  mock(Employee.findById).mockReturnValue(query({ _id: "user-1", fullName: "Test Account", email }));
  mock(AssessmentCycle.findOne).mockReturnValue(query({ _id: "active", label: "Current cycle" }));
  mock(Attempt.find).mockReturnValue(query([
    { _id: "a1", cycleId: { _id: "old", label: "Historical cycle" }, isFinal: false, score: 3, submittedAt: new Date() },
    { _id: "a2", cycleId: { _id: "old", label: "Historical cycle" }, isFinal: true, score: 8, submittedAt: new Date() },
    { _id: "a3", cycleId: { _id: "other", label: "Other cycle" }, isFinal: true, score: 7, submittedAt: new Date() },
  ]));
  mock(Attempt.findOne).mockReturnValue(query(null));
  const expiresAt = new Date("2030-01-01T09:30:00.000Z");
  mock(Invitation.findOne).mockReturnValue(query({ expiresAt, status: "pending" }));
  mock(Certificate.find).mockReturnValue(query([{ _id: "cert", attemptId: "a2", certificateNumber: "owned-cert", issuedAt: new Date() }]));
  const response = await GET(req);
  const { data } = await response.json();
  expect(data.activeCycle.invitation).toEqual({ expiresAt: expiresAt.toISOString(), status: "pending" });
  expect(data.completedAssessmentCount).toBe(2);
  expect(data.certificates).toEqual([expect.objectContaining({ certificateNumber: "owned-cert", cycleLabel: "Historical cycle", score: 8 })]);
  expect(Attempt.find).toHaveBeenCalledWith({ employeeId: "user-1" });
  expect(Invitation.updateOne).not.toHaveBeenCalled();
  expect(Attempt.create).not.toHaveBeenCalled();
});

test.each([null, { _id: "invitation", status: "pending", expiresAt: new Date("2000-01-01") }])("assessment rejects missing or expired invitations before creating an attempt", async invitation => {
  mock(AssessmentCycle.findOne).mockReturnValue(query({ _id: "cycle-1" }));
  mock(Invitation.findOne).mockReturnValue(query(invitation));
  const response = await assessment(new NextRequest("http://localhost/api/assessment", {
    headers: { "x-user-id": "user-1", "x-user-role": "employee" },
  }));
  expect(response.status).toBe(403);
  expect(Attempt.create).not.toHaveBeenCalled();
  expect(Attempt.find).not.toHaveBeenCalled();
});

test.each([
  [{ attemptNumber: 1, score: 6 }],
  [{ attemptNumber: 1, score: 3 }, { attemptNumber: 2, score: 5 }],
])("submission still enforces finalization and the two-attempt limit", async (...attempts) => {
  mock(Invitation.findOne).mockReturnValue(query({ status: "completed", expiresAt: new Date("2000-01-01") }));
  mock(AssessmentCycle.findOne).mockReturnValue(query({ _id: "cycle-1", status: "active" }));
  mock(Attempt.find).mockReturnValue(query(attempts));
  const response = await submit(new NextRequest("http://localhost/api/attempts", {
    method: "POST",
    headers: { "x-user-id": "user-1", "x-user-role": "employee", "Content-Type": "application/json" },
    body: JSON.stringify({ cycleId: "cycle-1", answers: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`q${index}`, "a"])) }),
  }));
  expect(response.status).toBe(409);
  expect(Attempt.create).not.toHaveBeenCalled();
  expect(Certificate.create).not.toHaveBeenCalled();
});
