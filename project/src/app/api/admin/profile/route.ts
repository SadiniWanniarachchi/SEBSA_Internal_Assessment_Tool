import { NextRequest, NextResponse } from "next/server";
import { verifyToken, verifyPassword, hashPassword } from "@/lib/auth";
import connectDB from "@/db";
import { AdminUser } from "@/db/models";

// PATCH /api/admin/profile
// Allows the authenticated admin to update their display name or change their password.
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { fullName, currentPassword, newPassword } = body as {
    fullName?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  await connectDB();
  const admin = await AdminUser.findById(payload.sub);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin not found." }, { status: 404 });
  }

  if (fullName !== undefined) {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ success: false, error: "Name must be at least 2 characters." }, { status: 400 });
    }
    admin.fullName = trimmed;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is required to set a new one." },
        { status: 400 }
      );
    }
    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }
    admin.passwordHash = await hashPassword(newPassword);
  }

  await admin.save();

  return NextResponse.json({
    success: true,
    data: {
      id:       admin._id.toString(),
      fullName: admin.fullName,
      email:    admin.email,
      role:     admin.role,
    },
  });
}
