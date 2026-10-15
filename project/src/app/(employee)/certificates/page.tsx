"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  CalendarToday,
  Download,
  MilitaryTechOutlined,
  SecurityOutlined,
  ArrowBack,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";
import { Navbar } from "@/components/Navbar";

const colors = sebsaColors;
const P = colors.primary;

interface UserData {
  id: string;
  fullName: string;
  email: string;
}

interface CertData {
  id: string;
  certificateNumber: string;
  issuedAt: string;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [certs, setCerts] = useState<CertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth");
        const json = await res.json();
        if (!json.success || json.data.user.role !== "employee") {
          router.push("/login");
          return;
        }
        setUser(json.data.user);
        setCerts(json.data.certificates ?? []);
      } catch {
        // handled by redirect
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function handleDownload(cert: CertData) {
    window.open(`/api/certificates/${cert.certificateNumber}`, "_blank");
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: colors.page }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography variant="body2" color="text.secondary">Loading certificates…</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: colors.page, color: colors.ink }}>
      <Navbar userName={user?.fullName} userEmail={user?.email} />

      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => router.push("/dashboard")}
          sx={{ mb: 2.5, color: colors.muted, fontSize: 13 }}
        >
          Back to Dashboard
        </Button>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
            My Certificates
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: colors.muted }}>
            Verified completion credentials issued by SEBSA Evaluation Authority
          </Typography>
        </Box>

        {certs.length === 0 ? (
          <Card sx={{ borderRadius: 2.5, p: 4, textAlign: "center" }}>
            <MilitaryTechOutlined sx={{ fontSize: 48, color: colors.muted, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>No certificates yet</Typography>
            <Typography sx={{ fontSize: 13.5, color: colors.muted, mb: 2 }}>
              Complete an assessment to earn your first certificate.
            </Typography>
            <Button variant="contained" onClick={() => router.push("/assessment")}>
              Start Assessment
            </Button>
          </Card>
        ) : (
          <Card sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>
                Certificate History
              </Typography>
              <Typography sx={{ fontSize: 13, color: colors.muted, fontWeight: 600 }}>
                {certs.length} certificate{certs.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            <Divider />
            <Stack divider={<Divider flexItem />}>
              {certs.map((cert) => (
                <Box
                  key={cert.id}
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
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.25, bgcolor: colors.lavender, color: P, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <MilitaryTechOutlined sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 700 }}>
                        SEBSA Assessment Certificate
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.35, flexWrap: "wrap" }}>
                        <CalendarToday sx={{ fontSize: 12, color: colors.muted }} />
                        <Typography sx={{ fontSize: 12, color: colors.muted }}>
                          Issued: {new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </Typography>
                        <Box component="span" sx={{ mx: 0.5, color: colors.muted }}>·</Box>
                        <Typography sx={{ fontSize: 11.5, color: colors.muted, fontFamily: "monospace" }}>
                          {cert.certificateNumber.slice(0, 8).toUpperCase()}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                  <Button
                    startIcon={<Download sx={{ fontSize: 15 }} />}
                    onClick={() => handleDownload(cert)}
                    sx={{ color: P, fontSize: { xs: 12, sm: 13 }, flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
                  >
                    Download PDF
                  </Button>
                </Box>
              ))}
            </Stack>
            <Divider />
            <Box sx={{ px: { xs: 2, sm: 2.75 }, py: 1.5, bgcolor: "#F8F3FF" }}>
              <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                <SecurityOutlined sx={{ fontSize: 14, color: colors.muted }} />
                <Typography sx={{ fontSize: 12, color: colors.muted }}>
                  Certificates are cryptographically signed by SEBSA Evaluation Authority.
                </Typography>
              </Stack>
            </Box>
          </Card>
        )}
      </Container>
    </Box>
  );
}
