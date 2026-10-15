import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Employee, Invitation } from "@/db/models";
import { sendAssessmentInvitation } from "@/lib/email";

const INVITATION_TTL_DAYS = 7;

// POST /api/admin/assessments/[cycleId]/resend
// Body: { employeeId: string } — resend invitation to one employee.
export async function POST(
  req: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { employeeId } = body as { employeeId?: string };
  if (!employeeId) {
    return NextResponse.json({ success: false, error: "employeeId is required." }, { status: 400 });
  }

  await connectDB();

  const [cycle, employee] = await Promise.all([
    AssessmentCycle.findById(params.cycleId).lean(),
    Employee.findById(employeeId).select("fullName email status").lean(),
  ]);

  if (!cycle) {
    return NextResponse.json({ success: false, error: "Cycle not found." }, { status: 404 });
  }
  if (!employee) {
    return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
  }
  if (employee.status === "inactive") {
    return NextResponse.json(
      { success: false, error: "Cannot resend to an inactive employee." },
      { status: 422 }
    );
  }

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Upsert invitation: update existing or create new
  const existing = await Invitation.findOne({ employeeId, cycleId: params.cycleId });

  let emailError: string | undefined;
  try {
    await sendAssessmentInvitation({
      toEmail:      employee.email,
      employeeName: employee.fullName,
      cycleLabel:   cycle.label,
      expiresAt,
    });
  } catch (err) {
    emailError = (err as Error).message ?? "Email send failed";
    console.error("[Resend] Email failed:", emailError);
  }

  if (existing) {
    existing.sentAt      = now;
    existing.expiresAt   = expiresAt;
    existing.resentAt    = now;
    existing.status      = "pending";
    existing.emailStatus = emailError ? "failed" : "sent";
    if (emailError) existing.emailError = emailError;
    await existing.save();
  } else {
    await Invitation.create({
      employeeId,
      cycleId:     params.cycleId,
      sentAt:      now,
      expiresAt,
      status:      "pending",
      emailStatus: emailError ? "failed" : "sent",
      emailError,
    });
  }

  return NextResponse.json({
    success: !emailError,
    message: emailError
      ? `Invitation record updated but email delivery failed: ${emailError}`
      : `Invitation resent to ${employee.email}. Expires ${expiresAt.toLocaleDateString("en-GB")}.`,
    expiresAt,
  });
}
