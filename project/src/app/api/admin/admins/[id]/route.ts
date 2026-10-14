import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { AdminUser } from "@/db/models";

// DELETE /api/admin/admins/[id] — remove an admin account
// An admin cannot delete their own account.
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

  if (payload.sub === params.id) {
    return NextResponse.json(
      { success: false, error: "You cannot remove your own admin account." },
      { status: 400 }
    );
  }

  await connectDB();
  const admin = await AdminUser.findById(params.id);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin not found." }, { status: 404 });
  }

  await AdminUser.findByIdAndDelete(params.id);

  return NextResponse.json({
    success: true,
    message: `${admin.fullName}'s admin account has been removed.`,
  });
}
