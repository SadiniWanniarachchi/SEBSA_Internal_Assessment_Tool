import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, AdminAuditLog } from "@/db/models";

// Keep legacy DELETE callers safe without connecting to or mutating the database.
export async function DELETE(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    { success: false, error: "Assessment cycles cannot be deleted. Deactivate the cycle instead." },
    { status: 405, headers: { Allow: "PATCH" } }
  );
}

// PATCH /api/admin/cycles/[id]
// Body: { action: "deactivate" | "reactivate" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = requireRole(req, "admin");
  if (!adminId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (action !== "deactivate" && action !== "reactivate") {
    return NextResponse.json(
      { success: false, error: "action must be 'deactivate' or 'reactivate'" },
      { status: 400 }
    );
  }

  await connectDB();

  const cycle = await AssessmentCycle.findById(id);
  if (!cycle) {
    return NextResponse.json({ success: false, error: "Cycle not found." }, { status: 404 });
  }

  if (action === "deactivate") {
    if (cycle.status === "deactivated") {
      return NextResponse.json(
        { success: false, error: "This cycle is already deactivated." },
        { status: 409 }
      );
    }
    cycle.status       = "deactivated";
    cycle.deactivatedAt = new Date();
    cycle.deactivatedBy = adminId as any;

    await cycle.save();

    await AdminAuditLog.create({
      adminId,
      action:     "cycle_deactivated",
      targetId:   cycle._id,
      targetType: "cycle",
      metadata:   { label: cycle.label },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        id:             cycle._id.toString(),
        status:         cycle.status,
        deactivatedAt:  cycle.deactivatedAt,
      },
    });
  }

  // action === "reactivate"
  if (cycle.status !== "deactivated") {
    return NextResponse.json(
      { success: false, error: "Only deactivated cycles can be reactivated." },
      { status: 409 }
    );
  }

  // Guard: refuse if another cycle is already active
  const existingActive = await AssessmentCycle.findOne({
    _id: { $ne: cycle._id },
    status: "active",
  }).lean();

  if (existingActive) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot reactivate: "${existingActive.label}" is already the active cycle. Deactivate it first.`,
      },
      { status: 409 }
    );
  }

  cycle.status        = "active";
  cycle.deactivatedAt = null;
  cycle.deactivatedBy = null;

  await cycle.save();

  await AdminAuditLog.create({
    adminId,
    action:     "cycle_reactivated",
    targetId:   cycle._id,
    targetType: "cycle",
    metadata:   { label: cycle.label },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    data: { id: cycle._id.toString(), status: cycle.status },
  });
}
