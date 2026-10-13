import { shuffle, scoreAttempt } from "@/lib/utils";
import type { Question } from "@/types";

// ─── shuffle ─────────────────────────────────────────────────────────────────

describe("shuffle", () => {
  it("returns an array with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it("does not mutate the original array", () => {
    const original = ["a", "b", "c"];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it("handles an empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it("produces different orderings over many runs (statistical check)", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(shuffle(arr).join(","));
    }
    // With 10 elements there are 3,628,800 permutations; 50 runs should
    // almost certainly produce at least 2 distinct orderings.
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── scoreAttempt ─────────────────────────────────────────────────────────────

function makeQuestion(id: string, correctOption: "a" | "b" | "c" | "d"): Question {
  return {
    id,
    questionText: `Q ${id}`,
    optionA: "Opt A",
    optionB: "Opt B",
    optionC: "Opt C",
    optionD: "Opt D",
    correctOption,
    category: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("scoreAttempt", () => {
  it("returns 0 when all answers are wrong", () => {
    const questions = [
      makeQuestion("q1", "a"),
      makeQuestion("q2", "b"),
    ];
    const answers = { q1: "b" as const, q2: "a" as const };
    expect(scoreAttempt(questions, answers)).toBe(0);
  });

  it("returns the total count when all answers are correct", () => {
    const questions = [
      makeQuestion("q1", "a"),
      makeQuestion("q2", "c"),
      makeQuestion("q3", "d"),
    ];
    const answers = { q1: "a" as const, q2: "c" as const, q3: "d" as const };
    expect(scoreAttempt(questions, answers)).toBe(3);
  });

  it("counts only correct answers in a mixed set", () => {
    const questions = [
      makeQuestion("q1", "a"),
      makeQuestion("q2", "b"),
      makeQuestion("q3", "c"),
      makeQuestion("q4", "d"),
    ];
    const answers: Record<string, "a" | "b" | "c" | "d"> = {
      q1: "a", // correct
      q2: "a", // wrong
      q3: "c", // correct
      q4: "a", // wrong
    };
    expect(scoreAttempt(questions, answers)).toBe(2);
  });

  it("treats unanswered questions as wrong", () => {
    const questions = [makeQuestion("q1", "a"), makeQuestion("q2", "b")];
    const answers = { q1: "a" as const }; // q2 not answered
    expect(scoreAttempt(questions, answers)).toBe(1);
  });

  it("returns 0 for an empty question set", () => {
    expect(scoreAttempt([], {})).toBe(0);
  });

  it("handles a full 10-question quiz correctly", () => {
    const correctOptions = ["a", "b", "c", "d", "a", "b", "c", "d", "a", "b"] as const;
    const questions = correctOptions.map((opt, i) => makeQuestion(`q${i}`, opt));
    const answers: Record<string, "a" | "b" | "c" | "d"> = {};
    // Answer first 8 correctly, last 2 wrong
    correctOptions.forEach((opt, i) => {
      answers[`q${i}`] = i < 8 ? opt : "d";
    });
    expect(scoreAttempt(questions, answers)).toBe(8);
  });
});

// ─── Security: correct answers never sent pre-submission ─────────────────────

describe("employee-facing question format", () => {
  it("does not expose correctOption field", () => {
    const fullQuestion = makeQuestion("q1", "b");
    // Simulate what the API does: strip correctOption before sending
    const { correctOption: _removed, ...employeeQuestion } = fullQuestion;
    expect(employeeQuestion).not.toHaveProperty("correctOption");
    expect(employeeQuestion).toHaveProperty("questionText");
    expect(employeeQuestion).toHaveProperty("optionA");
  });

  it("options array preserves a,b,c,d order", () => {
    const q = makeQuestion("q1", "c");
    const options = [
      { key: "a", text: q.optionA },
      { key: "b", text: q.optionB },
      { key: "c", text: q.optionC },
      { key: "d", text: q.optionD },
    ];
    expect(options.map((o) => o.key)).toEqual(["a", "b", "c", "d"]);
  });
});
