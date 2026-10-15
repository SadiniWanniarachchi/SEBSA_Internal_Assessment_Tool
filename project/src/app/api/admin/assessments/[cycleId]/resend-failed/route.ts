import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Employee, Invitation } from "@/db/models";
import { sendAssessmentInvitation } from "@/lib/email";

const INVITATION_TTL_DAYS = 7;

// POST /api/admin/assessments/[cycleId]/resend-failed
// Resends all failed invitations for a cycle using Promise.allSettled.
// Returns { processed, succeeded, stillFailed }.
export async function POST(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const cycle = await AssessmentCycle.findById(params.cycleId).lean();
  if (!cycle) {
    return NextResponse.json({ success: false, error: "Cycle not found." }, { status: 404 });
  }

  const failedInvitations = await Invitation.find({
    cycleId:     params.cycleId,
    emailStatus: "failed",
  });

  if (failedInvitations.length === 0) {
    return NextResponse.json({
      success: true,
      data:    { processed: 0, succeeded: 0, stillFailed: 0 },
      message: "No failed invitations found for this cycle.",
    });
  }

  const employeeIds = failedInvitations.map((inv) => inv.employeeId);
  const employees   = await Employee.find({
    _id:    { $in: employeeIds },
    status: "active",
  }).select("fullName email _id").lean();

  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]));

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const results = await Promise.allSettled(
    failedInvitations.map(async (inv) => {
      const employee = employeeMap.get(inv.employeeId.toString());
      if (!employee) {
        throw new Error(`Employee ${inv.employeeId} not found or inactive`);
      }

      await sendAssessmentInvitation({
        toEmail:      employee.email,
        employeeName: employee.fullName,
        cycleLabel:   cycle.label,
        expiresAt,
      });

      inv.sentAt      = now;
      inv.expiresAt   = expiresAt;
      inv.resentAt    = now;
      inv.status      = "pending";
      inv.emailStatus = "sent";
      inv.emailError  = undefined;
      await inv.save();
    })
  );

  let succeeded  = 0;
  let stillFailed = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      stillFailed++;
      const inv    = failedInvitations[i];
      const errMsg = (result.reason as Error).message ?? "Resend failed";
      inv.emailStatus = "failed";
      inv.emailError  = errMsg;
      await inv.save().catch(() => {});
    } else {
      succeeded++;
    }
  }

  return NextResponse.json({
    success: stillFailed === 0,
    data:    { processed: failedInvitations.length, succeeded, stillFailed },
    message: stillFailed === 0
      ? `Successfully resent ${succeeded} invitation${succeeded !== 1 ? "s" : ""}.`
      : `Resent ${succeeded} of ${failedInvitations.length} invitations. ${stillFailed} still failed.`,
  });
}
