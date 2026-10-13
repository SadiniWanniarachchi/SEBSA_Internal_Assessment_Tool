import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Attempt } from "@/db/models";

// DELETE /api/dev/reset-attempt
// Development-only: removes the calling employee's attempt for the active cycle.
// Certificates are NOT deleted — historical records are preserved.
// Returns 403 in production.
export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "This endpoint is not available in production." },
      { status: 403 }
    );
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "employee") {
    return NextResponse.json(
      { success: false, error: "Employee authentication required." },
      { status: 403 }
    );
  }

  await connectDB();

  const activeCycle = await AssessmentCycle.findOne({ status: "active" }).lean();
  if (!activeCycle) {
    return NextResponse.json(
      { success: false, error: "No active assessment cycle found." },
      { status: 404 }
    );
  }

  const deleted = await Attempt.findOneAndDelete({
    employeeId: payload.sub,
    cycleId: activeCycle._id,
  });

  if (!deleted) {
    return NextResponse.json({
      success: true,
      alreadyReset: true,
      message: "No attempt found for this cycle — you can already start fresh.",
      cycleId: activeCycle._id.toString(),
      cycleLabel: activeCycle.label,
    });
  }

  return NextResponse.json({
    success: true,
    alreadyReset: false,
    message: `Test attempt reset. Your certificate record is preserved. You can now retake the "${activeCycle.label}" assessment.`,
    deletedAttemptId: deleted._id.toString(),
    cycleId: activeCycle._id.toString(),
    cycleLabel: activeCycle.label,
  });
}

// GET /api/dev/reset-attempt
// Returns the current attempt status for the logged-in employee (dev only).
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "This endpoint is not available in production." },
      { status: 403 }
    );
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "employee") {
    return NextResponse.json(
      { success: false, error: "Employee authentication required." },
      { status: 403 }
    );
  }

  await connectDB();

  const activeCycle = await AssessmentCycle.findOne({ status: "active" }).lean();
  if (!activeCycle) {
    return NextResponse.json({ success: true, data: { activeCycle: null, attempt: null } });
  }

  const attempt = await Attempt.findOne({
    employeeId: payload.sub,
    cycleId: activeCycle._id,
  }).lean();

  return NextResponse.json({
    success: true,
    data: {
      activeCycle: {
        id: activeCycle._id.toString(),
        label: activeCycle.label,
        status: activeCycle.status,
      },
      attempt: attempt
        ? {
            id: attempt._id.toString(),
            score: attempt.score,
            submittedAt: attempt.submittedAt,
          }
        : null,
    },
  });
}
