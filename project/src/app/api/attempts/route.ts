import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { submitAssessmentSchema } from "@/schemas";
import { scoreAttempt } from "@/lib/utils";
import { generateCertificate } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import connectDB from "@/db";
import {
  AssessmentCycle,
  Attempt,
  Employee,
  Question,
  Certificate,
} from "@/db/models";

// ─── POST /api/attempts ───────────────────────────────────────────────────────
// Employee submits their completed assessment (FR-05, FR-06, FR-07, FR-08, FR-10)
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "employee") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const employeeId = payload.sub;

  // ── Validate body ─────────────────────────────────────────────────────────
  const body = await req.json();
  const parsed = submitAssessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid submission", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cycleId, answers } = parsed.data;

  await connectDB();

  // ── FR-10: One attempt per cycle check ────────────────────────────────────
  const existing = await Attempt.findOne({ employeeId, cycleId }).lean();
  if (existing) {
    return NextResponse.json(
      { success: false, error: "You have already submitted this assessment." },
      { status: 409 }
    );
  }

  // ── Verify active cycle ───────────────────────────────────────────────────
  const cycle = await AssessmentCycle.findOne({ _id: cycleId, status: "active" }).lean();
  if (!cycle) {
    return NextResponse.json({ success: false, error: "Cycle not found or not active" }, { status: 404 });
  }

  // ── Fetch the employee's selected questions (from the question IDs in answers) ──
  const questionIds = Object.keys(answers);
  const selectedQuestionsDB = await Question.find({ _id: { $in: questionIds } }).lean();
  
  // Format questions to match the utility function expectations
  const selectedQuestions = selectedQuestionsDB.map(q => ({
      ...q,
      id: q._id.toString()
  }));

  // ── FR-06: Score the attempt ──────────────────────────────────────────────
  const score = scoreAttempt(selectedQuestions as any, answers as any);

  // ── Store the attempt ─────────────────────────────────────────────────────
  const attempt = await Attempt.create({
    employeeId,
    cycleId,
    selectedQuestionIds: questionIds,
    answers,
    score,
  });

  // ── FR-07: Generate certificate PDF ──────────────────────────────────────
  const emp = await Employee.findById(employeeId).select("fullName email").lean();
  if (!emp) {
    return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
  }

  const certificateNumber = uuidv4();
  const completedAt       = new Date();
  const attemptNumber     = await Attempt.countDocuments({ employeeId });
  const pdfBuffer = await generateCertificate({
    employeeName:      emp.fullName,
    employeeEmail:     emp.email,
    cycleLabel:        cycle.label,
    score,
    attemptNumber,
    dateCompleted:     completedAt,
    certificateNumber,
  });

  // ── Store certificate record ──────────────────────────────────────────────
  // TODO: In production, upload pdfBuffer to S3-compatible storage and store the key
  const filePath = `certificates/${certificateNumber}.pdf`;

  const cert = await Certificate.create({
    attemptId:         attempt._id,
    certificateNumber,
    filePath,
  });

  // ── FR-08: Email certificate to employee (CC: HR) ─────────────────────────
  await sendCertificateEmail({
    toEmail:           emp.email,
    employeeName:      emp.fullName,
    cycleLabel:        cycle.label,
    score,
    certificatePdf:    pdfBuffer,
    certificateNumber,
  }).catch((err) => {
    // Log but don't fail the response if email fails
    console.error("Certificate email failed:", err);
  });

    const percentage = Math.round((score / selectedQuestions.length) * 100);
    const passingScore = cycle.passingScore ?? 8;
    const passed = score >= passingScore;

    // Build per-question review breakdown (correct answer revealed after submission)
    const perQuestion = questionIds.map((qId) => {
      const q = selectedQuestionsDB.find((q) => q._id.toString() === qId);
      const userKey = (answers as Record<string, string>)[qId] || null;
      const correctKey = q?.correctOption ?? null;
      return {
        questionId:   qId,
        questionText: q?.questionText ?? "",
        options: [
          { key: "a" as const, text: q?.optionA ?? "" },
          { key: "b" as const, text: q?.optionB ?? "" },
          { key: "c" as const, text: q?.optionC ?? "" },
          { key: "d" as const, text: q?.optionD ?? "" },
        ],
        userKey,
        correctKey,
        isCorrect: userKey !== null && userKey === correctKey,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        score,
        total:             selectedQuestions.length,
        percentage,
        passed,
        passingScore,
        employeeName:      emp.fullName,
        employeeEmail:     emp.email,
        cycleLabel:        `${cycle.label} Knowledge Assessment`,
        timeTakenFormatted: (body as any).timeTakenFormatted || "14m 32s",
        certificateId:     cert._id.toString(),
        certificateNumber,
        attemptId:         attempt._id.toString(),
        perQuestion,
      },
    });
  }
