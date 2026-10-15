import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { Invitation, Attempt, Employee } from "@/db/models";

// GET /api/admin/assessments/[cycleId]/recipients
// Returns per-employee invitation + attempt status for a given cycle.
export async function GET(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { cycleId } = params;
  await connectDB();

  const [invitations, attempts] = await Promise.all([
    Invitation.find({ cycleId }).lean(),
    Attempt.find({ cycleId })
      .select("employeeId score passed isFinal attemptNumber submittedAt")
      .sort({ attemptNumber: 1 })
      .lean(),
  ]);

  const employeeIds = invitations.map((i) => i.employeeId);
  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .select("_id fullName email")
    .lean();

  const empMap = new Map(employees.map((e) => [e._id.toString(), e]));
  const now = new Date();

  const attemptsByEmployee = new Map<string, typeof attempts>();
  for (const att of attempts) {
    const key = att.employeeId.toString();
    if (!attemptsByEmployee.has(key)) attemptsByEmployee.set(key, []);
    attemptsByEmployee.get(key)!.push(att);
  }

  const rows = invitations.map((inv) => {
    const emp = empMap.get(inv.employeeId.toString());
    const empAttempts = attemptsByEmployee.get(inv.employeeId.toString()) ?? [];
    const finalAttempt = empAttempts.find((a) => a.isFinal) ?? empAttempts[empAttempts.length - 1];

    const invExpired = inv.expiresAt < now && inv.status !== "completed";
    const invStatus  = invExpired ? "expired" : inv.status;

    let passFail: "Pass" | "Fail" | "Retry Available" | "In Progress" | "Not Started";
    if (!finalAttempt) {
      passFail = invStatus === "opened" ? "In Progress" : "Not Started";
    } else if (!finalAttempt.isFinal) {
      passFail = "Retry Available";
    } else {
      passFail = finalAttempt.passed ? "Pass" : "Fail";
    }

    return {
      employeeId:    inv.employeeId.toString(),
      employeeName:  emp?.fullName ?? "Unknown",
      employeeEmail: emp?.email ?? "",
      invitationStatus: invStatus,
      emailStatus:   inv.emailStatus,
      emailError:    inv.emailStatus === "failed" ? (inv.emailError ?? null) : null,
      sentAt:        inv.sentAt,
      expiresAt:     inv.expiresAt,
      resentAt:      inv.resentAt ?? null,
      attemptCount:  empAttempts.length,
      latestScore:   finalAttempt?.score ?? null,
      latestPassed:  finalAttempt?.passed ?? null,
      submittedAt:   finalAttempt?.submittedAt ?? null,
      passFail,
    };
  });

  // Sort: completed first, then in-progress, then not started
  const ORDER: Record<string, number> = { Pass: 0, Fail: 1, "Retry Available": 2, "In Progress": 3, "Not Started": 4 };
  rows.sort((a, b) => (ORDER[a.passFail] ?? 9) - (ORDER[b.passFail] ?? 9));

  return NextResponse.json({ success: true, data: rows });
}
