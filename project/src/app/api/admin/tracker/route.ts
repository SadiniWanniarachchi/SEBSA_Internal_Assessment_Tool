import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Employee, Attempt, Invitation } from "@/db/models";

// GET /api/admin/tracker
export async function GET(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const [activeCycle, allEmployees] = await Promise.all([
    AssessmentCycle.findOne({ status: "active" }).lean(),
    Employee.find()
      .sort({ fullName: 1 })
      .select("_id fullName email status")
      .lean(),
  ]);

  let attempts: any[]    = [];
  let invitations: any[] = [];

  if (activeCycle) {
    [attempts, invitations] = await Promise.all([
      Attempt.find({ cycleId: activeCycle._id })
        .select("employeeId score passed isFinal attemptNumber submittedAt")
        .lean(),
      Invitation.find({ cycleId: activeCycle._id })
        .select("employeeId status emailStatus expiresAt")
        .lean(),
    ]);
  }

  // Build O(1) lookup maps
  const invByEmployee = new Map(invitations.map((i) => [i.employeeId.toString(), i]));

  // For each employee, find their final attempt (attempt2 if exists, else attempt1)
  const attemptsByEmployee = new Map<string, any[]>();
  for (const att of attempts) {
    const key = att.employeeId.toString();
    if (!attemptsByEmployee.has(key)) attemptsByEmployee.set(key, []);
    attemptsByEmployee.get(key)!.push(att);
  }

  const rows = allEmployees.map((emp) => {
    const empAttempts  = attemptsByEmployee.get(emp._id.toString()) ?? [];
    const finalAttempt = empAttempts.find((a) => a.isFinal)
      ?? (empAttempts.length > 0 ? empAttempts.sort((a, b) => b.attemptNumber - a.attemptNumber)[0] : null);
    const attempt1     = empAttempts.find((a) => a.attemptNumber === 1);
    const inv          = invByEmployee.get(emp._id.toString());

    // Derive assessment display status
    let assessmentStatus: "Not Started" | "In Progress" | "Retry Available" | "Completed" | "Expired";
    let passFail: "Pass" | "Fail" | "Pending" | "Retry Available" | "Not Started";

    if (!inv) {
      assessmentStatus = "Not Started";
      passFail         = "Not Started";
    } else if (inv.status === "expired" && !finalAttempt) {
      assessmentStatus = "Expired";
      passFail         = "Not Started";
    } else if (!finalAttempt && !attempt1) {
      assessmentStatus = inv.status === "opened" ? "In Progress" : "Not Started";
      passFail         = "Not Started";
    } else if (attempt1 && !attempt1.isFinal) {
      assessmentStatus = "Retry Available";
      passFail         = "Retry Available";
    } else if (finalAttempt?.isFinal) {
      assessmentStatus = "Completed";
      passFail         = finalAttempt.passed ? "Pass" : "Fail";
    } else {
      assessmentStatus = "Not Started";
      passFail         = "Not Started";
    }

    return {
      employeeId:       emp._id.toString(),
      fullName:         emp.fullName,
      email:            emp.email,
      employeeStatus:   emp.status,
      assessmentStatus,
      passFail,
      score:            finalAttempt?.score ?? null,
      percentage:       finalAttempt != null
        ? Math.round((finalAttempt.score / 10) * 100)
        : null,
      submittedAt:      finalAttempt?.submittedAt ?? null,
      attemptNumber:    finalAttempt?.attemptNumber ?? null,
      invitationExpiry: inv?.expiresAt ?? null,
    };
  });

  const totalCompleted  = rows.filter((r) => r.assessmentStatus === "Completed").length;
  const totalPassed     = rows.filter((r) => r.passFail === "Pass").length;
  const totalFailed     = rows.filter((r) => r.passFail === "Fail").length;
  const totalRetry      = rows.filter((r) => r.assessmentStatus === "Retry Available").length;

  return NextResponse.json({
    success: true,
    data: {
      cycle: activeCycle
        ? {
            id:       activeCycle._id.toString(),
            label:    activeCycle.label,
            openedAt: activeCycle.openedAt,
            status:   activeCycle.status,
            passingScore: activeCycle.passingScore ?? 8,
          }
        : null,
      rows,
      stats: {
        total:          rows.length,
        completed:      totalCompleted,
        pending:        rows.length - totalCompleted - totalRetry,
        retryAvailable: totalRetry,
        completionRate: rows.length > 0
          ? Math.round((totalCompleted / rows.length) * 100)
          : 0,
        passCount:      totalPassed,
        failCount:      totalFailed,
        passRate:       totalCompleted > 0
          ? Math.round((totalPassed / totalCompleted) * 100)
          : 0,
      },
    },
  });
}
