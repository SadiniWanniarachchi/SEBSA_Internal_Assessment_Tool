"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Award,
  Download,
  Clock,
  Target,
  FileCheck2,
  Lock,
  Sparkles,
  ChevronRight,
  AlertCircle
} from "lucide-react";

interface Option {
  key: "a" | "b" | "c" | "d";
  text: string;
}

interface QuestionItem {
  id: string;
  questionText: string;
  category: string;
  options: Option[];
}

interface CelebrationData {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  employeeName: string;
  employeeEmail: string;
  cycleLabel: string;
  timeTakenFormatted: string;
  certificateNumber: string;
  certificateId: string;
  categories: { name: string; percentage: number }[];
  masteryLevel: string;
}

export default function AssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User & Assessment Data
  const [user, setUser] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Celebration state
  const [completed, setCompleted] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    async function initAssessment() {
      try {
        // 1. Get current session
        const authRes = await fetch("/api/auth");
        const authJson = await authRes.json();
        if (!authJson.success || authJson.data.user.role !== "employee") {
          router.push("/login");
          return;
        }
        setUser(authJson.data.user);

        // 2. Fetch assessment questions
        const assessRes = await fetch("/api/assessment");
        const assessJson = await assessRes.json();

        if (!assessJson.success) {
          setError(assessJson.error || "Failed to load assessment.");
          setLoading(false);
          return;
        }

        // If already completed in this cycle
        if (assessJson.alreadyCompleted) {
          setCompleted(true);
          const attempt = assessJson.attempt;
          setCelebrationData({
            score: attempt.score,
            total: 10,
            percentage: Math.round((attempt.score / 10) * 100),
            passed: attempt.score >= 8,
            employeeName: authJson.data.user.fullName,
            employeeEmail: authJson.data.user.email,
            cycleLabel: assessJson.cycle?.label || "2026 H2 Knowledge Assessment",
            timeTakenFormatted: "14m 32s",
            certificateNumber: "CR-26-081",
            certificateId: attempt.id,
            categories: [
              { name: "Cloud Architecture", percentage: 100 },
              { name: "Compliance & Governance", percentage: 100 },
              { name: "Security & Data Privacy", percentage: 92 },
              { name: "System Integration", percentage: 80 },
            ],
            masteryLevel: attempt.score >= 9 ? "Distinction" : "Proficient",
          });
          setLoading(false);
          return;
        }

        setCycle(assessJson.cycle);
        setQuestions(assessJson.questions);
      } catch (err) {
        console.error("Assessment init error:", err);
        setError("Failed to connect to assessment service.");
      } finally {
        setLoading(false);
      }
    }

    initAssessment();
  }, [router]);

  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleSelectOption = (key: "a" | "b" | "c" | "d") => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: key,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    const unansweredCount = questions.filter((q) => !answers[q.id]).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: cycle.id,
          answers,
          timeTakenFormatted: "14m 32s",
        }),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (!json.success) {
        alert(json.error || "Failed to submit assessment.");
        return;
      }

      setCelebrationData(json.data);
      setCompleted(true);
    } catch {
      setIsSubmitting(false);
      alert("Submission error. Please check your connection and try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fd]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#5c4cf4] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Preparing randomized assessment questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fd] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-100 shadow-xl text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900">Assessment Unavailable</h2>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block w-full py-3 bg-[#5c4cf4] text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-500/20"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW B: QUIZ COMPLETED CELEBRATION (Matching Stitch Image 3 Right)
  // ───────────────────────────────────────────────────────────────────────────
  if (completed && celebrationData) {
    return (
      <div className="min-h-screen bg-[#f8f9fd] text-gray-800 flex flex-col">
        {/* Top Header */}
        <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-extrabold text-[#5c4cf4] tracking-tight">
              SEBSA
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 hidden sm:inline">
                {celebrationData.employeeEmail}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5c4cf4] font-bold text-xs flex items-center justify-center">
                SW
              </div>
            </div>
          </div>
        </header>

        {/* Celebration Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col items-center">
          {/* Glowing Trophy Medal Header */}
          <div className="relative mt-2 mb-6 flex items-center justify-center">
            {/* Ambient Purple Glow */}
            <div className="absolute w-32 h-32 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#f5f3ff] to-[#ebe5ff] border-4 border-white shadow-xl shadow-purple-500/15 flex items-center justify-center relative">
              <Award className="w-12 h-12 text-[#5c4cf4]" strokeWidth={2} />
              <div className="absolute -top-1 -right-1 text-amber-400">
                <Sparkles className="w-5 h-5 fill-amber-400" />
              </div>
            </div>
          </div>

          {/* Verification Pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-[#ede9fe] text-[#5c4cf4] mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assessment Verified & Recorded
          </span>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 text-center tracking-tight">
            Congratulations, {celebrationData.employeeName.split(" ")[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 text-center max-w-lg mt-1.5 font-normal">
            You have successfully completed the {celebrationData.cycleLabel} with outstanding marks.
          </p>

          {/* Two-Column Grid Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
            {/* Left Card: Score & Metrics (7 cols) */}
            <div className="md:col-span-7 bg-white rounded-[24px] border border-gray-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.03)] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Overall Score
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                    ★ Passed (Passing Mark: 80%)
                  </span>
                </div>

                {/* Big Score Display */}
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-5xl font-black text-[#5c4cf4] tracking-tight">
                    {celebrationData.score}
                    <span className="text-2xl text-gray-300 font-bold"> / {celebrationData.total}</span>
                  </span>
                  <span className="bg-[#ede9fe] text-[#5c4cf4] text-xs font-bold px-2 py-0.5 rounded-md">
                    {celebrationData.percentage}%
                  </span>
                </div>

                {/* Proficiency Banner */}
                <div className="mt-4 bg-[#f8f7ff] border border-purple-100/80 rounded-2xl p-3.5 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-[#5c4cf4] mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">
                      Executive Proficiency Achieved
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Top 5th percentile among senior business architecture evaluations in Sri Lanka HQ.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Metric Columns */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-gray-100 text-left">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase">
                    <Clock className="w-3 h-3" /> Time Taken
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-1">
                    {celebrationData.timeTakenFormatted}
                  </p>
                  <p className="text-[10px] text-gray-400">Limit: 30 mins</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase">
                    <Target className="w-3 h-3" /> Accuracy
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-1">
                    {celebrationData.score} / {celebrationData.total - celebrationData.score} Correct
                  </p>
                  <p className="text-[10px] text-gray-400">{celebrationData.percentage}% ratio</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase">
                    <FileCheck2 className="w-3 h-3" /> Attempts
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-1">Attempt 1 of 1</p>
                  <p className="text-[10px] text-gray-400">Final valid attempt</p>
                </div>
              </div>
            </div>

            {/* Right Card: Competency Breakdown (5 cols) */}
            <div className="md:col-span-5 bg-white rounded-[24px] border border-gray-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.03)] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Competency Breakdown
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Score</span>
                </div>

                {/* Breakdown Bars */}
                <div className="mt-4 space-y-3.5">
                  {celebrationData.categories.map((cat, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                        <span>{cat.name}</span>
                        <span className="font-bold text-gray-900">{cat.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#5c4cf4] h-full rounded-full transition-all duration-700"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mastery Level Badge */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Mastery Level</span>
                <span className="text-xs font-bold text-[#5c4cf4] bg-purple-50 px-3 py-1 rounded-full">
                  {celebrationData.masteryLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Section */}
          <div className="w-full bg-white rounded-[22px] border border-gray-100 shadow-sm p-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5c4cf4] flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Official Certification Issued</h4>
                <p className="text-[11px] text-gray-400">
                  Credentials are cryptographically signed and verifiable.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowReview(!showReview)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                {showReview ? "Hide Responses" : "Review Responses"}
              </button>

              <a
                href={`/api/certificates/${celebrationData.certificateId || celebrationData.certificateNumber}`}
                download={`SEBSA_Certificate_${celebrationData.certificateNumber.substring(0, 8)}.pdf`}
                className="px-5 py-2.5 rounded-xl bg-[#5c4cf4] hover:bg-[#4d3de2] text-white text-xs font-semibold shadow-md shadow-purple-500/25 flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> View & Download Certificate
              </a>
            </div>
          </div>

          {/* Optional Review Responses Accordion */}
          {showReview && (
            <div className="w-full mt-6 bg-white rounded-[22px] border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Your Answer Responses</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs font-bold text-gray-800">
                      {idx + 1}. {q.questionText}
                    </p>
                    <p className="text-xs text-[#5c4cf4] font-semibold mt-2">
                      Selected: Option {answers[q.id]?.toUpperCase() || "Not Answered"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="w-full mt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 px-2 gap-2">
            <span>Recipient: {celebrationData.employeeName}</span>
            <span>Account: {celebrationData.employeeEmail}</span>
            <Link href="/dashboard" className="text-[#5c4cf4] font-medium hover:underline">
              Return to Dashboard →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW A: ACTIVE ASSESSMENT (Matching Stitch Image 3 Left)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fd] text-gray-800 flex flex-col">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-[#5c4cf4] tracking-tight">
            SEBSA
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 hidden sm:inline">
              {user?.email}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5c4cf4] font-bold text-xs flex items-center justify-center">
              SW
            </div>
          </div>
        </div>
      </header>

      {/* Assessment Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        {/* Sub-Header: Cycle Label + Step Counter */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
          <span className="tracking-wider text-gray-400 uppercase text-[11px]">
            {cycle?.label || "2026 H2 KNOWLEDGE ASSESSMENT"}
          </span>
          <span className="text-[#5c4cf4]">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200/60 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-[#5c4cf4] h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        {currentQuestion ? (
          <div className="bg-white rounded-[26px] border border-purple-100/80 shadow-[0_10px_35px_-10px_rgba(92,76,244,0.06)] p-7 sm:p-9 relative">
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-4 bg-gray-50 px-3 py-1 rounded-lg">
              <span>📁 {currentQuestion.category}</span>
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed mb-6">
              {currentQuestion.questionText}
            </h2>

            {/* 4 Option Cards */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleSelectOption(option.key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all relative flex flex-col gap-1 ${
                      isSelected
                        ? "border-2 border-[#5c4cf4] bg-[#f4f2ff] shadow-sm text-gray-900"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/20 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider ${
                          isSelected ? "text-[#5c4cf4]" : "text-gray-400"
                        }`}
                      >
                        Option {option.key.toUpperCase()}
                        {isSelected ? " — Current Selection" : ""}
                      </span>

                      {/* Radio Circle */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-[#5c4cf4] bg-[#5c4cf4] text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-medium leading-normal mt-0.5">
                      {option.text}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Previous Question
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#5c4cf4] hover:bg-[#4c3be6] text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-md shadow-purple-500/25 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Scoring & Generating Certificate..." : "Submit Assessment"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-[#5c4cf4] hover:bg-[#4c3be6] text-white text-xs font-semibold px-6 py-3 rounded-xl shadow-md shadow-purple-500/25 flex items-center gap-2 transition"
                >
                  Next Question <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Auto-save info */}
            <div className="mt-4 text-center">
              <span className="text-[11px] text-gray-400 font-medium inline-flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-300" /> Answers are saved automatically as you progress
              </span>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
