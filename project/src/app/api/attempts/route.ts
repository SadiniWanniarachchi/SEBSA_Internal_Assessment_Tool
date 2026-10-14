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
  Invitation,
} from "@/db/models";

// Score threshold: below this value a retry is permitted (first attempt only).
const RETRY_THRESHOLD = 6;

// ─── POST /api/attempts ───────────────────────────────────────────────────────
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
  const questionIds = Object.keys(answers);

  await connectDB();

  // ── Server-side invitation expiry check ───────────────────────────────────
  const invitation = await Invitation.findOne({ employeeId, cycleId }).lean();
  if (!invitation) {
    return NextResponse.json(
      { success: false, error: "No valid invitation found for this assessment cycle." },
      { status: 403 }
    );
  }
  const now = new Date();
  if (invitation.expiresAt < now && invitation.status !== "completed") {
    return NextResponse.json(
      {
        success: false,
        invitationExpired: true,
        error: "Your assessment invitation has expired. Please contact HR for a new invitation.",
      },
      { status: 403 }
    );
  }

  // ── Run pre-checks in parallel ────────────────────────────────────────────
  const [existingAttempts, cycle] = await Promise.all([
    Attempt.find({ employeeId, cycleId }).sort({ attemptNumber: 1 }).lean(),
    AssessmentCycle.findOne({ _id: cycleId, status: "active" }).lean(),
  ]);

  if (!cycle) {
    return NextResponse.json(
      { success: false, error: "Assessment cycle not found or not active." },
      { status: 404 }
    );
  }

  const attempt1 = existingAttempts.find((a) => a.attemptNumber === 1);
  const attempt2 = existingAttempts.find((a) => a.attemptNumber === 2);

  // ── Enforce attempt policy ────────────────────────────────────────────────
  if (attempt2) {
    return NextResponse.json(
      { success: false, error: "You have already used both permitted attempts for this cycle." },
      { status: 409 }
    );
  }

  if (attempt1 && attempt1.score >= RETRY_THRESHOLD) {
    return NextResponse.json(
      { success: false, error: "Your assessment is already finalized. No further attempts are permitted." },
      { status: 409 }
    );
  }

  // ── Determine attempt number and question set ─────────────────────────────
  type LeanQuestion = {
    _id: any;
    questionText: string;
    optionA: string; optionB: string; optionC: string; optionD: string;
    correctOption: string;
    category?: string;
  };
  let thisAttemptNumber: 1 | 2;
  let selectedQuestionsDB: LeanQuestion[];

  if (!attempt1) {
    // First attempt: fetch the requested questions
    thisAttemptNumber = 1;
    selectedQuestionsDB = await Question.find({ _id: { $in: questionIds } }).lean() as LeanQuestion[];
  } else {
    // Second attempt: MUST reuse the exact same questions as attempt 1
    thisAttemptNumber = 2;
    const originalIds = attempt1.selectedQuestionIds.map((id) => id.toString());
    selectedQuestionsDB = await Question.find({ _id: { $in: originalIds } }).lean() as LeanQuestion[];
    // Rewrite questionIds to match original order
    questionIds.length = 0;
    originalIds.forEach((id) => questionIds.push(id));
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const selectedQuestions = selectedQuestionsDB.map((q) => ({ ...q, id: q._id.toString() }));
  const score             = scoreAttempt(selectedQuestions as any, answers as any);
  const passingScore      = cycle.passingScore ?? 8;
  const passed            = score >= passingScore;
  // After attempt 2, or after attempt 1 with score >= RETRY_THRESHOLD → finalized
  const isFinal           = thisAttemptNumber === 2 || score >= RETRY_THRESHOLD;

  // ── Save attempt ──────────────────────────────────────────────────────────
  const attempt = await Attempt.create({
    employeeId,
    cycleId,
    attemptNumber:       thisAttemptNumber,
    selectedQuestionIds: questionIds,
    answers,
    score,
    passed,
    isFinal,
  });

  // ── Build per-question breakdown ─────────────────────────────────────────
  const perQuestion = questionIds.map((qId) => {
    const q         = selectedQuestionsDB.find((q) => q._id.toString() === qId);
    const userKey   = (answers as Record<string, string>)[qId] || null;
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

  const responseBase = {
    score,
    total:          selectedQuestions.length,
    percentage:     Math.round((score / selectedQuestions.length) * 100),
    passed,
    passingScore,
    isFinal,
    attemptNumber:  thisAttemptNumber,
    canRetry:       !isFinal && !passed,
    employeeName:   "",
    employeeEmail:  "",
    cycleLabel:     `${cycle.label} Knowledge Assessment`,
    timeTakenFormatted: (body as any).timeTakenFormatted || "—",
    certificateId:       "",
    certificateNumber:   "",
    attemptId:           attempt._id.toString(),
    perQuestion,
    attempt1Score:       thisAttemptNumber === 2 ? attempt1?.score ?? null : null,
  };

  // ── Certificate: only on a final passing attempt ──────────────────────────
  if (isFinal && passed) {
    const [emp, attemptCount] = await Promise.all([
      Employee.findById(employeeId).select("fullName email").lean(),
      Attempt.countDocuments({ employeeId }),
    ]);

    if (!emp) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    responseBase.employeeName  = emp.fullName;
    responseBase.employeeEmail = emp.email;

    const certificateNumber = uuidv4();
    const completedAt       = new Date();

    const pdfBuffer = await generateCertificate({
      employeeName:      emp.fullName,
      employeeEmail:     emp.email,
      cycleLabel:        cycle.label,
      score,
      attemptNumber:     attemptCount,
      dateCompleted:     completedAt,
      certificateNumber,
    });

    const filePath = `certificates/${certificateNumber}.pdf`;
    const cert     = await Certificate.create({
      attemptId:         attempt._id,
      certificateNumber,
      filePath,
      emailStatus:       "pending",
    });

    responseBase.certificateId     = cert._id.toString();
    responseBase.certificateNumber = certificateNumber;

    // Send certificate email; update emailStatus regardless of outcome
    try {
      await sendCertificateEmail({
        toEmail:           emp.email,
        employeeName:      emp.fullName,
        cycleLabel:        cycle.label,
        score,
        total:             selectedQuestions.length,
        passed,
        certificatePdf:    pdfBuffer,
        certificateNumber,
      });
      await Certificate.updateOne(
        { _id: cert._id },
        { $set: { emailStatus: "sent", emailSentAt: new Date() } }
      );
    } catch (emailErr) {
      const errMsg = (emailErr as Error).message ?? "Unknown error";
      console.error("[Attempts] Certificate email failed:", errMsg);
      await Certificate.updateOne(
        { _id: cert._id },
        { $set: { emailStatus: "failed", emailError: errMsg } }
      );
    }
  } else if (!isFinal) {
    // Attempt 1 with score < RETRY_THRESHOLD — no certificate yet
    const emp = await Employee.findById(employeeId).select("fullName email").lean();
    responseBase.employeeName  = emp?.fullName ?? "";
    responseBase.employeeEmail = emp?.email ?? "";
  } else {
    // Final attempt but failed — no certificate
    const emp = await Employee.findById(employeeId).select("fullName email").lean();
    responseBase.employeeName  = emp?.fullName ?? "";
    responseBase.employeeEmail = emp?.email ?? "";
  }

  // Mark invitation as completed when assessment is finalized
  if (isFinal) {
    await Invitation.updateOne(
      { employeeId, cycleId },
      { $set: { status: "completed" } }
    );
  }

  return NextResponse.json({ success: true, data: responseBase });
}
