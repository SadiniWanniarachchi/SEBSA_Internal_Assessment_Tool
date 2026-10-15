import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Attempt, Question, Invitation } from "@/db/models";
import { shuffle } from "@/lib/utils";

// Retry is only permitted when first attempt score is strictly below this threshold.
const RETRY_THRESHOLD = 6;

// ── GET /api/assessment ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const employeeId = requireRole(req, "employee");
  if (!employeeId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // ── Active cycle ─────────────────────────────────────────────────────────
  const activeCycle = await AssessmentCycle.findOne({ status: "active" }).lean();
  if (!activeCycle) {
    return NextResponse.json(
      { success: false, error: "No active assessment is available at this time. Please contact HR." },
      { status: 404 }
    );
  }

  // ── Invitation check (server-side expiry enforcement) ────────────────────
  const invitation = await Invitation.findOne({
    employeeId,
    cycleId:    activeCycle._id,
  }).lean();

  if (!invitation) {
    return NextResponse.json(
      {
        success: false,
        invitationError: true,
        error:
          "You have not been invited to this assessment cycle. Please contact HR.",
      },
      { status: 403 }
    );
  }

  const now = new Date();
  if (invitation.expiresAt < now && invitation.status !== "completed") {
    // Mark expired if not already
    await Invitation.updateOne(
      { _id: invitation._id },
      { $set: { status: "expired" } }
    );
    return NextResponse.json(
      {
        success: false,
        invitationExpired: true,
        error:
          "Your assessment invitation has expired. Please contact HR or your Admin to receive a new invitation.",
        expiredAt: invitation.expiresAt,
      },
      { status: 403 }
    );
  }

  const cycleShape = {
    id:           activeCycle._id.toString(),
    label:        `${activeCycle.label} Knowledge Assessment`,
    passingScore: activeCycle.passingScore ?? 8,
    timeLimitMinutes: 30,
  };

  // ── Existing attempts ────────────────────────────────────────────────────
  const existingAttempts = await Attempt.find({
    employeeId,
    cycleId:    activeCycle._id,
  })
    .sort({ attemptNumber: 1 })
    .lean();

  const attempt1 = existingAttempts.find((a) => a.attemptNumber === 1);
  const attempt2 = existingAttempts.find((a) => a.attemptNumber === 2);

  // ── Helper: build per-question review ────────────────────────────────────
  async function buildReview(attempt: typeof attempt1) {
    if (!attempt) return [];
    const questionIds   = attempt.selectedQuestionIds.map((id) => id.toString());
    const reviewQuestions = await Question.find({ _id: { $in: questionIds } }).lean();
    const storedAnswers   = attempt.answers instanceof Map
      ? Object.fromEntries((attempt.answers as any).entries())
      : (attempt.answers as Record<string, string>);

    return questionIds.map((qId) => {
      const q         = reviewQuestions.find((q) => q._id.toString() === qId);
      const userKey   = storedAnswers[qId] || null;
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
  }

  // ── State machine ─────────────────────────────────────────────────────────

  // Case A: Two attempts exist → assessment is finalized
  if (attempt2) {
    const perQuestion = await buildReview(attempt2);
    return NextResponse.json({
      success: true,
      alreadyCompleted: true,
      isFinal: true,
      cycle: cycleShape,
      attempt: {
        id:          attempt2._id.toString(),
        attemptNumber: 2,
        score:       attempt2.score,
        total:       10,
        submittedAt: attempt2.submittedAt,
        passed:      attempt2.passed,
        perQuestion,
      },
      attempt1Summary: attempt1
        ? { score: attempt1.score, passed: attempt1.passed }
        : null,
    });
  }

  // Case B: One attempt, score >= RETRY_THRESHOLD → finalized (no retry)
  if (attempt1 && attempt1.score >= RETRY_THRESHOLD) {
    const perQuestion = await buildReview(attempt1);
    return NextResponse.json({
      success: true,
      alreadyCompleted: true,
      isFinal: true,
      cycle: cycleShape,
      attempt: {
        id:            attempt1._id.toString(),
        attemptNumber: 1,
        score:         attempt1.score,
        total:         10,
        submittedAt:   attempt1.submittedAt,
        passed:        attempt1.passed,
        perQuestion,
      },
    });
  }

  // Case C: One attempt, score < RETRY_THRESHOLD → retry available
  if (attempt1 && attempt1.score < RETRY_THRESHOLD) {
    const questionIds = attempt1.selectedQuestionIds.map((id) => id.toString());
    const retryQuestions = await Question.find({ _id: { $in: questionIds } }).lean();
    const formattedQuestions = questionIds.map((qId) => {
      const q = retryQuestions.find((q) => q._id.toString() === qId);
      return {
        id:           qId,
        questionText: q?.questionText ?? "",
        category:     q?.category ?? "Supply Chain Systems Architecture",
        options: [
          { key: "a", text: q?.optionA ?? "" },
          { key: "b", text: q?.optionB ?? "" },
          { key: "c", text: q?.optionC ?? "" },
          { key: "d", text: q?.optionD ?? "" },
        ],
      };
    });

    return NextResponse.json({
      success: true,
      alreadyCompleted: false,
      canRetry: true,
      attemptNumber: 2,
      cycle: cycleShape,
      questions: formattedQuestions,
      attempt1: {
        score:  attempt1.score,
        total:  10,
        passed: attempt1.passed,
      },
    });
  }

  // Case D: No attempts yet → fresh start
  const allActiveQuestions = await Question.find({ status: "active" }).lean();
  if (allActiveQuestions.length === 0) {
    return NextResponse.json(
      { success: false, error: "No active questions in the question bank. Please contact HR." },
      { status: 503 }
    );
  }

  const selectedQuestions  = shuffle(allActiveQuestions).slice(0, 10);
  const formattedQuestions = selectedQuestions.map((q) => ({
    id:           q._id.toString(),
    questionText: q.questionText,
    category:     q.category ?? "Supply Chain Systems Architecture",
    options: [
      { key: "a", text: q.optionA },
      { key: "b", text: q.optionB },
      { key: "c", text: q.optionC },
      { key: "d", text: q.optionD },
    ],
  }));

  // Mark invitation as opened
  if (invitation.status === "pending") {
    await Invitation.updateOne(
      { _id: invitation._id },
      { $set: { status: "opened" } }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyCompleted: false,
    canRetry: false,
    attemptNumber: 1,
    cycle: cycleShape,
    questions: formattedQuestions,
  });
}
