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
  Paper,
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
  title: string;
  badge: string;
  badgeType?: "compliant" | "top";
  completedDate: string;
  idCode: string;
  score: string;
}

const certificates: CertificateItem[] = [
  {
    id: "cert-1",
    title: "SEBSA Internal Assessment — 2026 H1",
    badge: "Compliant",
    badgeType: "compliant",
    completedDate: "18 Apr 2026",
    idCode: "CR-26-081",
    score: "9 / 10",
  },
  {
    id: "cert-2",
    title: "SEBSA Internal Assessment — 2025 H2",
    badge: "Compliant",
    badgeType: "compliant",
    completedDate: "12 Oct 2025",
    idCode: "CR-25-419",
    score: "8 / 10",
  },
  {
    id: "cert-3",
    title: "SEBSA Internal Assessment — 2025 H1",
    badge: "Top Score (100%)",
    badgeType: "top",
    completedDate: "20 Apr 2025",
    idCode: "CR-25-102",
    score: "10 / 10",
  },
  {
    id: "cert-4",
    title: "SEBSA Internal Assessment — 2024 H2",
    badge: "Compliant",
    badgeType: "compliant",
    completedDate: "15 Oct 2024",
    idCode: "CR-24-904",
    score: "9 / 10",
  },
];

const colors = sebsaColors;

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeCycle, setActiveCycle] = useState<ActiveCycle | null>(null);
  const [pendingAssessment, setPendingAssessment] = useState(true);
  const [currentAttempt, setCurrentAttempt] = useState<{ score: number } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/auth");
        const json = await response.json();
        if (!json.success || json.data.user.role !== "employee") {
          router.push("/login");
          return;
        }

        setUser(json.data.user);
        setActiveCycle(json.data.activeCycle);
        setPendingAssessment(json.data.pendingAssessment);
        setCurrentAttempt(json.data.currentAttempt);
      } catch (error) {
        console.error("Failed to load profile:", error);
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
        .map((name) => name[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "SW",
    [user?.fullName],
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: colors.page }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography variant="body2" color="text.secondary">
            Loading user profile...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: colors.page, color: colors.ink }}>
      <Navbar userName={user?.fullName} userEmail={user?.email} />

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4, md: 5 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 2.5, md: 3.5 }} sx={{ alignItems: "stretch" }}>
          <Card sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0, borderRadius: 2.5, borderTop: `4px solid ${colors.primary}` }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.25 }, "&:last-child": { pb: { xs: 2.5, sm: 3.25 } } }}>
              <Stack sx={{ alignItems: "center", textAlign: "center" }}>
                <Box sx={{ position: "relative", mt: 0.5 }}>
                  <Avatar sx={{ width: 72, height: 72, bgcolor: colors.lavender, color: colors.primary, fontSize: 24, fontWeight: 800 }}>
                    {initials}
                  </Avatar>
                  <Box sx={{ position: "absolute", right: 1, bottom: 2, width: 14, height: 14, bgcolor: colors.green, border: "3px solid #fff", borderRadius: "50%" }} />
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
                      {user?.joinedDate ? new Date(user.joinedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "March 15, 2021"}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditOutlined sx={{ fontSize: 14 }} />}
                onClick={() => window.alert("Profile edits are managed by SEBSA HR directory.")}
                sx={{ mt: 3.25, height: 44, borderColor: colors.primary, color: colors.primary, fontSize: 13, borderRadius: 1.5 }}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              sx={{
                p: { xs: 2, sm: 2.75 },
                borderRadius: 2.5,
                border: `1px solid #D7C8FF`,
                bgcolor: "#F4EEFF",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              {pendingAssessment ? (
                <>
                  <Stack direction="row" spacing={1.5} sx={{ width: "100%", alignItems: "center", minWidth: 0 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "#fff", border: `1px solid #DED2FF`, display: "grid", placeItems: "center", color: colors.primary, flexShrink: 0 }}>
                      <FilePresentOutlined sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ display: "inline-block", px: 1, py: 0.3, borderRadius: 0.75, bgcolor: "#E4D9FF", color: colors.primary, fontSize: 11, fontWeight: 700 }}>Action Required</Typography>
                      <Typography sx={{ mt: 0.35, fontSize: { xs: 15, sm: 17 }, fontWeight: 700 }}>You have an assessment pending</Typography>
                      <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: "#595263" }}>
                        {activeCycle?.label || "2026 H2"} Knowledge Assessment is open until {activeCycle?.deadline || "November 30, 2026"}.
                      </Typography>
                    </Box>
                  </Stack>
                  <Button component={Link} href="/assessment" variant="contained" endIcon={<ArrowForward />} sx={{ whiteSpace: "nowrap", flexShrink: 0, px: 2.25, py: 1.1, fontSize: 13, alignSelf: { xs: "stretch", sm: "center" }, width: { xs: "100%", sm: "auto" } }}>
                    Start Assessment
                  </Button>
                </>
              ) : (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <CheckCircleOutlined color="success" />
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{activeCycle?.label || "2026 H2"} Assessment Submitted</Typography>
                    <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Your score: <b>{currentAttempt?.score ?? 9} / 10</b>. Certificate has been recorded.</Typography>
                  </Box>
                </Stack>
              )}
            </Paper>

            <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ px: { xs: 2, sm: 2.75 }, py: { xs: 2, sm: 2.25 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography sx={{ fontSize: { xs: 19, sm: 21 }, fontWeight: 700 }}>Certificate History</Typography>
                  <Typography sx={{ mt: 0.35, fontSize: { xs: 13, sm: 14 }, color: colors.muted }}>Verified evaluation transcripts and completion credentials</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Stat label="AVG. RATING" value="9.25 / 10" />
                  <Stat label="TOTAL PASSED" value="4" />
                </Stack>
              </Box>
              <Divider />
              <Stack divider={<Divider flexItem />}>
                {certificates.map((certificate) => (
                  <CertificateRow key={certificate.id} certificate={certificate} />
                ))}
              </Stack>
                        <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 1.5, bgcolor: "#F8F3FF", display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                  <SecurityOutlined sx={{ fontSize: 14, color: colors.muted }} />
                  <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: colors.muted }}>Certificates signed cryptographically by SEBSA Evaluation Authority.</Typography>
                </Stack>
                <Button onClick={() => window.alert("Exporting all records to CSV...")} endIcon={<ArrowForward sx={{ fontSize: 14 }} />} sx={{ minWidth: 0, p: 0, fontSize: { xs: 11, sm: 12 }, color: colors.primary }}>
                  Export All Records (.CSV)
                </Button>
              </Box>
            </Card>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ px: 1, py: 0.55, bgcolor: "#F7F3FC", border: `1px solid ${colors.line}`, borderRadius: 1 }}>
      <Typography component="span" sx={{ fontSize: { xs: 10, sm: 11 }, color: colors.muted, fontWeight: 800, letterSpacing: ".04em" }}>{label}</Typography>
      <Typography component="span" sx={{ ml: 0.65, fontSize: { xs: 11, sm: 12 }, color: colors.ink, fontWeight: 800 }}>{value}</Typography>
    </Box>
  );
}

function CertificateRow({ certificate }: { certificate: CertificateItem }) {
  return (
    <Box sx={{ px: { xs: 2, sm: 2.75 }, py: { xs: 1.75, sm: 1.5 }, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", gap: { xs: 1.25, sm: 2 }, "&:hover": { bgcolor: "#FCFAFF" } }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: colors.lavender, color: colors.primary, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <MilitaryTechOutlined sx={{ fontSize: 17 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 700 }}>{certificate.title}</Typography>
            <Typography sx={{ px: 0.75, py: 0.2, borderRadius: 1, bgcolor: certificate.badgeType === "top" ? "#E4D9FF" : "#E1F7F4", color: certificate.badgeType === "top" ? colors.primary : colors.green, fontSize: 11, fontWeight: 700 }}>{certificate.badge}</Typography>
          </Stack>
          <Typography sx={{ mt: 0.4, fontSize: { xs: 12, sm: 12.5 }, color: colors.muted }}>
            <CalendarToday sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.35 }} /> Completed: {certificate.completedDate} <Box component="span" sx={{ mx: 0.6 }}>·</Box> ID: {certificate.idCode}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: { xs: "space-between", sm: "flex-end" }, flexShrink: 0 }}>
        <Typography sx={{ px: 1, py: 0.55, borderRadius: 1, bgcolor: colors.lavender, color: colors.primary, fontSize: { xs: 11, sm: 11.5 }, fontWeight: 800 }}>Score: {certificate.score}</Typography>
        <Button onClick={() => window.alert(`Certificate ${certificate.idCode} verified. PDF download started.`)} startIcon={<Download sx={{ fontSize: 15 }} />} sx={{ minWidth: 0, p: 0, color: colors.primary, fontSize: { xs: 11, sm: 11.5 } }}>
          Download
        </Button>
      </Stack>
    </Box>
  );
}
