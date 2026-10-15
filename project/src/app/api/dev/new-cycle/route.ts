import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, AdminUser } from "@/db/models";

// POST /api/dev/new-cycle
// Development-only: creates a brand-new test assessment cycle.
// Employees can then take the assessment fresh against the new cycle.
// Existing cycles are NOT closed — all cycles remain in the DB.
// Returns 403 in production.
export async function POST(req: NextRequest) {
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
  if (!payload) {
    return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
  }

  await connectDB();

  // AssessmentCycle.openedBy is required — use any admin record
  const anyAdmin = await AdminUser.findOne().lean();
  if (!anyAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: "No admin user found in the database. Run `npm run db:seed` first.",
      },
      { status: 500 }
    );
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `TEST-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const cycle = await AssessmentCycle.create({
    label,
    status: "active",
    openedAt: now,
    openedBy: anyAdmin._id,
  });

  return NextResponse.json({
    success: true,
    data: {
      cycleId: cycle._id.toString(),
      label: cycle.label,
      message: `New test cycle "${cycle.label}" created. All employees can now take a fresh assessment against this cycle.`,
    },
  });
}
