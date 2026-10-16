"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowForward, AssignmentOutlined, CalendarTodayOutlined, CheckCircleOutlined,
  DownloadOutlined, HistoryOutlined, InboxOutlined, WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { Alert, Box, Button, Card, Chip, CircularProgress, Container, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { Navbar } from "@/components/Navbar";
import { sebsaColors } from "@/lib/theme";

interface CertificateItem {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  score: number | null;
  cycleLabel: string | null;
}

interface DashboardData {
  user: { id: string; fullName: string; email: string; role: string };
  activeCycle: {
    id: string;
    label: string;
    deadline: string | null;
    invitation: { expiresAt: string; status: string } | null;
  } | null;
  pendingAssessment: boolean;
  canRetry: boolean;
  currentAttempt: { score: number; passed: boolean; isFinal: boolean; attemptNumber: number; submittedAt?: string } | null;
  completedAssessmentCount?: number;
  certificates: CertificateItem[];
}

const P = sebsaColors.primary;
const muted = "#665F73";
const surface = { border: "1px solid #E7E1EF", borderRadius: "16px", boxShadow: "0 3px 14px rgba(34,20,52,0.025)" };
const iconBox = { width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "12px", bgcolor: "#F4EEFB", color: P, flexShrink: 0 };
const dateLabel = (date: string) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // Reuse an in-flight request during React Strict Mode's effect replay.
  const request = useRef<Promise<DashboardData> | null>(null);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError(null);
    if (!request.current) {
      request.current = (async () => {
        const res = await fetch("/api/auth", { cache: "no-store" });
        if ([401, 403, 404].includes(res.status)) throw new Error("SESSION_REQUIRED");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Unable to load your dashboard.");
        if (json.data.user.role !== "employee") throw new Error("SESSION_REQUIRED");
        return json.data as DashboardData;
      })();
    }
    const pending = request.current;
    pending.then(value => {
      if (!disposed) { setData(value); setNow(Date.now()); }
    }).catch((cause: unknown) => {
      if (disposed) return;
      if (cause instanceof Error && cause.message === "SESSION_REQUIRED") {
        router.replace("/login");
      } else {
        setError("We couldn't load your dashboard. Please check your connection and try again.");
      }
    }).finally(() => {
      if (request.current === pending) request.current = null;
      if (!disposed) setLoading(false);
    });
    return () => { disposed = true; };
  }, [router, reload]);

  const cycle = data?.activeCycle;
  const invitation = cycle?.invitation;
  const expiresAt = invitation ? new Date(invitation.expiresAt).getTime() : NaN;
  // Keep actions accurate if the invitation expires while this page is open.
  useEffect(() => {
    if (!Number.isFinite(expiresAt) || expiresAt < now || invitation?.status === "completed") return;
    const update = () => setNow(Date.now());
    const timer = window.setTimeout(update, Math.max(0, Math.min(expiresAt - Date.now() + 1, 2147483647)));
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [expiresAt, now, invitation?.status]);

  // Match the existing server's completed-invitation expiry exception.
  const expired = !!invitation && invitation.status !== "completed" && expiresAt < now;
  const eligible = !!cycle && !!invitation && Number.isFinite(expiresAt) && !expired;
  const actionable = eligible && !!data && (data.pendingAssessment || data.canRetry) && !data.currentAttempt?.isFinal;

  return (
    <Box sx={{
      minHeight: "100vh", bgcolor: "#F8F9FB", color: "#292634",
      "& :focus-visible": { outline: `3px solid ${P}`, outlineOffset: "3px" },
    }}>
      <Navbar userName={data?.user.fullName} userEmail={data?.user.email} />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        {loading && !data ? <DashboardSkeleton /> : error ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => setReload(n => n + 1)}>Try again</Button>}>
            {error}
          </Alert>
        ) : data ? (
          <Stack spacing={3}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: P, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.75 }}>Employee portal</Typography>
                <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 750, letterSpacing: "-0.6px", overflowWrap: "anywhere" }}>
                  Welcome back{data.user.fullName ? `, ${data.user.fullName}` : ""}
                </Typography>
                <Typography sx={{ mt: 0.75, fontSize: 14, color: muted }}>Your assessments and achievements, all in one place.</Typography>
              </Box>
              <Button component={Link} href="/certificates" startIcon={<WorkspacePremiumOutlined />} variant="outlined" sx={{ bgcolor: "#FFF", flexShrink: 0 }}>
                My Certificates
              </Button>
            </Box>

            <Box component="section" aria-label="Assessment overview" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: `repeat(${typeof data.completedAssessmentCount === "number" ? 3 : 2}, minmax(0, 1fr))` }, gap: 2 }}>
              <Metric label="Pending assessments" value={actionable ? 1 : 0} caption="Available to start or retry" icon={<AssignmentOutlined />} />
              {typeof data.completedAssessmentCount === "number" && <Metric label="Completed assessments" value={data.completedAssessmentCount} caption="Finalized across all cycles" icon={<CheckCircleOutlined />} />}
              <Metric label="Certificates earned" value={data.certificates.length} caption="Your issued certificates" icon={<WorkspacePremiumOutlined />} />
            </Box>

            <Card component="section" aria-labelledby="assessment-heading" sx={surface}>
              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2, borderBottom: "1px solid #EEEAF3" }}>
                <Typography id="assessment-heading" component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Your assessment</Typography>
              </Box>
              {!cycle || (!invitation && !data.currentAttempt) ? (
                <EmptyState icon={<InboxOutlined />} title="No assessments available" text="Your assigned assessment will appear here when an invitation is available. Check your email for updates from HR." />
              ) : (
                <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                    <Box sx={{ ...iconBox, display: { xs: "none", sm: "grid" } }}><AssignmentOutlined /></Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
                        <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{cycle.label}</Typography>
                        <Chip label={data.currentAttempt?.isFinal ? (data.currentAttempt.passed ? "Passed" : "Completed") : expired ? "Invitation expired" : !actionable ? "Unavailable" : data.canRetry ? "Retry available" : "Ready to start"} sx={{ bgcolor: "#F1EAF9", color: P, fontSize: 11, fontWeight: 700 }} />
                      </Box>
                      <Typography sx={{ fontSize: 14, color: muted, lineHeight: 1.65 }}>
                        {data.currentAttempt?.isFinal
                          ? `Your final score is ${data.currentAttempt.score}/10. ${data.currentAttempt.passed ? "You met the passing criteria." : "The passing criteria were not met."}`
                          : expired ? "This invitation has expired. Contact HR or your administrator for a new invitation."
                          : !eligible ? "No valid invitation is available. Contact HR for assistance."
                          : !actionable ? "This assessment is not currently available to start. Contact HR for assistance."
                          : data.canRetry && data.currentAttempt ? `You scored ${data.currentAttempt.score}/10 on your first attempt. One second attempt is available with the same questions.`
                          : "Your assessment is ready. Open it to review the instructions and begin."}
                      </Typography>
                      {data.currentAttempt?.isFinal && !eligible && (
                        <Typography sx={{ mt: 1, fontSize: 13, color: muted }}>
                          {expired ? "Your invitation has expired." : "No valid invitation is available."} Contact HR to access the result review. Your issued certificates remain available below.
                        </Typography>
                      )}
                      {invitation && Number.isFinite(expiresAt) && !data.currentAttempt?.isFinal && (
                        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "flex-start", color: muted }}>
                          <CalendarTodayOutlined sx={{ fontSize: 16, mt: "2px" }} />
                          <Typography sx={{ fontSize: 12 }}>
                            Invitation {expired ? "expired" : "expires"}{" "}
                            <Box component="time" dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</Box>
                          </Typography>
                        </Stack>
                      )}
                      {(actionable || (eligible && data.currentAttempt?.isFinal)) && (
                        <Button component={Link} href="/assessment" prefetch={false} variant="contained" endIcon={<ArrowForward />} sx={{ mt: 2.5, width: { xs: "100%", sm: "auto" } }}>
                          {data.currentAttempt?.isFinal ? "View Result" : data.canRetry ? "Start Second Attempt" : "Start Assessment"}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Card>

            <Card component="section" aria-labelledby="history-heading" sx={surface}>
              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Typography id="history-heading" component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>Certificates & results</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: muted }}>Your recent achievements, including previous assessment cycles.</Typography>
                </Box>
                <Button component={Link} href="/certificates" endIcon={<ArrowForward sx={{ fontSize: 16 }} />} size="small">View all</Button>
              </Box>
              <Divider />
              {data.certificates.length === 0 ? (
                <EmptyState icon={<WorkspacePremiumOutlined />} title="No certificates yet" text="Pass an assessment to earn a certificate. Your issued certificates will appear here." />
              ) : (
                <Stack divider={<Divider />}>
                  {data.certificates.slice(0, 3).map(cert => <CertificateRow key={cert.id} cert={cert} />)}
                </Stack>
              )}
              <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 1.5, bgcolor: "#FCFBFE", display: "flex", gap: 1, alignItems: "center", borderTop: "1px solid #EEEAF3" }}>
                <HistoryOutlined sx={{ color: muted, fontSize: 16 }} />
                <Typography sx={{ fontSize: 12, color: muted }}>Previously issued certificates remain available after a cycle closes.</Typography>
              </Box>
            </Card>
          </Stack>
        ) : null}
      </Container>
    </Box>
  );
}

function Metric({ label, value, caption, icon }: { label: string; value: number; caption: string; icon: React.ReactNode }) {
  return (
    <Card sx={{ ...surface, p: 2.5, display: "flex", gap: 2, alignItems: "center" }}>
      <Box sx={iconBox}>{icon}</Box>
      <Box>
        <Typography sx={{ color: muted, fontSize: 12, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 28, lineHeight: 1.35, fontWeight: 750, color: P }}>{value}</Typography>
        <Typography sx={{ color: muted, fontSize: 11 }}>{caption}</Typography>
      </Box>
    </Card>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ p: { xs: 2.5, sm: 3 }, alignItems: "flex-start" }}>
      <Box sx={iconBox}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, lineHeight: 1.65, color: muted, maxWidth: 540 }}>{text}</Typography>
      </Box>
    </Stack>
  );
}

function CertificateRow({ cert }: { cert: CertificateItem }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(`/api/certificates/${encodeURIComponent(cert.certificateNumber)}`);
      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session may have expired or access is unavailable. Sign in again to download your certificate.");
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error("Unable to download this certificate. Please try again. If the problem continues, contact HR.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `SEBSA_Certificate_${cert.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow the browser to consume the URL before releasing it; loading follows the request.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause: unknown) {
      setError(cause instanceof Error && cause.message !== "Failed to fetch"
        ? cause.message
        : "Unable to download this certificate. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2, "&:hover": { bgcolor: "#FCFBFE" } }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <Box sx={iconBox}><WorkspacePremiumOutlined sx={{ fontSize: 22 }} /></Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{cert.cycleLabel || "SEBSA Assessment Certificate"}</Typography>
            <Typography sx={{ fontSize: 12, color: muted, mt: 0.5 }}>
              Issued <Box component="time" dateTime={cert.issuedAt}>{dateLabel(cert.issuedAt)}</Box>
              {cert.score !== null && ` · Score ${cert.score}/10`}
            </Typography>
          </Box>
        </Stack>
        <Button onClick={download} disabled={downloading} aria-label={`${downloading ? "Downloading" : "Download PDF"} for ${cert.cycleLabel || "SEBSA assessment"}, certificate ${cert.certificateNumber}`} startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlined />} variant="outlined" size="small" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}>
          {downloading ? "Downloading…" : "Download PDF"}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Box role="status" aria-label="Loading your dashboard">
      <Typography sx={{ fontSize: 14, color: muted, mb: 2 }}>Loading your dashboard…</Typography>
      <Skeleton variant="rounded" width="60%" height={36} sx={{ mb: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
        {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={112} />)}
      </Box>
      <Skeleton variant="rounded" height={220} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={220} />
    </Box>
  );
}
