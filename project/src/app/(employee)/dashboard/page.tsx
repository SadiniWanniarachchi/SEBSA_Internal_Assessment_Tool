"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowForward,
  CheckCircleOutlined,
  CalendarToday,
  Download,
  EmailOutlined,
  FilePresentOutlined,
  MilitaryTechOutlined,
  PersonOutlined,
  ReplayOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { sebsaColors } from "@/lib/theme";
import { Navbar } from "@/components/Navbar";

interface UserData {
  id: string;
  fullName: string;
  email: string;
}

interface ActiveCycle {
  id: string;
  label: string;
  deadline: string | null;
}

interface CertificateItem {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  score: number | null;
  cycleLabel: string | null;
}

const C = sebsaColors;
const P = C.primary;

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeCycle, setActiveCycle] = useState<ActiveCycle | null>(null);
  const [pendingAssessment, setPendingAssessment] = useState(true);
  const [canRetry, setCanRetry] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<{ score: number; passed?: boolean; isFinal?: boolean } | null>(null);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth");
        const json = await res.json();
        if (!json.success || json.data.user.role !== "employee") {
          router.replace("/login");
          return;
        }
        setUser(json.data.user);
        setActiveCycle(json.data.activeCycle);
        setPendingAssessment(json.data.pendingAssessment);
        setCanRetry(json.data.canRetry ?? false);
        setCurrentAttempt(json.data.currentAttempt);
        setCertificates(json.data.certificates ?? []);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const initials = useMemo(
    () =>
      user?.fullName
        ?.split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?",
    [user?.fullName],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F7F5FB", color: C.ink }}>
      <Navbar userName={user?.fullName} userEmail={user?.email} />

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4, md: 5 } }}>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={{ xs: 2.5, md: 3 }}
            sx={{ alignItems: { xs: "stretch", lg: "flex-start" } }}
          >
            {/* ── Profile card ─────────────────────────────────────────────── */}
            <Box sx={{ width: { xs: "100%", lg: 360 }, flexShrink: 0 }}>
              <Card sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 24px rgba(62,11,120,0.09)" }}>
                {/* Gradient header */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${P} 0%, #6A2FBE 100%)`,
                    pt: 4, pb: 6, px: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {/* Subtle decorative circles */}
                  <Box sx={{ position: "absolute", top: -18, right: -18, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                  <Box sx={{ position: "absolute", bottom: 12, left: -14, width: 55, height: 55, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

                  {/* Avatar */}
                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Avatar
                      sx={{
                        width: 76, height: 76,
                        fontSize: 26, fontWeight: 800,
                        bgcolor: "rgba(255,255,255,0.18)",
                        color: "#fff",
                        border: "3px solid rgba(255,255,255,0.35)",
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Box sx={{ position: "absolute", right: 2, bottom: 2, width: 14, height: 14, bgcolor: C.success, border: "3px solid rgba(255,255,255,0.6)", borderRadius: "50%" }} />
                  </Box>
                </Box>

                {/* Pull avatar overlap */}
                <Box sx={{ mt: -0.5, px: 3, pb: 3 }}>
                  {/* Profile fields — Name and Email only (Req 8) */}
                  <Stack spacing={0} divider={<Divider flexItem />}>
                    <ProfileField icon={<PersonOutlined />} label="NAME"  value={user?.fullName} />
                    <ProfileField icon={<EmailOutlined />}  label="EMAIL" value={user?.email} mono />
                  </Stack>
                </Box>
              </Card>
            </Box>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
              {/* Assessment banner */}
              <AssessmentBanner
                pending={pendingAssessment}
                canRetry={canRetry}
                cycle={activeCycle}
                attempt={currentAttempt}
              />

              {/* Certificate history */}
              <Card sx={{ borderRadius: 2.5, overflow: "hidden", boxShadow: "0 4px 20px rgba(62,11,120,0.07)" }}>
                <Box sx={{ px: { xs: 2.25, sm: 3 }, py: { xs: 2, sm: 2.5 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 800, letterSpacing: "-0.3px" }}>
                      Certificate History
                    </Typography>
                    <Typography sx={{ mt: 0.35, fontSize: 13, color: C.muted }}>
                      Verified assessment completion credentials
                    </Typography>
                  </Box>
                  {certificates.length > 0 && (
                    <Box sx={{ px: 1.25, py: 0.6, bgcolor: C.lavender, border: `1px solid ${C.line}`, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: 11, color: P, fontWeight: 800, letterSpacing: ".05em" }}>
                        {certificates.length} PASSED
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Divider />

                {certificates.length === 0 ? (
                  <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: C.lavender, display: "grid", placeItems: "center", mx: "auto", mb: 2 }}>
                      <MilitaryTechOutlined sx={{ fontSize: 28, color: P }} />
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>No certificates yet</Typography>
                    <Typography sx={{ fontSize: 13, color: C.muted }}>Complete an assessment to earn your first certificate.</Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {certificates.map((cert) => (
                      <CertRow key={cert.id} cert={cert} />
                    ))}
                  </Stack>
                )}

                <Divider />
                <Box sx={{ px: { xs: 2.25, sm: 3 }, py: 1.5, bgcolor: "#FAF7FF", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <SecurityOutlined sx={{ fontSize: 13, color: C.muted }} />
                  <Typography sx={{ fontSize: 11.5, color: C.muted }}>
                    Certificates signed cryptographically by SEBSA Evaluation Authority.
                  </Typography>
                </Box>
              </Card>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProfileField({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  const C = sebsaColors;
  const P = C.primary;
  return (
    <Box sx={{ py: 1.75, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: C.lavender, color: P, display: "grid", placeItems: "center", flexShrink: 0, mt: 0.15 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: C.muted, mb: 0.35 }}>{label}</Typography>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: mono ? 500 : 600,
            fontFamily: mono ? "monospace" : undefined,
            color: C.ink,
            overflowWrap: "anywhere",
            lineHeight: 1.4,
          }}
        >
          {value || "—"}
        </Typography>
      </Box>
    </Box>
  );
}

function AssessmentBanner({
  pending,
  canRetry,
  cycle,
  attempt,
}: {
  pending: boolean;
  canRetry: boolean;
  cycle: ActiveCycle | null;
  attempt: { score: number; passed?: boolean } | null;
}) {
  const C = sebsaColors;
  const P = C.primary;

  // Retry available: attempt 1 done, score < threshold
  if (canRetry && attempt) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 2.75 },
          borderRadius: 2.5,
          background: "linear-gradient(120deg, #FFFBEB 0%, #FEF3C7 100%)",
          border: "1px solid #FDE68A",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", minWidth: 0 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: "#FEF3C7", display: "grid", placeItems: "center", flexShrink: 0, border: "1px solid #FDE68A" }}>
            <ReplayOutlined sx={{ color: "#B45309", fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: 0.75, bgcolor: "rgba(180,83,9,0.1)", mb: 0.4 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: "#B45309" }}>RETRY AVAILABLE</Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 800, letterSpacing: "-0.2px", color: "#92400E" }}>
              Second Attempt Available
            </Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#92400E" }}>
              You scored <b>{attempt.score}/10</b> on attempt 1. You may take one more attempt with the same questions.
            </Typography>
          </Box>
        </Stack>
        <Button
          component={Link}
          href="/assessment"
          variant="contained"
          endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
          sx={{
            whiteSpace: "nowrap",
            flexShrink: 0,
            px: 2.5,
            py: 1.2,
            fontSize: 13,
            fontWeight: 700,
            alignSelf: { xs: "stretch", sm: "center" },
            width: { xs: "100%", sm: "auto" },
            background: "linear-gradient(135deg, #D97706, #B45309)",
            boxShadow: "0 4px 14px rgba(180,83,9,0.3)",
            "&:hover": { background: "linear-gradient(135deg, #B45309, #92400E)" },
          }}
        >
          Start Second Attempt
        </Button>
      </Box>
    );
  }

  // Completed (isFinal attempt done)
  if (!pending && !canRetry) {
    const passed = attempt?.passed;
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2.5,
          border: passed ? "1px solid #B7EFB8" : "1px solid #FECACA",
          bgcolor: passed ? "#F0FBF0" : "#FEF2F2",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: passed ? "#D1FAD2" : "#FECACA", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <CheckCircleOutlined sx={{ color: passed ? C.success : C.error, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: passed ? "#1A5C1C" : "#991B1B" }}>
            {cycle?.label || "Assessment"} — {passed ? "Passed" : "Completed"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: passed ? "#2D7D30" : "#B91C1C" }}>
            Your score: <b>{attempt?.score ?? "—"} / 10</b>.{" "}
            {passed ? "Certificate has been recorded." : "Pass mark not reached."}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.75 },
        borderRadius: 2.5,
        background: `linear-gradient(120deg, #F4EEFF 0%, #EDE0FF 100%)`,
        border: "1px solid #D7C8FF",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 1.5,
            background: `linear-gradient(135deg, ${P}, #8B4FD8)`,
            display: "grid", placeItems: "center",
            flexShrink: 0,
            boxShadow: `0 4px 12px rgba(62,11,120,0.3)`,
          }}
        >
          <FilePresentOutlined sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", px: 1, py: 0.25, borderRadius: 0.75, bgcolor: "rgba(62,11,120,0.1)", mb: 0.4 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: P }}>ACTION REQUIRED</Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 800, letterSpacing: "-0.2px" }}>
            Assessment pending
          </Typography>
          <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#595263" }}>
            {cycle?.label || "Assessment"} · open until{" "}
            <b>{cycle?.deadline || "end of cycle"}</b>
          </Typography>
        </Box>
      </Stack>
      <Button
        component={Link}
        href="/assessment"
        variant="contained"
        endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
        sx={{
          whiteSpace: "nowrap",
          flexShrink: 0,
          px: 2.5,
          py: 1.2,
          fontSize: 13,
          fontWeight: 700,
          alignSelf: { xs: "stretch", sm: "center" },
          width: { xs: "100%", sm: "auto" },
          background: `linear-gradient(135deg, ${P}, #6A2FBE)`,
          boxShadow: `0 4px 14px rgba(62,11,120,0.35)`,
          "&:hover": { background: `linear-gradient(135deg, #2E0858, ${P})` },
        }}
      >
        Start Assessment
      </Button>
    </Box>
  );
}

function CertRow({ cert }: { cert: CertificateItem }) {
  const C = sebsaColors;
  const P = C.primary;
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    window.open(`/api/certificates/${cert.certificateNumber}`, "_blank");
    setTimeout(() => setDownloading(false), 1500);
  };

  const title = cert.cycleLabel
    ? `SEBSA Assessment Portal — ${cert.cycleLabel}`
    : "SEBSA Assessment Certificate";

  const scoreColor = cert.score !== null
    ? cert.score >= 6 ? { bg: "#D1FAD2", fg: "#1A5C1C" } : { bg: "#FDEAEA", fg: "#A30D0D" }
    : null;

  return (
    <Box
      sx={{
        px: { xs: 2.25, sm: 3 },
        py: { xs: 1.75, sm: 1.5 },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: { xs: 1.5, sm: 2 },
        transition: "background 0.1s",
        "&:hover": { bgcolor: "#FAF7FF" },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: C.lavender, color: P, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <MilitaryTechOutlined sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: { xs: "normal", sm: "nowrap" } }}>
            {title}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.3, flexWrap: "wrap", gap: 0 }}>
            <CalendarToday sx={{ fontSize: 11, color: C.muted }} />
            <Typography sx={{ fontSize: 11.5, color: C.muted, ml: "4px !important" }}>
              {new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </Typography>
            {cert.score !== null && (
              <>
                <Box component="span" sx={{ mx: 0.75, color: C.muted, fontSize: 11 }}>·</Box>
                <Typography sx={{ fontSize: 11.5, color: C.muted }}>Score <b>{cert.score}/10</b></Typography>
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-end" }, flexShrink: 0 }}>
        {scoreColor && cert.score !== null && (
          <Box sx={{ px: 1.1, py: 0.45, borderRadius: 1, bgcolor: scoreColor.bg }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: scoreColor.fg }}>
              {cert.score}/10
            </Typography>
          </Box>
        )}
        <Button
          type="button"
          startIcon={downloading ? <CircularProgress size={11} color="inherit" /> : <Download sx={{ fontSize: 15 }} />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{
            minWidth: 0,
            color: P,
            fontSize: 12,
            fontWeight: 700,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: C.lavender,
            "&:hover": { bgcolor: "#E4D9FF" },
          }}
        >
          {downloading ? "Opening…" : "Download"}
        </Button>
      </Stack>
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2.5, md: 3 }}>
      <Box sx={{ width: { xs: "100%", lg: 304 }, flexShrink: 0 }}>
        <Skeleton variant="rounded" height={480} sx={{ borderRadius: 3 }} />
      </Box>
      <Stack spacing={2.5} sx={{ flex: 1 }}>
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2.5 }} />
      </Stack>
    </Stack>
  );
}
