"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  BlockOutlined,
  CalendarTodayOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  ExpandLess,
  ExpandMore,
  GroupsOutlined,
  MailOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  SendOutlined,
  SortOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P   = colors.primary;
const SUC = colors.success;
const ERR = colors.error;

const MONTHS = [
  { value: "1",  label: "January" },
  { value: "2",  label: "February" },
  { value: "3",  label: "March" },
  { value: "4",  label: "April" },
  { value: "5",  label: "May" },
  { value: "6",  label: "June" },
  { value: "7",  label: "July" },
  { value: "8",  label: "August" },
  { value: "9",  label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

interface AssessmentRecord {
  id:                   string;
  label:                string;
  status:               "active" | "closed" | "deactivated";
  openedAt:             string;
  closedAt:             string | null;
  deactivatedAt:        string | null;
  passingScore:         number;
  recipients:           number;
  emailsSent:           number;
  emailsFailed:         number;
  expiredInvitations:   number;
  started:              number;
  completed:            number;
  passed:               number;
  failed:               number;
  passRate:             number;
  invitationExpiryDays: number;
}

interface RecipientRow {
  employeeId:       string;
  employeeName:     string;
  employeeEmail:    string;
  invitationStatus: string;
  emailStatus:      string;
  emailError:       string | null;
  sentAt:           string;
  expiresAt:        string;
  resentAt:         string | null;
  attemptCount:     number;
  latestScore:      number | null;
  latestPassed:     boolean | null;
  submittedAt:      string | null;
  passFail:         "Pass" | "Fail" | "Retry Available" | "In Progress" | "Not Started";
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Status chip ────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  if (status === "active")
    return <Chip label="Active" color="success" size="small" sx={{ fontWeight: 700, textTransform: "capitalize" }} />;
  if (status === "deactivated")
    return <Chip label="Deactivated" size="small" sx={{ fontWeight: 700, bgcolor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }} />;
  return <Chip label="Closed" size="small" sx={{ fontWeight: 700 }} />;
}

function PassFailChip({ value }: { value: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    "Pass":            { label: "Pass",            bg: "#ECFDF5", fg: SUC },
    "Fail":            { label: "Fail",            bg: "#FEF2F2", fg: ERR },
    "Retry Available": { label: "Retry",           bg: "#FEF3C7", fg: "#B45309" },
    "In Progress":     { label: "In Progress",     bg: `${P}15`,  fg: P },
    "Not Started":     { label: "Not Started",     bg: "#F3F4F6", fg: "#6B7280" },
  };
  const s = map[value] ?? map["Not Started"];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ fontWeight: 700, fontSize: "0.7rem", bgcolor: s.bg, color: s.fg }}
    />
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────
export default function AdminAssessmentsPage() {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterMode,   setFilterMode]   = useState<"monthYear" | "dateRange" | "">("");
  const [month,        setMonth]        = useState("");
  const [year,         setYear]         = useState("");
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy,       setSortBy]       = useState("openedAt");
  const [sortOrder,    setSortOrder]    = useState<"asc" | "desc">("desc");

  // ── Pagination / data state ─────────────────────────────────────────────────
  const [page,    setPage]    = useState(1);
  const [limit]               = useState(10);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [pag,     setPag]     = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Expand / recipients ─────────────────────────────────────────────────────
  const [expandedId,         setExpandedId]         = useState<string | null>(null);
  const [recipients,         setRecipients]         = useState<Record<string, RecipientRow[]>>({});
  const [loadingRecipients,  setLoadingRecipients]  = useState<Record<string, boolean>>({});
  const [recipientError,     setRecipientError]     = useState<Record<string, string>>({});

  // ── Deactivate / reactivate dialog ─────────────────────────────────────────
  const [actionTarget,  setActionTarget]  = useState<AssessmentRecord | null>(null);
  const [actionType,    setActionType]    = useState<"deactivate" | "reactivate">("deactivate");
  const [actioning,     setActioning]     = useState(false);
  const [actionError,   setActionError]   = useState("");

  // ── Send new assessment dialog ──────────────────────────────────────────────
  const [sendOpen,     setSendOpen]     = useState(false);
  const [sendLabel,    setSendLabel]    = useState("");
  const [sendScore,    setSendScore]    = useState("8");
  const [sendBusy,     setSendBusy]     = useState(false);
  const [sendError,    setSendError]    = useState("");
  const [sendSuccess,  setSendSuccess]  = useState("");

  // ── Fetch records ───────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (search)       sp.set("search",      search);
      if (statusFilter) sp.set("status",      statusFilter);
      if (sortBy)       sp.set("sortBy",      sortBy);
      if (sortOrder)    sp.set("sortOrder",   sortOrder);
      sp.set("page",  String(page));
      sp.set("limit", String(limit));

      if (filterMode === "monthYear") {
        if (month) sp.set("month", month);
        if (year)  sp.set("year",  year);
      } else if (filterMode === "dateRange") {
        if (startDate) sp.set("startDate", startDate);
        if (endDate)   sp.set("endDate",   endDate);
      }

      const res  = await fetch(`/api/admin/assessments?${sp.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
        setPag(json.pagination);
      } else {
        setError(json.error ?? "Failed to load assessments.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [search, filterMode, month, year, startDate, endDate, statusFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterMode, month, year, startDate, endDate, statusFilter, sortBy, sortOrder]);

  // ── Toggle recipient detail ─────────────────────────────────────────────────
  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (recipients[id]) return; // already loaded

    setLoadingRecipients((p) => ({ ...p, [id]: true }));
    try {
      const res  = await fetch(`/api/admin/assessments/${id}/recipients`);
      const json = await res.json();
      if (json.success) {
        setRecipients((p) => ({ ...p, [id]: json.data }));
      } else {
        setRecipientError((p) => ({ ...p, [id]: json.error ?? "Failed to load recipients." }));
      }
    } catch {
      setRecipientError((p) => ({ ...p, [id]: "Network error." }));
    } finally {
      setLoadingRecipients((p) => ({ ...p, [id]: false }));
    }
  }

  // ── Deactivate / reactivate ─────────────────────────────────────────────────
  async function handleAction() {
    if (!actionTarget) return;
    setActioning(true);
    setActionError("");
    try {
      const res  = await fetch(`/api/admin/cycles/${actionTarget.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: actionType }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error ?? "Action failed.");
        return;
      }
      // Refresh list, reset recipient cache for this cycle
      setRecipients((p) => { const n = { ...p }; delete n[actionTarget.id]; return n; });
      await fetchRecords();
      setActionTarget(null);
    } catch {
      setActionError("Network error.");
    } finally {
      setActioning(false);
    }
  }

  async function handleSend() {
    if (!sendLabel.trim()) { setSendError("Please enter a cycle label (e.g. 2026 H2)."); return; }
    setSendBusy(true);
    setSendError("");
    try {
      const res  = await fetch("/api/cycles", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ label: sendLabel.trim(), passingScore: Number(sendScore) }),
      });
      const json = await res.json();
      if (!json.success) { setSendError(json.error || "Failed to send assessment."); return; }
      const d = json.data as { label: string; emailsSent: number; emailsFailed: number };
      setSendSuccess(
        `Assessment "${d.label}" sent! ${d.emailsSent} invitation${d.emailsSent !== 1 ? "s" : ""} sent` +
        (d.emailsFailed > 0 ? ` (${d.emailsFailed} failed)` : "") + "."
      );
      setSendOpen(false);
      setSendLabel("");
      setSendScore("8");
      await fetchRecords();
    } catch {
      setSendError("Network error.");
    } finally {
      setSendBusy(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setFilterMode("");
    setMonth("");
    setYear("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("");
    setSortBy("openedAt");
    setSortOrder("desc");
  }

  const hasFilters = search || filterMode || statusFilter || sortBy !== "openedAt" || sortOrder !== "desc";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      {/* Page header */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Send Assessments
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: { xs: 13, sm: 14 }, color: colors.muted }}>
            Send a new assessment cycle or browse history — filter by date, status, or name
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SendOutlined />}
          onClick={() => { setSendOpen(true); setSendLabel(""); setSendScore("8"); setSendError(""); }}
          sx={{ px: 2.5, alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
        >
          Send New Assessment
        </Button>
      </Stack>

      {sendSuccess && (
        <Alert severity="success" onClose={() => setSendSuccess("")} sx={{ mb: 2 }}>{sendSuccess}</Alert>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 2, mb: 3, p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          {/* Row 1: search + status + sort */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Search cycle name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined sx={{ fontSize: 18, color: colors.muted }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch("")}><ClearOutlined sx={{ fontSize: 16 }} /></IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{ width: { xs: "100%", sm: 260 } }}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="deactivated">Deactivated</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel><SortOutlined sx={{ fontSize: 16, mr: 0.5 }} />Sort by</InputLabel>
              <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="openedAt">Date sent</MenuItem>
                <MenuItem value="label">Cycle name</MenuItem>
                <MenuItem value="passRate">Pass rate</MenuItem>
                <MenuItem value="recipients">Recipients</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Order</InputLabel>
              <Select label="Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}>
                <MenuItem value="desc">Newest first</MenuItem>
                <MenuItem value="asc">Oldest first</MenuItem>
              </Select>
            </FormControl>

            {hasFilters && (
              <Button size="small" onClick={clearFilters} sx={{ color: colors.muted, fontWeight: 600, minWidth: 0 }}>
                Clear all
              </Button>
            )}
          </Stack>

          {/* Row 2: date filter mode picker */}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: colors.muted }}>Filter by date:</Typography>
            {[
              { val: "" as const,          label: "None" },
              { val: "monthYear" as const, label: "Month / Year" },
              { val: "dateRange" as const, label: "Custom range" },
            ].map((opt) => (
              <Chip
                key={opt.val}
                label={opt.label}
                size="small"
                onClick={() => setFilterMode(opt.val)}
                sx={{
                  fontWeight: 600,
                  bgcolor: filterMode === opt.val ? P : undefined,
                  color:   filterMode === opt.val ? "#fff" : undefined,
                  cursor: "pointer",
                }}
              />
            ))}
          </Stack>

          {/* Month/Year pickers */}
          {filterMode === "monthYear" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Month</InputLabel>
                <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  <MenuItem value="">Any month</MenuItem>
                  {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
                  <MenuItem value="">Any year</MenuItem>
                  {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          )}

          {/* Custom date range */}
          {filterMode === "dateRange" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                type="date"
                label="From"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: { xs: "100%", sm: 180 } }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: { xs: "100%", sm: 180 } }}
              />
            </Stack>
          )}
        </Stack>
      </Card>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
          <Stack spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={30} />
            <Typography variant="body2" color="text.secondary">Loading assessment history…</Typography>
          </Stack>
        </Box>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && records.length === 0 && !error && (
        <Alert severity="info">
          {hasFilters
            ? "No assessment cycles match your filters."
            : "No assessment cycles found. Use \"Send New Assessment\" to create the first one."}
        </Alert>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {!loading && (
        <>
          {pag && pag.total > 0 && (
            <Typography sx={{ fontSize: 12.5, color: colors.muted, mb: 1.5 }}>
              Showing {(pag.page - 1) * pag.limit + 1}–{Math.min(pag.page * pag.limit, pag.total)} of {pag.total} cycle{pag.total !== 1 ? "s" : ""}
            </Typography>
          )}

          <Stack spacing={2.5}>
            {records.map((r) => (
              <CycleCard
                key={r.id}
                r={r}
                expanded={expandedId === r.id}
                onToggle={() => toggleExpand(r.id)}
                recipientRows={recipients[r.id] ?? null}
                loadingRecipients={!!loadingRecipients[r.id]}
                recipientError={recipientError[r.id] ?? ""}
                onDeactivate={() => { setActionType("deactivate"); setActionTarget(r); setActionError(""); }}
                onReactivate={() => { setActionType("reactivate"); setActionTarget(r); setActionError(""); }}
              />
            ))}
          </Stack>

          {/* ── Pagination ───────────────────────────────────────────────── */}
          {pag && pag.totalPages > 1 && (
            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={pag.totalPages}
                page={pag.page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}

      {/* ── Send New Assessment dialog ────────────────────────────────────── */}
      <Dialog open={sendOpen} onClose={() => !sendBusy && setSendOpen(false)} maxWidth="xs" fullWidth>
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
            value={sendLabel}
            onChange={(e) => setSendLabel(e.target.value)}
            helperText="Use the format YYYY H1 or YYYY H2 (e.g. 2027 H1)"
          />
          <TextField
            label="Passing Score (out of 10)"
            type="number"
            fullWidth
            value={sendScore}
            onChange={(e) => setSendScore(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 10, step: 1 } }}
            sx={{ mt: 2 }}
            helperText="Employees meet the requirement when their score is at least this value."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendOpen(false)} color="inherit" disabled={sendBusy}>Cancel</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sendBusy}
            startIcon={sendBusy ? <CircularProgress size={16} color="inherit" /> : <SendOutlined />}
          >
            {sendBusy ? "Sending…" : "Send Assessment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Deactivate / Reactivate confirmation dialog ────────────────────── */}
      <Dialog open={!!actionTarget} onClose={() => !actioning && setActionTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: actionType === "deactivate" ? ERR : SUC }}>
          {actionType === "deactivate" ? "Deactivate Assessment?" : "Reactivate Assessment?"}
        </DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          <DialogContentText>
            {actionType === "deactivate" ? (
              <>
                This will <strong>immediately prevent</strong> all employees from starting or submitting{" "}
                <strong>{actionTarget?.label}</strong>. Existing attempts, scores, and certificates are preserved.
                <br /><br />
                Employees with pending invitations will no longer be able to use them.
              </>
            ) : (
              <>
                This will reactivate <strong>{actionTarget?.label}</strong> and make it the active assessment cycle.
                Employees with unexpired invitations will be able to access it again.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)} color="inherit" disabled={actioning}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType === "deactivate" ? "error" : "success"}
            onClick={handleAction}
            disabled={actioning}
          >
            {actioning ? "Processing…" : actionType === "deactivate" ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ── CycleCard ──────────────────────────────────────────────────────────────────
function CycleCard({
  r, expanded, onToggle, recipientRows, loadingRecipients, recipientError, onDeactivate, onReactivate,
}: {
  r: AssessmentRecord;
  expanded: boolean;
  onToggle: () => void;
  recipientRows: RecipientRow[] | null;
  loadingRecipients: boolean;
  recipientError: string;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const C = sebsaColors;
  const borderColor = r.status === "active" ? `${P}30` : r.status === "deactivated" ? "#FDE68A" : undefined;

  return (
    <Card sx={{ borderRadius: 2, border: borderColor ? `1px solid ${borderColor}` : undefined }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: `${P}15`, color: P, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <CalendarTodayOutlined />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: C.muted }}>
                Sent {new Date(r.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                {r.deactivatedAt && ` · Deactivated ${new Date(r.deactivatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                {r.closedAt && !r.deactivatedAt && ` · Closed ${new Date(r.closedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                {" "}· Pass mark {r.passingScore}/10 · Invitations expire {r.invitationExpiryDays} days after send
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
            <StatusChip status={r.status} />
            {r.status === "active" && (
              <Tooltip title="Deactivate this assessment cycle">
                <IconButton size="small" color="error" onClick={onDeactivate}>
                  <BlockOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {r.status === "deactivated" && (
              <Tooltip title="Reactivate this assessment cycle">
                <IconButton size="small" color="success" onClick={onReactivate}>
                  <PlayCircleOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* Stats grid */}
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }, gap: 2 }}>
        {[
          { icon: <GroupsOutlined />,       label: "Recipients",  value: r.recipients,          color: P },
          { icon: <MailOutlined />,          label: "Emails Sent", value: r.emailsSent,          color: P },
          { icon: <MailOutlined />,          label: "Failed",      value: r.emailsFailed,        color: r.emailsFailed   > 0 ? ERR : C.muted },
          { icon: <CalendarTodayOutlined />, label: "Expired",     value: r.expiredInvitations,  color: r.expiredInvitations > 0 ? "#B45309" : C.muted },
          { icon: <CheckCircleOutlined />,   label: "Completed",   value: r.completed,           color: SUC },
          {
            icon: <CheckCircleOutlined />,
            label: "Pass Rate",
            value: `${r.passRate}%`,
            color: r.passRate >= 70 ? SUC : ERR,
            sub: `${r.passed} passed · ${r.failed} failed`,
          },
        ].map((s) => (
          <Box key={s.label}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", mb: 0.5 }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, color: s.color }}>
              {s.value}
            </Typography>
            {"sub" in s && s.sub && (
              <Typography sx={{ fontSize: 11, color: C.muted }}>{s.sub as string}</Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* Completion progress */}
      {r.recipients > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 1.5 }}>
          <Typography sx={{ fontSize: 11.5, color: C.muted, mb: 0.75 }}>
            Completion: {r.completed} / {r.recipients} ({Math.round((r.completed / r.recipients) * 100)}%)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.round((r.completed / r.recipients) * 100)}
            sx={{ height: 5, borderRadius: 3, bgcolor: `${P}15`, "& .MuiLinearProgress-bar": { bgcolor: P } }}
          />
        </Box>
      )}

      {/* View recipients toggle */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
        <Button
          size="small"
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          onClick={onToggle}
          sx={{ fontWeight: 600, fontSize: 12.5, color: P }}
        >
          {expanded ? "Hide recipients" : `View ${r.recipients} recipient${r.recipients !== 1 ? "s" : ""}`}
        </Button>
      </Box>

      {/* Recipient detail */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
          {loadingRecipients && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {recipientError && <Alert severity="error" sx={{ mx: 1 }}>{recipientError}</Alert>}
          {recipientRows && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Invitation</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Expiry</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Attempts</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Score</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recipientRows.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: `${P}18`, color: P }}>
                            {row.employeeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.employeeName}</Typography>
                            <Typography sx={{ fontSize: 11, color: colors.muted }}>{row.employeeEmail}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <InvStatusChip status={row.invitationStatus} emailStatus={row.emailStatus} emailError={row.emailError} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>
                          {new Date(row.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </Typography>
                        {row.resentAt && (
                          <Typography sx={{ fontSize: 10.5, color: colors.muted }}>
                            Resent {new Date(row.resentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12 }}>{row.attemptCount}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {row.latestScore !== null ? `${row.latestScore}/10` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <PassFailChip value={row.passFail} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

function InvStatusChip({ status, emailStatus, emailError }: { status: string; emailStatus: string; emailError?: string | null }) {
  const map: Record<string, { label: string; color: "default" | "success" | "error" | "warning" | "info" }> = {
    pending:   { label: "Pending",   color: "default" },
    opened:    { label: "Opened",    color: "info" },
    completed: { label: "Completed", color: "success" },
    resent:    { label: "Resent",    color: "warning" },
    expired:   { label: "Expired",   color: "error" },
  };
  const s = map[status] ?? { label: status, color: "default" as const };
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Chip label={s.label} color={s.color} size="small" sx={{ fontSize: "0.65rem", fontWeight: 700 }} />
      {emailStatus === "failed" && (
        <Tooltip title={emailError ?? "Email delivery failed"} placement="top" arrow>
          <Chip label="Email failed" color="error" variant="outlined" size="small" sx={{ fontSize: "0.6rem", cursor: "help" }} />
        </Tooltip>
      )}
    </Stack>
  );
}
