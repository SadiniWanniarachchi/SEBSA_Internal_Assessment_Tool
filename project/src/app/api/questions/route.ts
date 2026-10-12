import { NextRequest, NextResponse } from "next/server";
import { questionSchema } from "@/schemas";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { Question } from "@/db/models";

// ─── GET /api/questions ───────────────────────────────────────────────────────
// Returns all questions (admin only). Employees never see the question bank directly.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const allQuestions = await Question.find().sort({ createdAt: 1 }).lean();
  
  // Convert _id to string for the frontend
  const formattedQuestions = allQuestions.map(q => ({ ...q, id: q._id.toString() }));

  return NextResponse.json({ success: true, data: formattedQuestions });
}

// ─── POST /api/questions ──────────────────────────────────────────────────────
// Create a new question (admin only). FR-11.
export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectDB();
  const newQuestion = await Question.create(parsed.data);
  const formattedQuestion = { ...newQuestion.toObject(), id: newQuestion._id.toString() };

  return NextResponse.json({ success: true, data: formattedQuestion }, { status: 201 });
}
