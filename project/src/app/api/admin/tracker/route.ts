import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Employee, Attempt } from "@/db/models";

// GET /api/admin/tracker
// Returns all employees and their assessment completion status for the active cycle.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const activeCycle = await AssessmentCycle.findOne({ status: "active" }).lean();
  const allEmployees = await Employee.find().sort({ fullName: 1 }).lean();

  let attempts: any[] = [];
  if (activeCycle) {
    attempts = await Attempt.find({ cycleId: activeCycle._id }).lean();
  }

  const attemptByEmployee = new Map(attempts.map((a) => [a.employeeId.toString(), a]));

  const rows = allEmployees.map((emp) => {
    const attempt = attemptByEmployee.get(emp._id.toString());
    return {
      employeeId: emp._id.toString(),
      fullName: emp.fullName,
      email: emp.email,
      department: emp.department,
      employeeStatus: emp.status,
      assessmentStatus: attempt ? "Completed" : "Not Started",
      score: attempt?.score ?? null,
      percentage: attempt ? Math.round((attempt.score / 10) * 100) : null,
      submittedAt: attempt?.submittedAt ?? null,
    };
  });

  const totalCompleted = rows.filter((r) => r.assessmentStatus === "Completed").length;

  return NextResponse.json({
    success: true,
    data: {
      cycle: activeCycle
        ? {
            id: activeCycle._id.toString(),
            label: activeCycle.label,
            openedAt: activeCycle.openedAt,
            status: activeCycle.status,
          }
        : null,
      rows,
      stats: {
        total: rows.length,
        completed: totalCompleted,
        pending: rows.length - totalCompleted,
        completionRate:
          rows.length > 0 ? Math.round((totalCompleted / rows.length) * 100) : 0,
      },
    },
  });
}
