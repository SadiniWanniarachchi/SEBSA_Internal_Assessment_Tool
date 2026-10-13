"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowForward,
  CalendarToday,
  CheckCircleOutlined,
  Download,
  EditOutlined,
  FilePresentOutlined,
  MilitaryTechOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
  department: string;
  roleTitle: string;
  employeeIdCode: string;
  tierBadge: string;
  joinedDate: string | Date;
}

interface ActiveCycle {
  id: string;
  label: string;
  deadline: string;
}

interface CertificateItem {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  score: number | null;
  cycleLabel: string | null;
}

const colors = sebsaColors;
const P = colors.primary;

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeCycle, setActiveCycle] = useState<ActiveCycle | null>(null);
  const [pendingAssessment, setPendingAssessment] = useState(true);
  const [currentAttempt, setCurrentAttempt] = useState<{ score: number } | null>(null);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/auth");
        const json = await response.json();
        if (!json.success || json.data.user.role !== "employee") {
          router.replace("/login");
          return;
        }
        setUser(json.data.user);
        setActiveCycle(json.data.activeCycle);
        setPendingAssessment(json.data.pendingAssessment);
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
        .toUpperCase() || "SW",
    [user?.fullName],
  );

  // Render navbar immediately; show skeleton for content while loading
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: colors.page, color: colors.ink }}>
      <Navbar userName={user?.fullName} userEmail={user?.email} />

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4, md: 5 } }}>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2.5, md: 3.5 }} sx={{ alignItems: "stretch" }}>
            {/* ── Profile card ───────────────────────────────────────────────── */}
            <Card sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0, borderRadius: 2.5, borderTop: `4px solid ${P}` }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, "&:last-child": { pb: { xs: 2.5, sm: 3 } } }}>
                <Stack sx={{ alignItems: "center", textAlign: "center" }}>
                  <Box sx={{ position: "relative", mt: 0.5 }}>
                    <Avatar sx={{ width: 72, height: 72, bgcolor: colors.lavender, color: P, fontSize: 24, fontWeight: 800 }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ position: "absolute", right: 1, bottom: 2, width: 14, height: 14, bgcolor: colors.success, border: "3px solid #fff", borderRadius: "50%" }} />
                  </Box>
                  <Typography sx={{ mt: 1.5, fontSize: { xs: 18, sm: 20 }, fontWeight: 700 }}>{user?.fullName}</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: { xs: 12, sm: 13 }, color: colors.muted }}>{user?.roleTitle}</Typography>
                </Stack>

                <Divider sx={{ my: 3 }} />
                <Stack spacing={2.5}>
                  {[
                    ["EMAIL", user?.email],
                    ["EMPLOYEE ID", user?.employeeIdCode],
                    ["DEPARTMENT", user?.department],
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Typography sx={{ fontSize: 11, color: colors.muted, fontWeight: 800, letterSpacing: ".07em" }}>{label}</Typography>
                      <Typography sx={{ mt: 0.45, fontSize: 13, color: colors.ink, fontWeight: label === "EMAIL" ? 500 : 600, overflowWrap: "anywhere" }}>{value}</Typography>
                    </Box>
                  ))}
                  <Box>
                    <Typography sx={{ fontSize: 11, color: colors.muted, fontWeight: 800, letterSpacing: ".07em" }}>DATE JOINED</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.35, alignItems: "center" }}>
                      <CalendarToday sx={{ fontSize: 12, color: colors.muted }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                        {user?.joinedDate ? new Date(user.joinedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  type="button"
                  variant="outlined"
                  startIcon={<EditOutlined sx={{ fontSize: 14 }} />}
                  onClick={() => window.alert("Profile edits are managed by SEBSA HR directory.")}
                  sx={{ mt: 3, height: 44, borderColor: P, color: P, fontSize: 13, borderRadius: 1.5 }}
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* ── Right column ────────────────────────────────────────────── */}
            <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}>
              {/* Assessment banner */}
              <Box
                sx={{
                  p: { xs: 2, sm: 2.75 },
                  borderRadius: 2.5,
                  border: `1px solid #D7C8FF`,
                  bgcolor: "#F4EEFF",
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                {pendingAssessment ? (
                  <>
                    <Stack direction="row" spacing={1.5} sx={{ width: "100%", alignItems: "center", minWidth: 0 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "#fff", border: `1px solid #DED2FF`, display: "grid", placeItems: "center", color: P, flexShrink: 0 }}>
                        <FilePresentOutlined sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ display: "inline-block", px: 1, py: 0.3, borderRadius: 0.75, bgcolor: "#E4D9FF", color: P, fontSize: 11, fontWeight: 700 }}>Action Required</Typography>
                        <Typography sx={{ mt: 0.35, fontSize: { xs: 15, sm: 17 }, fontWeight: 700 }}>You have an assessment pending</Typography>
                        <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#595263" }}>
                          {activeCycle?.label || "Assessment"} is open until {activeCycle?.deadline || "the end of the cycle"}.
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      component={Link}
                      href="/assessment"
                      variant="contained"
                      endIcon={<ArrowForward />}
                      sx={{ whiteSpace: "nowrap", flexShrink: 0, px: 2.25, py: 1.1, fontSize: 13, alignSelf: { xs: "stretch", sm: "center" }, width: { xs: "100%", sm: "auto" } }}
                    >
                      Start Assessment
                    </Button>
                  </>
                ) : (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <CheckCircleOutlined color="success" />
                    <Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{activeCycle?.label || "Assessment"} Submitted</Typography>
                      <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Your score: <b>{currentAttempt?.score ?? "—"} / 10</b>. Certificate has been recorded.</Typography>
                    </Box>
                  </Stack>
                )}
              </Box>

              {/* Certificate history */}
              <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: { xs: 2, sm: 2.75 }, py: { xs: 2, sm: 2.25 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography sx={{ fontSize: { xs: 19, sm: 21 }, fontWeight: 700 }}>Certificate History</Typography>
                    <Typography sx={{ mt: 0.35, fontSize: { xs: 13, sm: 14 }, color: colors.muted }}>
                      Verified evaluation transcripts and completion credentials
                    </Typography>
                  </Box>
                  {certificates.length > 0 && (
                    <Stack direction="row" spacing={1}>
                      <StatPill label="TOTAL PASSED" value={String(certificates.length)} />
                    </Stack>
                  )}
                </Box>
                <Divider />

                {certificates.length === 0 ? (
                  <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 5, textAlign: "center" }}>
                    <MilitaryTechOutlined sx={{ fontSize: 40, color: colors.muted, mb: 1 }} />
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.ink, mb: 0.5 }}>No certificates yet</Typography>
                    <Typography sx={{ fontSize: 13, color: colors.muted }}>Complete an assessment to earn your first certificate.</Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {certificates.map((cert) => (
                      <CertRow key={cert.id} cert={cert} />
                    ))}
                  </Stack>
                )}

                <Divider />
                <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 1.5, bgcolor: "#F8F3FF", display: "flex", alignItems: "center", gap: 0.75 }}>
                  <SecurityOutlined sx={{ fontSize: 14, color: colors.muted }} />
                  <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: colors.muted }}>Certificates signed cryptographically by SEBSA Evaluation Authority.</Typography>
                </Box>
              </Card>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const colors = sebsaColors;
  return (
    <Box sx={{ px: 1, py: 0.55, bgcolor: "#F7F3FC", border: `1px solid ${colors.line}`, borderRadius: 1 }}>
      <Typography component="span" sx={{ fontSize: { xs: 10, sm: 11 }, color: colors.muted, fontWeight: 800, letterSpacing: ".04em" }}>{label}</Typography>
      <Typography component="span" sx={{ ml: 0.65, fontSize: { xs: 11, sm: 12 }, color: colors.ink, fontWeight: 800 }}>{value}</Typography>
    </Box>
  );
}

function CertRow({ cert }: { cert: CertificateItem }) {
  const colors = sebsaColors;
  const P = colors.primary;
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      window.open(`/api/certificates/${cert.certificateNumber}`, "_blank");
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  const title = cert.cycleLabel
    ? `SEBSA Internal Assessment — ${cert.cycleLabel}`
    : "SEBSA Assessment Certificate";

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 2.75 },
        py: { xs: 1.75, sm: 1.5 },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: { xs: 1.25, sm: 2 },
        "&:hover": { bgcolor: "#FCFAFF" },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: colors.lavender, color: P, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <MilitaryTechOutlined sx={{ fontSize: 17 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: { xs: "normal", sm: "nowrap" } }}>
            {title}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.35, flexWrap: "wrap" }}>
            <CalendarToday sx={{ fontSize: 12, color: colors.muted }} />
            <Typography sx={{ fontSize: 12, color: colors.muted }}>
              Issued: {new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </Typography>
            {cert.score !== null && (
              <>
                <Box component="span" sx={{ mx: 0.5, color: colors.muted }}>·</Box>
                <Typography sx={{ fontSize: 12, color: colors.muted }}>Score: <b>{cert.score}/10</b></Typography>
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-end" }, flexShrink: 0 }}>
        {cert.score !== null && (
          <Typography sx={{ px: 1, py: 0.55, borderRadius: 1, bgcolor: colors.lavender, color: P, fontSize: { xs: 11, sm: 11.5 }, fontWeight: 800 }}>
            {cert.score}/10
          </Typography>
        )}
        <Button
          type="button"
          startIcon={downloading ? <CircularProgress size={12} color="inherit" /> : <Download sx={{ fontSize: 15 }} />}
          onClick={handleDownload}
          disabled={downloading}
          sx={{ minWidth: 0, p: 0, color: P, fontSize: { xs: 11, sm: 11.5 }, fontWeight: 600 }}
        >
          {downloading ? "Opening…" : "Download"}
        </Button>
      </Stack>
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2.5, md: 3.5 }}>
      <Box sx={{ width: { xs: "100%", lg: 300 }, flexShrink: 0 }}>
        <Skeleton variant="rounded" height={420} sx={{ borderRadius: 2.5 }} />
      </Box>
      <Stack spacing={2.25} sx={{ flex: 1 }}>
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
      </Stack>
    </Stack>
  );
}
