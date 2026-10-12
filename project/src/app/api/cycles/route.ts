import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createCycleSchema } from "@/schemas";
import { sendAssessmentInvitation } from "@/lib/email";
import connectDB from "@/db";
import { AssessmentCycle, Employee, AdminAuditLog } from "@/db/models";

// ─── POST /api/cycles ──────────────────────────────────────────────────────────
// Admin: Open a new assessment cycle and send emails to all active employees.
// Implements FR-13 (one-click Send Assessment).
export async function POST(req: NextRequest) {
  // ── Auth (admin only) ─────────────────────────────────────────────────────
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const adminId = payload.sub;

  // ── Validate ──────────────────────────────────────────────────────────────
  const body = await req.json();
  const parsed = createCycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();

  // ── Create the cycle ──────────────────────────────────────────────────────
  const cycle = await AssessmentCycle.create({
    label:    parsed.data.label,
    openedBy: adminId,
    status:   "active",
  });

  // ── Fetch all active employees ────────────────────────────────────────────
  const activeEmployees = await Employee.find({ status: "active" }).select("_id fullName email").lean();

  // ── Send invitation emails in parallel ───────────────────────────────────
  const emailResults = await Promise.allSettled(
    activeEmployees.map((emp) =>
      sendAssessmentInvitation({
        toEmail:      emp.email,
        employeeName: emp.fullName,
        cycleLabel:   cycle.label,
      })
    )
  );

  const emailsFailed = emailResults.filter((r) => r.status === "rejected").length;

  // ── Audit log ─────────────────────────────────────────────────────────────
  await AdminAuditLog.create({
    adminId,
    action:     "cycle_sent",
    targetId:   cycle._id,
    targetType: "cycle",
    metadata: {
      label:         cycle.label,
      recipientCount: activeEmployees.length,
      emailsFailed,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      cycleId:        cycle._id.toString(),
      label:          cycle.label,
      emailsSent:     activeEmployees.length - emailsFailed,
      emailsFailed,
    },
  });
}

// ─── GET /api/cycles ───────────────────────────────────────────────────────────
// List all cycles (admin only).
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const cycles = await AssessmentCycle.find().sort({ openedAt: 1 }).lean();
  
  const formattedCycles = cycles.map(c => ({
      ...c,
      id: c._id.toString(),
      openedBy: c.openedBy.toString()
  }));

  return NextResponse.json({ success: true, data: formattedCycles });
}
