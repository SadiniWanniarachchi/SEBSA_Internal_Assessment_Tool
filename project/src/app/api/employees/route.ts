import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hashPassword } from "@/lib/auth";
import { employeeSchema } from "@/schemas";
import connectDB from "@/db";
import { Employee } from "@/db/models";

// GET /api/employees — list all employees (admin only)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const employees = await Employee.find()
    .select("-passwordHash")
    .sort({ fullName: 1 })
    .lean();

  const formatted = employees.map((e) => ({ ...e, id: e._id.toString() }));
  return NextResponse.json({ success: true, data: formatted });
}

// POST /api/employees — create a new employee (admin only)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await Employee.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "An employee with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const employee = await Employee.create({
    fullName: parsed.data.fullName,
    email: parsed.data.email.toLowerCase(),
    department: parsed.data.department || "Enterprise Consulting",
    status: parsed.data.status,
    passwordHash,
  });

  const { passwordHash: _, ...safe } = employee.toObject();
  return NextResponse.json(
    { success: true, data: { ...safe, id: employee._id.toString() } },
    { status: 201 }
  );
}
