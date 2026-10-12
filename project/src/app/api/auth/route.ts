import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signToken } from "@/lib/auth";
import { loginSchema } from "@/schemas";
import connectDB from "@/db";
import { Employee, AdminUser } from "@/db/models";

// POST /api/auth/login
// Authenticates employee or admin, returns a signed JWT in an httpOnly cookie.
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate input with Zod
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // Connect to MongoDB
  await connectDB();

  // ── Try employee collection first ─────────────────────────────────────────
  const employee = await Employee.findOne({ email }).lean();

  if (employee) {
    if (employee.status === "inactive") {
      return NextResponse.json(
        { success: false, error: "Your account is inactive. Please contact HR." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await signToken({ id: employee._id.toString(), email: employee.email, role: "employee" });
    const response = NextResponse.json({ success: true, data: { role: "employee" } });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 8, // 8 hours
    });
    return response;
  }

  // ── Try admin collection ──────────────────────────────────────────────────
  const admin = await AdminUser.findOne({ email }).lean();

  if (admin) {
    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await signToken({ id: admin._id.toString(), email: admin.email, role: "admin" });
    const response = NextResponse.json({ success: true, data: { role: "admin" } });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 8,
    });
    return response;
  }

  // ── No match ──────────────────────────────────────────────────────────────
  return NextResponse.json(
    { success: false, error: "Incorrect email or password." },
    { status: 401 }
  );
}
