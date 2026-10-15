import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { Employee } from "@/db/models";

// POST /api/employees/bulk-status
// Body: { action: "activate" | "deactivate" }
// Updates only employees whose status differs from the target — skips those
// already in the target state. Never touches AdminUser records or any
// assessment / invitation data.
export async function POST(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  if (action !== "activate" && action !== "deactivate") {
    return NextResponse.json(
      { success: false, error: "action must be 'activate' or 'deactivate'" },
      { status: 400 },
    );
  }

  const targetStatus = action === "activate" ? "active"   : "inactive";
  const fromStatus   = action === "activate" ? "inactive" : "active";

  await connectDB();

  const [eligible, total] = await Promise.all([
    Employee.countDocuments({ status: fromStatus }),
    Employee.countDocuments(),
  ]);

  if (eligible === 0) {
    return NextResponse.json({
      success: true,
      data:    { updated: 0, skipped: total, total },
      message: `All employees are already ${targetStatus}.`,
    });
  }

  const result = await Employee.updateMany(
    { status: fromStatus },
    { $set: { status: targetStatus } },
  );

  return NextResponse.json({
    success: true,
    data: {
      updated:  result.modifiedCount,
      skipped:  total - result.modifiedCount,
      total,
    },
    message: `${result.modifiedCount} employee${result.modifiedCount !== 1 ? "s" : ""} ${action === "activate" ? "activated" : "deactivated"} successfully.`,
  });
}
