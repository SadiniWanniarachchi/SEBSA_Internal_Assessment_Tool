import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hashPassword } from "@/lib/auth";
import { updateEmployeeSchema } from "@/schemas";
import connectDB from "@/db";
import { Employee, Invitation } from "@/db/models";

// PATCH /api/employees/[id] — update employee (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();
  const employee = await Employee.findById(params.id);
  if (!employee) {
    return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email.toLowerCase();
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.password) {
    updates.passwordHash = await hashPassword(parsed.data.password);
  }

  Object.assign(employee, updates);
  await employee.save();

  const { passwordHash: _, ...safe } = employee.toObject();
  return NextResponse.json({ success: true, data: { ...safe, id: employee._id.toString() } });
}

// DELETE /api/employees/[id] — permanently remove employee (admin only)
// Assessment history (Attempt, Certificate) is retained for audit purposes.
// Invitations are removed as they are operational records tied to the employee.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const employee = await Employee.findById(params.id);
  if (!employee) {
    return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
  }

  const name = employee.fullName;

  // Remove operational invitation records for this employee.
  // Attempt and Certificate records are kept intact: they are historical/audit data
  // and their cycleId/score fields remain meaningful without the employee profile.
  await Invitation.deleteMany({ employeeId: employee._id });

  // Permanently delete the employee document from the database.
  await Employee.findByIdAndDelete(employee._id);

  return NextResponse.json({
    success: true,
    message: `${name}'s profile has been permanently deleted. Assessment history is retained for audit purposes.`,
  });
}

// GET /api/employees/[id] — fetch single employee (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const employee = await Employee.findById(params.id).select("-passwordHash").lean();
  if (!employee) {
    return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { ...employee, id: employee._id.toString() } });
}
