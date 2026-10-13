import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { questionSchema } from "@/schemas";
import connectDB from "@/db";
import { Question } from "@/db/models";

// PATCH /api/questions/[id] — update a question (admin only)
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
  // Use partial validation so admins can update only `status`
  const partial = questionSchema.partial().safeParse(body);
  if (!partial.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: partial.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();
  const question = await Question.findById(params.id);
  if (!question) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }

  Object.assign(question, partial.data);
  await question.save();

  return NextResponse.json({
    success: true,
    data: { ...question.toObject(), id: question._id.toString() },
  });
}

// DELETE /api/questions/[id] — hard delete (admin only, use sparingly)
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
  const deleted = await Question.findByIdAndDelete(params.id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Question deleted." });
}
