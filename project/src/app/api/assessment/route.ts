import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Attempt, Question } from "@/db/models";
import { shuffle } from "@/lib/utils";

// ── GET /api/assessment ──────────────────────────────────────────────────────
// Returns 10 randomized questions from the active question bank for the active cycle
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "employee") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // Find active cycle (or fallback/create 2026 H2)
  let activeCycle: any = await AssessmentCycle.findOne({ status: "active" }).lean();
  if (!activeCycle) {
    const created = await AssessmentCycle.create({
      label: "2026 H2",
      status: "active",
      openedAt: new Date(),
      openedBy: payload.sub,
    });
    activeCycle = created.toObject();
  }

  // Check if employee has already submitted this cycle (FR-10)
  const existingAttempt = await Attempt.findOne({
    employeeId: payload.sub,
    cycleId: activeCycle._id,
  }).lean();

  if (existingAttempt) {
    const questionIds = existingAttempt.selectedQuestionIds.map((id) => id.toString());
    const reviewQuestions = await Question.find({ _id: { $in: questionIds } }).lean();
    const storedAnswers = existingAttempt.answers instanceof Map
      ? Object.fromEntries(existingAttempt.answers.entries())
      : (existingAttempt.answers as Record<string, string>);
    const perQuestion = questionIds.map((questionId) => {
      const question = reviewQuestions.find((q) => q._id.toString() === questionId);
      const userKey = storedAnswers[questionId] || null;
      const correctKey = question?.correctOption ?? null;

      return {
        questionId,
        questionText: question?.questionText ?? "",
        options: [
          { key: "a" as const, text: question?.optionA ?? "" },
          { key: "b" as const, text: question?.optionB ?? "" },
          { key: "c" as const, text: question?.optionC ?? "" },
          { key: "d" as const, text: question?.optionD ?? "" },
        ],
        userKey,
        correctKey,
        isCorrect: userKey !== null && userKey === correctKey,
      };
    });

    return NextResponse.json({
      success: true,
      alreadyCompleted: true,
      cycle: {
        id: activeCycle._id.toString(),
        label: `${activeCycle.label} Knowledge Assessment`,
        passingScore: activeCycle.passingScore ?? 8,
      },
      attempt: {
        id: existingAttempt._id.toString(),
        score: existingAttempt.score,
        total: 10,
        submittedAt: existingAttempt.submittedAt,
        passed: existingAttempt.score >= (activeCycle.passingScore ?? 8),
        perQuestion,
      }
    });
  }

  // Fetch active questions from MongoDB
  const allActiveQuestions = await Question.find({ status: "active" }).lean();
  if (allActiveQuestions.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No active questions available in the question bank. Please contact HR.",
    }, { status: 503 });
  }

  // Randomly select 10 questions using Fisher-Yates shuffle
  const selectedQuestions = shuffle(allActiveQuestions).slice(0, 10);

  // Prepare each question for the employee by stripping correctOption and shuffling options
  const formattedQuestions = selectedQuestions.map((q) => {
    const rawOptions = [
      { key: "a", text: q.optionA },
      { key: "b", text: q.optionB },
      { key: "c", text: q.optionC },
      { key: "d", text: q.optionD },
    ];

    return {
      id: q._id.toString(),
      questionText: q.questionText,
      category: q.category || "Supply Chain Systems Architecture",
      options: rawOptions,
    };
  });

  return NextResponse.json({
    success: true,
    alreadyCompleted: false,
    cycle: {
      id: activeCycle._id.toString(),
      label: `${activeCycle.label} Knowledge Assessment`,
      timeLimitMinutes: 30,
      passingScore: activeCycle.passingScore ?? 8,
    },
    questions: formattedQuestions,
  });
}
