import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createCycleSchema } from "@/schemas";
import { sendAssessmentInvitation } from "@/lib/email";
import connectDB from "@/db";
import { AssessmentCycle, Employee, AdminAuditLog, Invitation } from "@/db/models";

const INVITATION_TTL_DAYS = 7;

// ─── POST /api/cycles ──────────────────────────────────────────────────────────
// Admin: Open a new assessment cycle and send emails to all active employees.
export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const adminId = payload.sub;

  const body = await req.json();
  const parsed = createCycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const cycle = await AssessmentCycle.create({
    label:        parsed.data.label,
    passingScore: parsed.data.passingScore,
    openedBy:     adminId,
    status:       "active",
  });

  const activeEmployees = await Employee.find({ status: "active" })
    .select("_id fullName email")
    .lean();

  // Send emails and track per-employee invitation status
  const emailResults = await Promise.allSettled(
    activeEmployees.map((emp) =>
      sendAssessmentInvitation({
        toEmail:      emp.email,
        employeeName: emp.fullName,
        cycleLabel:   cycle.label,
        expiresAt,
      })
    )
  );

  // Create one Invitation record per employee with email delivery status
  const invitationDocs = activeEmployees.map((emp, i) => {
    const result  = emailResults[i];
    const success = result.status === "fulfilled";
    return {
      employeeId:  emp._id,
      cycleId:     cycle._id,
      sentAt:      now,
      expiresAt,
      status:      "pending" as const,
      emailStatus: success ? ("sent" as const) : ("failed" as const),
      emailError:  !success
        ? (result as PromiseRejectedResult).reason?.message ?? "Email send failed"
        : undefined,
    };
  });

  await Invitation.insertMany(invitationDocs, { ordered: false }).catch(() => {
    // Log but don't fail — cycle is already created
    console.error("[Cycles] Some invitation records failed to insert");
  });

  const emailsFailed = emailResults.filter((r) => r.status === "rejected").length;

  await AdminAuditLog.create({
    adminId,
    action:     "cycle_sent",
    targetId:   cycle._id,
    targetType: "cycle",
    metadata: {
      label:          cycle.label,
      recipientCount: activeEmployees.length,
      emailsFailed,
      expiresAt,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      cycleId:        cycle._id.toString(),
      label:          cycle.label,
      emailsSent:     activeEmployees.length - emailsFailed,
      emailsFailed,
      invitationExpiresAt: expiresAt,
    },
  });
}

// ─── GET /api/cycles ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const cycles = await AssessmentCycle.find().sort({ openedAt: -1 }).lean();

  const formattedCycles = cycles.map((c) => ({
    ...c,
    id:       c._id.toString(),
    openedBy: c.openedBy.toString(),
  }));

  return NextResponse.json({ success: true, data: formattedCycles });
}
