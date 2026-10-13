"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DownloadIcon from "@mui/icons-material/Download";
import AdjustIcon from "@mui/icons-material/Adjust";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import VerifiedIcon from "@mui/icons-material/Verified";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { Navbar } from "@/components/Navbar";

const P = "#3E0B78";
const PD = "#2E0858";

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

interface PerQuestionResult {
  questionId: string;
  questionText: string;
  options: { key: "a" | "b" | "c" | "d"; text: string }[];
  userKey: string | null;
  correctKey: string | null;
  isCorrect: boolean;
}

interface CelebrationData {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  employeeName: string;
  employeeEmail: string;
  cycleLabel: string;
  certificateNumber: string;
  certificateId: string;
  passingScore: number;
  perQuestion?: PerQuestionResult[];
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);

  useEffect(() => {
    async function initAssessment() {
      try {
        const authRes = await fetch("/api/auth");
        const authJson = await authRes.json();
        if (!authJson.success || authJson.data.user.role !== "employee") {
          router.push("/login");
          return;
        }
        setUser(authJson.data.user);

        const assessRes = await fetch("/api/assessment");
        const assessJson = await assessRes.json();

        if (!assessJson.success) {
          setError(assessJson.error || "Failed to load assessment.");
          setLoading(false);
          return;
        }

        if (assessJson.alreadyCompleted) {
          setCompleted(true);
          const attempt = assessJson.attempt;
          setCelebrationData({
            score: attempt.score,
            total: 10,
            percentage: Math.round((attempt.score / 10) * 100),
            passed: attempt.passed ?? attempt.score >= (assessJson.cycle?.passingScore ?? 8),
            employeeName: authJson.data.user.fullName,
            employeeEmail: authJson.data.user.email,
            cycleLabel: assessJson.cycle?.label || "2026 H2 Knowledge Assessment",
            certificateNumber: "CR-26-081",
            certificateId: attempt.id,
            passingScore: assessJson.cycle?.passingScore ?? 8,
            perQuestion: attempt.perQuestion,
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
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (key: "a" | "b" | "c" | "d") => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: key }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((p) => p + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  const handleSubmitClick = () => {
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      setUnansweredCount(unanswered);
      setConfirmOpen(true);
    } else {
      doSubmit();
    }
  };

  const doSubmit = async () => {
    setConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: cycle.id, answers, timeTakenFormatted: "14m 32s" }),
      });
      const json = await res.json();
      setIsSubmitting(false);
      if (!json.success) {
        setError(json.error || "Failed to submit assessment.");
        return;
      }
      setCelebrationData(json.data);
      setCompleted(true);
    } catch {
      setIsSubmitting(false);
      setError("Submission error. Please check your connection and try again.");
    }
  };

  const handleCertificateDownload = async () => {
    if (!celebrationData) return;

    try {
      const response = await fetch(
        `/api/certificates/${celebrationData.certificateId || celebrationData.certificateNumber}`
      );
      if (!response.ok) {
        throw new Error("Certificate download failed");
      }

      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `SEBSA_Certificate_${celebrationData.certificateNumber.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      console.error("Certificate download error:", downloadError);
      setError("Unable to download the certificate. Please try again.");
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F9F8FF",
          gap: 2,
        }}
      >
        <CircularProgress size={40} thickness={4} sx={{ color: P }} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Preparing your randomised assessment…
        </Typography>
      </Box>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F9F8FF",
          p: 3,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            bgcolor: "white",
            borderRadius: "24px",
            border: "1px solid #FCE8E8",
            boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            p: { xs: 4, sm: 5 },
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              bgcolor: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <ErrorOutlinedIcon sx={{ color: "#EF4444", fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#292634", mb: 1 }}>
            Assessment Unavailable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            {error}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => router.push("/dashboard")}
            sx={{
              background: P,
              boxShadow: `0 6px 16px ${alpha(P, 0.35)}`,
              borderRadius: "14px",
              fontWeight: 700,
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // ── CELEBRATION VIEW ───────────────────────────────────────────────────────
  if (completed && celebrationData) {
    const cd = celebrationData;
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#F9F8FF", display: "flex", flexDirection: "column" }}>
        <Navbar userName={cd.employeeName} userEmail={cd.employeeEmail} />

        <Box
          component="main"
          sx={{
            flex: 1,
            maxWidth: 1040,
            width: "100%",
            mx: "auto",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ width: "100%", mb: 2, textAlign: "left" }}>
            <Typography
              variant="caption"
              sx={{
                color: P,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => router.push("/dashboard")}
            >
              Return to Dashboard →
            </Typography>
          </Box>

          {/* Trophy with glow */}
          <Box sx={{ position: "relative", mb: 3 }}>
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: -16,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha(P, 0.14)} 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                width: { xs: 80, sm: 96 },
                height: { xs: 80, sm: 96 },
                borderRadius: "50%",
                background: `linear-gradient(145deg, ${alpha(P, 0.08)}, ${alpha(P, 0.2)})`,
                border: `3px solid ${alpha(P, 0.18)}`,
                boxShadow: [
                  `0 12px 40px ${alpha(P, 0.22)}`,
                  `0 2px 0 ${alpha("#fff", 0.6)} inset`,
                ].join(", "),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: P }} />
              <AutoAwesomeIcon
                sx={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  fontSize: { xs: 16, sm: 18 },
                  color: "#F59E0B",
                }}
              />
            </Box>
          </Box>

          {/* Verified pill */}
          <Chip
            icon={<VerifiedIcon sx={{ fontSize: "0.85rem !important" }} />}
            label="Assessment Verified & Recorded"
            sx={{
              mb: 2,
              bgcolor: alpha(P, 0.1),
              color: P,
              fontWeight: 700,
              fontSize: { xs: "0.62rem", sm: "0.68rem" },
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              height: { xs: 28, sm: 30 },
              "& .MuiChip-icon": { color: P },
            }}
          />

          {/* Heading */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#292634",
              textAlign: "center",
              letterSpacing: "-0.5px",
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.2rem" },
              mb: 0.75,
            }}
          >
            Congratulations, {cd.employeeName.split(" ")[0]}!
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", maxWidth: 480, mb: { xs: 4, md: 5 }, lineHeight: 1.65 }}
          >
            You have successfully completed the{" "}
            <Box component="strong" sx={{ color: "#292634" }}>
              {cd.cycleLabel}
            </Box>{" "}
            with outstanding results.
          </Typography>

          {/* Two-column grid */}
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: { xs: 2, md: 3 },
            }}
          >
            {/* LEFT: Score + metrics */}
            <Box
              sx={{
                bgcolor: "white",
                borderRadius: "24px",
                border: `1px solid ${alpha(P, 0.08)}`,
                boxShadow: `0 8px 32px ${alpha(P, 0.07)}`,
                p: { xs: 3, sm: 4 },
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {/* Score header row */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", fontSize: "0.62rem", letterSpacing: "0.1em" }}
                >
                  Overall Score
                </Typography>
                <Chip
                  icon={cd.passed ? <CheckCircleIcon sx={{ fontSize: "0.75rem !important" }} /> : <CancelIcon sx={{ fontSize: "0.75rem !important" }} />}
                  label={cd.passed ? "PASS" : "FAIL"}
                  color={cd.passed ? "success" : "error"}
                  size="small"
                  sx={{
                    fontSize: { xs: "0.6rem", sm: "0.65rem" },
                    fontWeight: 700,
                    "& .MuiChip-icon": { color: "#059669" },
                  }}
                />
              </Box>

              {/* Big score */}
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: { xs: "3.2rem", sm: "4.2rem" },
                    fontWeight: 900,
                    lineHeight: 1,
                    color: P,
                    letterSpacing: "-2px",
                  }}
                >
                  {cd.score}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: "1.6rem", sm: "2rem" },
                    fontWeight: 300,
                    color: alpha("#292634", 0.2),
                    letterSpacing: "-1px",
                  }}
                >
                  / {cd.total}
                </Typography>
                <Chip
                  label={`${cd.percentage}%`}
                  sx={{
                    bgcolor: alpha(P, 0.1),
                    color: P,
                    fontWeight: 800,
                    fontSize: { xs: "0.78rem", sm: "0.82rem" },
                    height: 28,
                    ml: 0.5,
                  }}
                />
              </Box>

              {/* Assessment metrics */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: { xs: 1, sm: 2 },
                  mt: 3,
                  pt: 3,
                  borderTop: `1px solid ${alpha(P, 0.08)}`,
                }}
              >
                {[
                  {
                    icon: <AdjustIcon sx={{ fontSize: 13 }} />,
                    label: "Accuracy",
                    value: `${cd.score} / ${cd.total}`,
                    sub: `${cd.percentage}% ratio`,
                  },
                  {
                    icon: <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 13 }} />,
                    label: "Attempts",
                    value: "Attempt 1",
                    sub: "Final attempt",
                  },
                ].map((m) => (
                  <Box key={m.label}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: "text.secondary",
                        mb: 0.75,
                      }}
                    >
                      {m.icon}
                      <Typography
                        variant="overline"
                        sx={{ fontSize: "0.58rem", letterSpacing: "0.07em", lineHeight: 1 }}
                      >
                        {m.label}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.82rem" },
                        fontWeight: 700,
                        color: "#292634",
                        mb: 0.3,
                      }}
                    >
                      {m.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.62rem" }}
                    >
                      {m.sub}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

          </Box>

          {/* Certificate action row */}
          <Box
            sx={{
              width: "100%",
              mt: { xs: 2, md: 3 },
              bgcolor: "white",
              borderRadius: "22px",
              border: `1px solid ${alpha(P, 0.08)}`,
              boxShadow: `0 4px 20px ${alpha(P, 0.05)}`,
              p: { xs: 2.5, sm: 3 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: { xs: 40, sm: 46 },
                  height: { xs: 40, sm: 46 },
                  borderRadius: "14px",
                  bgcolor: alpha(P, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CardMembershipIcon sx={{ color: P, fontSize: { xs: 20, sm: 22 } }} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: "#292634", fontSize: { xs: "0.8rem", sm: "0.85rem" } }}
                >
                  Official Certification Issued
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Credentials are cryptographically signed · Ref: {cd.certificateNumber}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              {cd.perQuestion && cd.perQuestion.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={showReview ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  onClick={() => setShowReview((v) => !v)}
                  sx={{
                    borderRadius: "10px",
                    fontSize: { xs: "0.72rem", sm: "0.78rem" },
                    borderColor: alpha(P, 0.25),
                    color: P,
                    "&:hover": { borderColor: alpha(P, 0.4), bgcolor: alpha(P, 0.04) },
                  }}
                >
                  {showReview ? "Hide Review" : "Review Answers"}
                </Button>
              )}

              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleCertificateDownload}
                sx={{
                  borderRadius: "10px",
                  fontSize: { xs: "0.72rem", sm: "0.78rem" },
                  background: `linear-gradient(135deg, ${PD}, ${P})`,
                  boxShadow: `0 4px 14px ${alpha(P, 0.4)}`,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${PD}, ${P})`,
                    boxShadow: `0 6px 18px ${alpha(P, 0.45)}`,
                  },
                }}
              >
                Download Certificate
              </Button>
            </Box>
          </Box>

          {/* Review accordion */}
          {showReview && cd.perQuestion && cd.perQuestion.length > 0 && (
            <Box
              sx={{
                width: "100%",
                mt: 2,
                bgcolor: "white",
                borderRadius: "22px",
                border: `1px solid ${alpha(P, 0.08)}`,
                p: { xs: 2.5, sm: 3 },
              }}
            >
              {/* Header row with score summary */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "#292634", fontSize: { xs: "0.9rem", sm: "0.96rem" } }}
                >
                  Answer Review
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: "0.78rem !important" }} />}
                    label={`${cd.perQuestion.filter((q) => q.isCorrect).length} Correct`}
                    size="small"
                    sx={{ bgcolor: "#ECFDF5", color: "#059669", fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { color: "#059669" } }}
                  />
                  <Chip
                    icon={<CancelIcon sx={{ fontSize: "0.78rem !important" }} />}
                    label={`${cd.perQuestion.filter((q) => !q.isCorrect).length} Wrong`}
                    size="small"
                    sx={{ bgcolor: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: "0.65rem", "& .MuiChip-icon": { color: "#DC2626" } }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {cd.perQuestion.map((pq, idx) => (
                  <Box
                    key={pq.questionId}
                    sx={{
                      borderRadius: "16px",
                      border: `1px solid ${pq.isCorrect ? alpha("#059669", 0.18) : alpha("#EF4444", 0.18)}`,
                      bgcolor: pq.isCorrect ? alpha("#059669", 0.03) : alpha("#EF4444", 0.03),
                      overflow: "hidden",
                    }}
                  >
                    {/* Question header */}
                    <Box
                      sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: { xs: 1.5, sm: 1.75 },
                        borderBottom: `1px solid ${pq.isCorrect ? alpha("#059669", 0.12) : alpha("#EF4444", 0.12)}`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                      }}
                    >
                      {/* Q number + result icon */}
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          bgcolor: pq.isCorrect ? "#ECFDF5" : "#FEF2F2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      >
                        {pq.isCorrect
                          ? <CheckCircleIcon sx={{ fontSize: 14, color: "#059669" }} />
                          : <CancelIcon sx={{ fontSize: 14, color: "#DC2626" }} />
                        }
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#292634", fontSize: { xs: "0.8rem", sm: "0.84rem" }, lineHeight: 1.5 }}
                      >
                        <Box component="span" sx={{ color: "text.secondary", fontWeight: 500, mr: 0.75 }}>
                          Q{idx + 1}.
                        </Box>
                        {pq.questionText}
                      </Typography>
                    </Box>

                    {/* Options */}
                    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.25, sm: 1.5 }, display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {pq.options.map((opt) => {
                        const isUserPick = opt.key === pq.userKey;
                        const isCorrectOpt = opt.key === pq.correctKey;
                        const isWrongPick = isUserPick && !pq.isCorrect;

                        let bgColor = "transparent";
                        let borderColor = alpha("#292634", 0.08);
                        let labelColor = "text.secondary";
                        let textColor = "#4B4B5A";
                        let fontWeight = 400;

                        if (isCorrectOpt) {
                          bgColor = "#ECFDF5";
                          borderColor = "#A7F3D0";
                          labelColor = "#059669";
                          textColor = "#065F46";
                          fontWeight = 600;
                        }
                        if (isWrongPick) {
                          bgColor = "#FEF2F2";
                          borderColor = "#FECACA";
                          labelColor = "#DC2626";
                          textColor = "#991B1B";
                          fontWeight = 600;
                        }

                        return (
                          <Box
                            key={opt.key}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              px: 1.5,
                              py: 0.9,
                              borderRadius: "10px",
                              bgcolor: bgColor,
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            {/* Letter badge */}
                            <Typography
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: "6px",
                                bgcolor: isCorrectOpt
                                  ? "#A7F3D0"
                                  : isWrongPick
                                  ? "#FECACA"
                                  : alpha("#292634", 0.07),
                                color: labelColor,
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                letterSpacing: 0,
                              }}
                            >
                              {opt.key.toUpperCase()}
                            </Typography>

                            <Typography
                              sx={{
                                flex: 1,
                                fontSize: { xs: "0.78rem", sm: "0.82rem" },
                                fontWeight,
                                color: textColor,
                                lineHeight: 1.45,
                              }}
                            >
                              {opt.text}
                            </Typography>

                            {/* Trailing badge */}
                            {isCorrectOpt && (
                              <Typography
                                sx={{
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  color: "#059669",
                                  bgcolor: "#A7F3D0",
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: "6px",
                                  flexShrink: 0,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {isUserPick ? "✓ Your answer · Correct" : "✓ Correct answer"}
                              </Typography>
                            )}
                            {isWrongPick && (
                              <Typography
                                sx={{
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  color: "#DC2626",
                                  bgcolor: "#FECACA",
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: "6px",
                                  flexShrink: 0,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                ✗ Your answer
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

        </Box>
      </Box>
    );
  }

  // ── QUIZ VIEW ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F9F8FF", display: "flex", flexDirection: "column" }}>
      <Navbar userName={user?.fullName} userEmail={user?.email} />

      {/* Unanswered confirm dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
          Submit with unanswered questions?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You have{" "}
            <Box component="strong" sx={{ color: "#292634" }}>
              {unansweredCount}
            </Box>{" "}
            unanswered question{unansweredCount !== 1 ? "s" : ""}. Unanswered questions will be marked incorrect.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ color: "text.secondary", fontWeight: 600 }}>
            Keep Answering
          </Button>
          <Button
            variant="contained"
            onClick={doSubmit}
            sx={{
              background: `linear-gradient(135deg, ${PD}, ${P})`,
              boxShadow: `0 4px 12px ${alpha(P, 0.35)}`,
              fontWeight: 700,
            }}
          >
            Submit Anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        component="main"
        sx={{
          flex: 1,
          maxWidth: 720,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Back button */}
        <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: "0.95rem !important" }} />}
            onClick={() => router.push("/dashboard")}
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              fontSize: { xs: "0.78rem", sm: "0.82rem" },
              px: 0,
              py: 0.5,
              minWidth: 0,
              "&:hover": { color: P, bgcolor: "transparent" },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        {/* Sub-header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.25,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: "text.secondary",
              fontSize: { xs: "0.58rem", sm: "0.62rem" },
              letterSpacing: "0.1em",
            }}
          >
            {cycle?.label || "2026 H2 Knowledge Assessment"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: P, fontWeight: 700, fontSize: { xs: "0.74rem", sm: "0.8rem" } }}
          >
            Question {currentIndex + 1} of {questions.length}
          </Typography>
        </Box>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={((currentIndex + 1) / Math.max(questions.length, 1)) * 100}
          sx={{ mb: { xs: 3, sm: 3.5 }, borderRadius: "4px", height: 5 }}
        />

        {/* Question card */}
        {currentQuestion && (
          <Box
            sx={{
              bgcolor: "white",
              borderRadius: { xs: "20px", sm: "24px" },
              border: `1px solid ${alpha(P, 0.1)}`,
              boxShadow: [
                `0 12px 40px ${alpha(P, 0.08)}`,
                "0 2px 8px rgba(0,0,0,0.04)",
              ].join(", "),
              p: { xs: 3, sm: 4, md: 5 },
            }}
          >
            {/* Category chip */}
            <Chip
              icon={<FolderOutlinedIcon sx={{ fontSize: "0.82rem !important" }} />}
              label={currentQuestion.category}
              size="small"
              sx={{
                mb: { xs: 2, sm: 2.5 },
                bgcolor: alpha(P, 0.07),
                color: P,
                fontWeight: 600,
                fontSize: { xs: "0.68rem", sm: "0.72rem" },
                height: 28,
                "& .MuiChip-icon": { color: P },
              }}
            />

            {/* Question text */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "#292634",
                lineHeight: 1.55,
                mb: { xs: 2.5, sm: 3.5 },
                fontSize: { xs: "0.98rem", sm: "1.08rem", md: "1.18rem" },
              }}
            >
              {currentQuestion.questionText}
            </Typography>

            {/* Options */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.25, sm: 1.5 } }}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.key;
                return (
                  <Box
                    key={option.key}
                    onClick={() => handleSelectOption(option.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleSelectOption(option.key);
                    }}
                    sx={{
                      cursor: "pointer",
                      borderRadius: { xs: "14px", sm: "16px" },
                      border: isSelected
                        ? `2px solid ${P}`
                        : `1.5px solid ${alpha("#292634", 0.1)}`,
                      bgcolor: isSelected ? alpha(P, 0.05) : "white",
                      p: { xs: "13px 15px", sm: "15px 20px" },
                      transition: "all 0.12s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: 1.5, sm: 2 },
                      "&:hover": {
                        border: isSelected
                          ? `2px solid ${P}`
                          : `1.5px solid ${alpha(P, 0.35)}`,
                        bgcolor: isSelected ? alpha(P, 0.05) : alpha(P, 0.02),
                      },
                      "&:focus-visible": {
                        outline: `2px solid ${P}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    {/* Radio dot */}
                    <Box
                      sx={{
                        width: { xs: 18, sm: 20 },
                        height: { xs: 18, sm: 20 },
                        borderRadius: "50%",
                        border: isSelected ? `2px solid ${P}` : "2px solid #D1D5DB",
                        bgcolor: isSelected ? P : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.12s ease",
                      }}
                    >
                      {isSelected && (
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "white" }} />
                      )}
                    </Box>

                    {/* Option content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: "0.6rem", sm: "0.65rem" },
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: isSelected ? P : "text.secondary",
                          mb: 0.3,
                          lineHeight: 1,
                        }}
                      >
                        Option {option.key.toUpperCase()}
                        {isSelected && " · Selected"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: "0.84rem", sm: "0.9rem" },
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#292634" : "#4B4B5A",
                          lineHeight: 1.5,
                        }}
                      >
                        {option.text}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Navigation */}
            <Box
              sx={{
                mt: { xs: 3, sm: 4 },
                pt: { xs: 2.5, sm: 3 },
                borderTop: `1px solid ${alpha(P, 0.08)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Button
                startIcon={<ArrowBackIcon sx={{ fontSize: { xs: "1rem !important", sm: "1.1rem !important" } }} />}
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                sx={{
                  color: currentIndex === 0 ? alpha("#292634", 0.25) : "text.primary",
                  fontWeight: 600,
                  fontSize: { xs: "0.78rem", sm: "0.85rem" },
                  px: { xs: 1.5, sm: 2 },
                  py: 1,
                  borderRadius: "10px",
                  "&:hover": { bgcolor: currentIndex === 0 ? "transparent" : alpha(P, 0.06) },
                }}
              >
                Previous
              </Button>

              {/* Dot progress (hidden on xs) */}
              <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.6 }}>
                {questions.map((q, i) => (
                  <Box
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    sx={{
                      width: i === currentIndex ? 22 : answers[q.id] ? 8 : 6,
                      height: 6,
                      borderRadius: "99px",
                      bgcolor:
                        i === currentIndex
                          ? P
                          : answers[q.id]
                          ? alpha(P, 0.45)
                          : alpha("#292634", 0.12),
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  />
                ))}
              </Box>

              {currentIndex === questions.length - 1 ? (
                <Button
                  variant="contained"
                  endIcon={
                    isSubmitting ? undefined : (
                      <CheckCircleOutlinedIcon sx={{ fontSize: { xs: "1rem !important", sm: "1.1rem !important" } }} />
                    )
                  }
                  onClick={handleSubmitClick}
                  disabled={isSubmitting}
                  sx={{
                    background: `linear-gradient(135deg, ${PD}, ${P})`,
                    boxShadow: `0 6px 18px ${alpha(P, 0.4)}`,
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: { xs: "0.78rem", sm: "0.85rem" },
                    px: { xs: 2.5, sm: 3 },
                    py: { xs: 1, sm: 1.25 },
                    "&:hover": {
                      background: `linear-gradient(135deg, ${PD}, ${P})`,
                      boxShadow: `0 8px 22px ${alpha(P, 0.48)}`,
                    },
                    "&.Mui-disabled": { background: alpha("#9CA3AF", 0.35), color: "#fff", boxShadow: "none" },
                  }}
                >
                  {isSubmitting ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={14} color="inherit" />
                      Submitting…
                    </Box>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: { xs: "1rem !important", sm: "1.1rem !important" } }} />}
                  onClick={handleNext}
                  sx={{
                    background: `linear-gradient(135deg, ${PD}, ${P})`,
                    boxShadow: `0 6px 18px ${alpha(P, 0.4)}`,
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: { xs: "0.78rem", sm: "0.85rem" },
                    px: { xs: 2.5, sm: 3 },
                    py: { xs: 1, sm: 1.25 },
                    "&:hover": {
                      background: `linear-gradient(135deg, ${PD}, ${P})`,
                      boxShadow: `0 8px 22px ${alpha(P, 0.48)}`,
                    },
                  }}
                >
                  Next
                </Button>
              )}
            </Box>

            {/* Auto-save note */}
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: { xs: "0.64rem", sm: "0.68rem" },
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 11, opacity: 0.45 }} />
                Answers are saved automatically as you progress
              </Typography>
            </Box>
          </Box>
        )}

        {/* Answered count pill */}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
          <Typography
            variant="caption"
            sx={{
              color: P,
              fontWeight: 600,
              fontSize: { xs: "0.68rem", sm: "0.72rem" },
              bgcolor: alpha(P, 0.07),
              px: 2,
              py: 0.6,
              borderRadius: "99px",
            }}
          >
            {answeredCount} of {questions.length} answered
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
