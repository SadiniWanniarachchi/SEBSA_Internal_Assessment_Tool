import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AdminUser } from "@/db/models";

// DELETE /api/admin/admins/[id] — remove an admin account
// An admin cannot delete their own account.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = requireRole(req, "admin");
  if (!adminId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  if (adminId === params.id) {
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
