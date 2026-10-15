"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  BugReportOutlined,
  DeleteOutlined,
  PlayArrowOutlined,
  RefreshOutlined,
  SecurityOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface AttemptStatus {
  activeCycle: { id: string; label: string; status: string } | null;
  attempt: { id: string; score: number; submittedAt: string } | null;
}

interface UserSession {
  fullName: string;
  email: string;
  role: string;
}

export default function DevPanelPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [status, setStatus] = useState<AttemptStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProduction, setIsProduction] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    // NEXT_PUBLIC_* variables are available on the client
    const env = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV;
    // In production, still show the page but in locked-down mode
    // The actual protection is server-side in /api/dev/* endpoints
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      // Check auth
      const authRes = await fetch("/api/auth");
      const authJson = await authRes.json();
      if (!authJson.success) {
        router.push("/login");
        return;
      }
      setUser(authJson.data.user);

      // If employee, fetch attempt status
      if (authJson.data.user.role === "employee") {
        const statusRes = await fetch("/api/dev/reset-attempt");
        const statusJson = await statusRes.json();
        if (statusJson.success) {
          setStatus(statusJson.data);
        } else if (statusRes.status === 403 && statusJson.error?.includes("production")) {
          setIsProduction(true);
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAttempt() {
    setConfirmResetOpen(false);
    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dev/reset-attempt", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        await load();
      } else {
        setMessage({ text: json.error || "Reset failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error during reset.", type: "error" });
    } finally {
      setResetting(false);
    }
  }

  async function handleNewCycle() {
    setCreatingCycle(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dev/new-cycle", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.data.message, type: "success" });
        await load();
      } else {
        setMessage({ text: json.error || "Failed to create cycle.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error.", type: "error" });
    } finally {
      setCreatingCycle(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0D0D0D" }}>
        <CircularProgress size={30} sx={{ color: "#6343D8" }} />
      </Box>
    );
  }

  if (isProduction) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0D0D0D" }}>
        <Box sx={{ maxWidth: 420, textAlign: "center", p: 3 }}>
          <SecurityOutlined sx={{ fontSize: 56, color: "#EF4444", mb: 2 }} />
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#fff", mb: 1 }}>
            Not Available in Production
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#999" }}>
            The developer testing panel is disabled in the production environment. This is enforced both server-side and client-side.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0D0D0D", color: "#E8E8E8" }}>
      {/* Dark dev header */}
      <Box sx={{ bgcolor: "#1A1A2E", borderBottom: "1px solid #2A2A4A", px: { xs: 2, sm: 4 }, py: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <BugReportOutlined sx={{ color: "#6343D8", fontSize: 22 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#E0DDFF" }}>
            SEBSA Dev Testing Panel
          </Typography>
          <Chip label="DEV ONLY" size="small" sx={{ bgcolor: "#EF444425", color: "#EF4444", fontWeight: 800, fontSize: 10, border: "1px solid #EF444445" }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => router.push("/dashboard")} sx={{ color: "#888", fontSize: 12, textTransform: "none" }}>
            ← Back to App
          </Button>
        </Stack>
      </Box>

      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}>
        {/* Warning banner */}
        <Alert
          icon={<WarningAmberOutlined />}
          severity="warning"
          sx={{ mb: 3, bgcolor: "#2A1F00", color: "#FFB74D", border: "1px solid #664D00" }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Developer Only — Not for Production Use</Typography>
          <Typography sx={{ fontSize: 12, mt: 0.25 }}>
            These tools reset test data. Certificates are never deleted. The dev APIs return 403 in production.
          </Typography>
        </Alert>

        {message && (
          <Alert
            severity={message.type}
            onClose={() => setMessage(null)}
            sx={{ mb: 2, ...(message.type === "success" ? { bgcolor: "#003322", color: "#4ADE80", border: "1px solid #144D2A" } : {}) }}
          >
            {message.text}
          </Alert>
        )}

        {/* Session info */}
        <Card sx={{ mb: 2, bgcolor: "#151520", border: "1px solid #252540", borderRadius: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: ".1em", textTransform: "uppercase", mb: 1.5 }}>
              Current Session
            </Typography>
            <Stack spacing={0.75}>
              {[
                ["User", user?.fullName ?? "—"],
                ["Email", user?.email ?? "—"],
                ["Role", user?.role ?? "—"],
                ["Environment", "development"],
              ].map(([label, val]) => (
                <Stack key={label} direction="row" spacing={1.5}>
                  <Typography sx={{ fontSize: 12, color: "#666", width: 80, flexShrink: 0 }}>{label}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#C8C8FF", fontFamily: "monospace" }}>{val}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Assessment status */}
        {user?.role === "employee" && (
          <Card sx={{ mb: 2, bgcolor: "#151520", border: "1px solid #252540", borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: ".1em", textTransform: "uppercase", mb: 1.5 }}>
                Assessment Status (Active Cycle)
              </Typography>
              {status?.activeCycle ? (
                <Stack spacing={0.75}>
                  {[
                    ["Cycle", status.activeCycle.label],
                    ["Cycle ID", status.activeCycle.id],
                    ["Cycle Status", status.activeCycle.status],
                    ["Attempt", status.attempt ? `Submitted — Score ${status.attempt.score}/10` : "Not submitted"],
                    ...(status.attempt ? [["Submitted At", new Date(status.attempt.submittedAt).toLocaleString()]] : []),
                  ].map(([label, val]) => (
                    <Stack key={label} direction="row" spacing={1.5}>
                      <Typography sx={{ fontSize: 12, color: "#666", width: 100, flexShrink: 0 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 12, color: "#C8C8FF", fontFamily: "monospace" }}>{val}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 13, color: "#666" }}>No active cycle found.</Typography>
              )}
            </CardContent>
          </Card>
        )}

        <Divider sx={{ my: 3, borderColor: "#252540" }} />

        {/* Actions */}
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: ".1em", textTransform: "uppercase", mb: 2 }}>
          Test Actions
        </Typography>

        <Stack spacing={2}>
          {/* Reset attempt */}
          {user?.role === "employee" && (
            <Card sx={{ bgcolor: "#1A0D0D", border: "1px solid #3A1515", borderRadius: 2 }}>
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }} spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#FFB3B3" }}>
                      Reset My Test Attempt
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#888", mt: 0.5 }}>
                      Deletes your attempt for the active cycle so you can retake the quiz. Your certificate record is preserved.
                    </Typography>
                    {!status?.attempt && (
                      <Typography sx={{ fontSize: 11.5, color: "#4ADE80", mt: 0.5 }}>
                        ✓ No attempt on record — you can already start fresh.
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlined />}
                    disabled={resetting || !status?.attempt}
                    onClick={() => setConfirmResetOpen(true)}
                    sx={{ borderColor: "#EF444450", color: "#EF4444", whiteSpace: "nowrap", flexShrink: 0, "&:hover": { borderColor: "#EF4444", bgcolor: "#EF444415" } }}
                  >
                    {resetting ? "Resetting…" : "Reset Attempt"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Create new test cycle */}
          <Card sx={{ bgcolor: "#0D1A0D", border: "1px solid #153A15", borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }} spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#B3FFB3" }}>
                    Create New Test Cycle
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#888", mt: 0.5 }}>
                    Creates a fresh assessment cycle with a timestamped label. All employees can submit against the new cycle.
                    Does not close existing cycles.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<RefreshOutlined />}
                  disabled={creatingCycle}
                  onClick={handleNewCycle}
                  sx={{ borderColor: "#22C55E50", color: "#22C55E", whiteSpace: "nowrap", flexShrink: 0, "&:hover": { borderColor: "#22C55E", bgcolor: "#22C55E15" } }}
                >
                  {creatingCycle ? "Creating…" : "New Cycle"}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Start assessment shortcut */}
          {user?.role === "employee" && (
            <Card sx={{ bgcolor: "#0D0D1A", border: "1px solid #15153A", borderRadius: 2 }}>
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }} spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#C8C8FF" }}>
                      Start Assessment
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#888", mt: 0.5 }}>
                      Navigate to the assessment page to begin or retake the quiz.
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrowOutlined />}
                    onClick={() => router.push("/assessment")}
                    sx={{ borderColor: `${P}50`, color: P, whiteSpace: "nowrap", flexShrink: 0, "&:hover": { borderColor: P, bgcolor: `${P}15` } }}
                  >
                    Go to Assessment
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>

        {/* Quick links */}
        <Divider sx={{ my: 3, borderColor: "#252540" }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: ".1em", textTransform: "uppercase", mb: 1.5 }}>
          Quick Navigation
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {[
            { label: "Dashboard", href: "/dashboard", roles: ["employee"] },
            { label: "Assessment", href: "/assessment", roles: ["employee"] },
            { label: "Certificates", href: "/certificates", roles: ["employee"] },
            { label: "Admin Tracker", href: "/admin/tracker", roles: ["admin"] },
            { label: "Admin Employees", href: "/admin/employees", roles: ["admin"] },
            { label: "Question Bank", href: "/admin/questions", roles: ["admin"] },
            { label: "Send Assessment", href: "/admin/cycles", roles: ["admin"] },
            { label: "Login", href: "/login", roles: ["employee", "admin"] },
          ]
            .filter((l) => l.roles.includes(user?.role ?? ""))
            .map((link) => (
              <Box
                key={link.href}
                component="a"
                href={link.href}
                sx={{ px: 1.5, py: 0.6, borderRadius: 1, fontSize: 12, fontWeight: 500, color: "#888", border: "1px solid #252540", textDecoration: "none", "&:hover": { color: "#C8C8FF", borderColor: "#3A3A6A" } }}
              >
                {link.label}
              </Box>
            ))}
        </Stack>
      </Container>

      {/* Confirm Reset Dialog */}
      <Dialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        sx={{ "& .MuiDialog-paper": { bgcolor: "#1A1A2E", border: "1px solid #2A2A4A" } }}
      >
        <DialogTitle sx={{ color: "#FFB3B3" }}>Confirm Test Attempt Reset</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#AAAACC" }}>
            This will delete your attempt for cycle{" "}
            <Box component="strong" sx={{ color: "#E0DDFF" }}>
              {status?.activeCycle?.label ?? "the active cycle"}
            </Box>
            . You will be able to retake the quiz.
          </DialogContentText>
          <DialogContentText sx={{ color: "#888", fontSize: 13, mt: 1.5 }}>
            Your certificate record will NOT be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetOpen(false)} sx={{ color: "#888" }}>Cancel</Button>
          <Button onClick={handleResetAttempt} color="error" variant="contained">
            Reset Attempt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
