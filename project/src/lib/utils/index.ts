import type { Question, QuestionForEmployee, AnswerOption } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Assessment utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle — returns a new array in random order.
 * Used for shuffling questions and answer options (FR-04).
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Randomly select `count` questions from the active bank.
 * Implements FR-03: 10 questions from up to 60 in the active bank.
 */
export function selectRandomQuestions(
  questions: Question[],
  count: number = 10
): Question[] {
  const active = questions.filter((q) => q.status === "active");
  return shuffle(active).slice(0, count);
}

/**
 * Convert a full Question into a QuestionForEmployee.
 * Strips the correctOption and shuffles the answer options (FR-04).
 */
export function prepareQuestionForEmployee(
  question: Question
): QuestionForEmployee {
  const options: { key: AnswerOption; text: string }[] = [
    { key: "a", text: question.optionA },
    { key: "b", text: question.optionB },
    { key: "c", text: question.optionC },
    { key: "d", text: question.optionD },
  ];

  return {
    id:           question.id,
    questionText: question.questionText,
    options:      shuffle(options),
  };
}

/**
 * Score an attempt against the correct answers.
 * Implements FR-06: auto-scoring on submission.
 */
export function scoreAttempt(
  questions:  Question[],
  answers:    Record<string, AnswerOption>
): number {
  return questions.reduce((score, question) => {
    const given = answers[question.id];
    return given === question.correctOption ? score + 1 : score;
  }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// General utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Pause execution for `ms` milliseconds (useful for rate-limiting). */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Generate a cryptographically-safe random integer in [min, max). */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}
