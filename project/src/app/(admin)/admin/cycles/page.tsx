"use client";

import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { CalendarTodayOutlined, SendOutlined } from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface Cycle {
  id: string;
  label: string;
  status: "active" | "closed";
  openedAt: string;
  closedAt: string | null;
  passingScore: number;
}

interface SendResult {
  cycleId: string;
  label: string;
  emailsSent: number;
  emailsFailed: number;
}

export default function AdminCyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [passingScore, setPassingScore] = useState("8");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    async function load() {
      await fetchCycles();
      setLoading(false);
    }
    load();
  }, []);

  async function fetchCycles() {
    const res = await fetch("/api/cycles");
    const json = await res.json();
    if (json.success) setCycles(json.data.slice().reverse());
  }

  async function handleSend() {
    if (!label.trim()) {
      setSendError("Please enter a cycle label (e.g. 2026 H2).");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), passingScore: Number(passingScore) }),
      });
      const json = await res.json();
      if (!json.success) {
        setSendError(json.error || "Failed to send assessment.");
        return;
      }
      setSendResult(json.data);
      await fetchCycles();
      setDialogOpen(false);
      setLabel("");
    } catch {
      setSendError("Network error.");
    } finally {
      setSending(false);
    }
  }

  const activeCycle = cycles.find((c) => c.status === "active");

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Send Assessment
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted }}>
            Create a new cycle and email all active employees
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SendOutlined />}
          onClick={() => { setDialogOpen(true); setLabel(""); setPassingScore("8"); setSendError(""); }}
          sx={{ px: 2.5, alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          Send New Assessment
        </Button>
      </Stack>

      {sendResult && (
        <Alert severity="success" onClose={() => setSendResult(null)} sx={{ mb: 2 }}>
          Assessment "{sendResult.label}" sent! {sendResult.emailsSent} invitation{sendResult.emailsSent !== 1 ? "s" : ""} sent
          {sendResult.emailsFailed > 0 ? ` (${sendResult.emailsFailed} failed)` : ""}.
        </Alert>
      )}

      {/* Current active cycle */}
      {activeCycle ? (
        <Card sx={{ borderRadius: 2, mb: 3, border: `1px solid ${P}30`, bgcolor: `${P}06` }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: `${P}15`, color: P, display: "grid", placeItems: "center" }}>
                  <CalendarTodayOutlined />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>
                    {activeCycle.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: colors.muted }}>
                    Opened {new Date(activeCycle.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </Typography>
                </Box>
              </Stack>
              <Chip label="Active" color="success" sx={{ fontWeight: 700, alignSelf: "flex-start" }} />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No active assessment cycle. Use "Send New Assessment" to open one and invite all employees.
        </Alert>
      )}

      {/* Cycle history */}
      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
          <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>Cycle History</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cycle Label</TableCell>
                <TableCell>Pass Mark</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell>Closed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                    No cycles yet. Send the first assessment to get started.
                  </TableCell>
                </TableRow>
              ) : (
                cycles.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {c.passingScore ?? 8} / 10
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.status}
                        color={c.status === "active" ? "success" : "default"}
                        size="small"
                        sx={{ textTransform: "capitalize", fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted }}>
                        {new Date(c.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted }}>
                        {c.closedAt
                          ? new Date(c.closedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Send Assessment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send New Assessment</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: 13.5 }}>
            This creates a new assessment cycle and sends an invitation email to all active employees.
            Each employee will see the assessment as pending in their dashboard.
          </DialogContentText>
          {sendError && <Alert severity="error" sx={{ mb: 2 }}>{sendError}</Alert>}
          <TextField
            label="Cycle Label"
            placeholder="e.g. 2026 H2"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            helperText="Use the format YYYY H1 or YYYY H2 (e.g. 2027 H1)"
          />
          <TextField
          label="Passing Score (out of 10)"
          type="number"
          fullWidth
          value={passingScore}
          onChange={(e) => setPassingScore(e.target.value)}
          slotProps={{ htmlInput: { min: 0, max: 10, step: 1 } }}
          sx={{ mt: 2 }}
          helperText="Employees meet the requirement when their score is at least this value."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSend} variant="contained" disabled={sending} startIcon={<SendOutlined />}>
            {sending ? "Sending…" : "Send Assessment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
