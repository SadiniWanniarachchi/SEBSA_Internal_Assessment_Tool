import { NextRequest, NextResponse } from "next/server";
import { requireRole, hashPassword } from "@/lib/auth";
import { z } from "zod";
import connectDB from "@/db";
import { AdminUser } from "@/db/models";

const createAdminSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email:    z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// GET /api/admin/admins — list all admin accounts
export async function GET(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const admins = await AdminUser.find()
    .select("-passwordHash")
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: admins.map((a) => ({
      id:        a._id.toString(),
      fullName:  a.fullName,
      email:     a.email,
      role:      a.role,
      createdAt: a.createdAt,
    })),
  });
}

// POST /api/admin/admins — create a new admin account
export async function POST(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await AdminUser.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "An admin with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const admin = await AdminUser.create({
    fullName:     parsed.data.fullName,
    email:        parsed.data.email.toLowerCase(),
    passwordHash,
    role:         "admin",
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id:       admin._id.toString(),
        fullName: admin.fullName,
        email:    admin.email,
        role:     admin.role,
      },
    },
    { status: 201 }
  );
}
