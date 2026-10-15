"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
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
import {
  CheckCircleOutlined,
  FilterListOff,
  GroupsOutlined,
  PendingActionsOutlined,
  SearchOutlined,
  EmojiEventsOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P   = colors.primary;
const SUC = colors.success;
const ERR = colors.error;

type PassFail     = "Pass" | "Fail" | "Pending" | "Retry Available" | "Not Started";
type ResultFilter = "all" | "Pass" | "Fail";

interface TrackerRow {
  employeeId:       string;
  fullName:         string;
  email:            string;
  employeeStatus:   "active" | "inactive";
  assessmentStatus: string;
  passFail:         PassFail;
  score:            number | null;
  percentage:       number | null;
  submittedAt:      string | null;
  attemptNumber:    number | null;
  invitationExpiry: string | null;
}

interface CycleOption {
  id:       string;
  label:    string;
  status:   string;
  openedAt: string;
}

interface TrackerData {
  cycle: { id: string; label: string; openedAt: string; status: string; passingScore: number } | null;
  cycles: CycleOption[];
  rows:  TrackerRow[];
  stats: {
    total: number; completed: number; pending: number; retryAvailable: number;
    completionRate: number; passCount: number; failCount: number; passRate: number;
  };
}

function PassFailChip({ value }: { value: PassFail }) {
  if (value === "Pass") return (
    <Chip label="Pass" size="small"
      sx={{ fontWeight: 700, fontSize: 11, bgcolor: `${SUC}18`, color: SUC }} />
  );
  if (value === "Fail") return (
    <Chip label="Fail" size="small"
      sx={{ fontWeight: 700, fontSize: 11, bgcolor: `${ERR}18`, color: ERR }} />
  );
  if (value === "Retry Available") return (
    <Chip label="Retry" size="small" color="warning"
      sx={{ fontWeight: 700, fontSize: 11 }} />
  );
  return (
    <Chip label={value === "Not Started" ? "Pending" : value} size="small"
      sx={{ fontWeight: 700, fontSize: 11 }} />
  );
}

export default function AdminTrackerPage() {
  const [data,         setData]         = useState<TrackerData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fetching,     setFetching]     = useState(false);   // re-fetch on cycle change
  const [cycleFilter,  setCycleFilter]  = useState<string>(""); // "" → resolved after first load
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [search,       setSearch]       = useState("");

  // Tracks whether the initial load has set cycleFilter (prevents double-fetch)
  const firstLoadRef = useRef(false);

  async function loadData(cycleId = "") {
    if (!firstLoadRef.current) setLoading(true);
    else setFetching(true);

    try {
      const qs  = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : "";
      const res = await fetch(`/api/admin/tracker${qs}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data as TrackerData);
        if (!firstLoadRef.current) {
          firstLoadRef.current = true;
          // Initialise to the active cycle (or "all" if none)
          setCycleFilter(json.data.cycle?.id ?? "all");
        }
      }
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }

  useEffect(() => {
    loadData(); // initial load — no param → API uses active cycle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCycleChange(newCycleId: string) {
    setCycleFilter(newCycleId);
    setResultFilter("all"); // reset result filter when cycle changes
    setSearch("");
    loadData(newCycleId);
  }

  function handleReset() {
    const defaultId = data?.cycles.find((c) => c.status === "active")?.id ?? "all";
    if (cycleFilter !== defaultId || resultFilter !== "all") {
      setCycleFilter(defaultId);
      setResultFilter("all");
      setSearch("");
      loadData(defaultId);
    }
  }

  const isDefaultFilter =
    cycleFilter === (data?.cycles.find((c) => c.status === "active")?.id ?? "all") &&
    resultFilter === "all" &&
    search === "";

  // Apply result filter + search client-side
  const filtered = (data?.rows ?? []).filter((r) => {
    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "Pass" && r.passFail === "Pass") ||
      (resultFilter === "Fail" && r.passFail === "Fail");
    const matchesSearch =
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    return matchesResult && matchesSearch;
  });

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography variant="body2" color="text.secondary">Loading tracker…</Typography>
        </Stack>
      </Box>
    );
  }

  const stats = data?.stats ?? {
    total: 0, completed: 0, pending: 0, retryAvailable: 0,
    completionRate: 0, passCount: 0, failCount: 0, passRate: 0,
  };

  const selectedCycleLabel =
    cycleFilter === "all"
      ? "All Cycles"
      : data?.cycles.find((c) => c.id === cycleFilter)?.label ?? "Unknown Cycle";

  const statCards = [
    { icon: <GroupsOutlined />,         label: "Total Employees", value: stats.total,     color: P },
    { icon: <CheckCircleOutlined />,    label: "Completed",       value: stats.completed, color: SUC },
    { icon: <PendingActionsOutlined />, label: "Pending",         value: stats.pending,   color: "#F59E0B" },
    {
      icon:     <EmojiEventsOutlined />,
      label:    "Pass Rate",
      value:    `${stats.passRate}%`,
      color:    stats.passRate >= 70 ? SUC : ERR,
      sub:      `${stats.passCount} passed · ${stats.failCount} failed`,
      bar:      true,
      barValue: stats.passRate,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Assessment Tracker
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: { xs: 13, sm: 14 }, color: colors.muted }}>
          {cycleFilter === "all"
            ? "Showing aggregated results across all cycles"
            : data?.cycle
              ? `${data.cycle.label} · pass mark ${data.cycle.passingScore}/10 · opened ${new Date(data.cycle.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
              : selectedCycleLabel}
        </Typography>
      </Box>

      {/* Stats row */}
      <Stack
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}
      >
        {statCards.map((s) => (
          <Card key={s.label} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: "16px !important" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${s.color}20`, color: s.color, display: "grid", placeItems: "center" }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>
                    {s.label}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 800, color: s.color }}>
                    {s.value}
                  </Typography>
                  {"sub" in s && s.sub && (
                    <Typography sx={{ fontSize: 11, color: colors.muted }}>{s.sub}</Typography>
                  )}
                </Box>
              </Stack>
              {"bar" in s && s.bar && (
                <LinearProgress
                  variant="determinate"
                  value={s.barValue as number}
                  sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: `${ERR}20`,
                    "& .MuiLinearProgress-bar": { bgcolor: (s.barValue as number) >= 70 ? SUC : ERR } }}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Table */}
      <Card sx={{ borderRadius: 2 }}>
        {/* Table header: title + search */}
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1.5, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>Employee Status</Typography>
          <TextField
            size="small"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 18, color: colors.muted }} /></InputAdornment> } }}
            sx={{ width: { xs: "100%", sm: 280 } }}
          />
        </Box>

        {/* Filter controls */}
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          {/* Cycle dropdown */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="cycle-filter-label">Assessment Cycle</InputLabel>
            <Select
              labelId="cycle-filter-label"
              value={cycleFilter || "all"}
              label="Assessment Cycle"
              onChange={(e) => handleCycleChange(e.target.value)}
              disabled={fetching}
            >
              <MenuItem value="all">All Cycles</MenuItem>
              {(data?.cycles ?? []).length > 0 && <Divider />}
              {(data?.cycles ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.label}
                  {c.status === "active" && (
                    <Typography component="span" sx={{ ml: 0.75, fontSize: 10, fontWeight: 700, color: SUC }}>
                      ACTIVE
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Result filter chips */}
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
            {(["all", "Pass", "Fail"] as const).map((f) => {
              const selected = resultFilter === f;
              const color =
                selected && f === "Pass" ? "success"
                : selected && f === "Fail" ? "error"
                : selected ? "primary"
                : "default";
              return (
                <Chip
                  key={f}
                  label={f === "all" ? "All Results" : f}
                  onClick={() => setResultFilter(f)}
                  color={color as any}
                  variant={selected ? "filled" : "outlined"}
                  size="small"
                  clickable
                  sx={{
                    fontWeight: selected ? 700 : 400,
                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                    ...(!selected && {
                      "&:hover": {
                        bgcolor: "rgba(62, 11, 120, 0.05)",
                        borderColor: "rgba(62, 11, 120, 0.28)",
                      },
                    }),
                    ...(selected && f === "all" && {
                      "&:hover": { bgcolor: "rgba(62, 11, 120, 0.15)" },
                    }),
                    ...(selected && f === "Pass" && {
                      "&:hover": { bgcolor: "#C8E6C9" },
                    }),
                    ...(selected && f === "Fail" && {
                      "&:hover": { bgcolor: "#F5C8C8" },
                    }),
                  }}
                />
              );
            })}
          </Stack>

          {/* Reset filters */}
          {!isDefaultFilter && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<FilterListOff sx={{ fontSize: 16 }} />}
              onClick={handleReset}
              sx={{ fontSize: 12, color: colors.muted, whiteSpace: "nowrap" }}
            >
              Reset filters
            </Button>
          )}

          {fetching && <CircularProgress size={16} sx={{ ml: 1 }} />}
        </Box>

        <Divider />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Assessment</TableCell>
                <TableCell>Pass / Fail</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Attempt</TableCell>
                <TableCell>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                    {search || resultFilter !== "all"
                      ? "No employees match the selected filters."
                      : "No employees found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: `${P}18`, color: P }}>
                          {row.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.fullName}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: colors.muted }}>{row.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.employeeStatus}
                        color={row.employeeStatus === "active" ? "success" : "default"}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.assessmentStatus}
                        color={
                          row.assessmentStatus === "Completed" ? "success" :
                          row.assessmentStatus === "Retry Available" ? "warning" : "default"
                        }
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <PassFailChip value={row.passFail} />
                    </TableCell>
                    <TableCell>
                      {row.score !== null ? (
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: row.percentage! >= 80 ? SUC : ERR }}>
                            {row.score}/10
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: colors.muted }}>({row.percentage}%)</Typography>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: colors.muted }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted }}>
                        {row.attemptNumber != null ? `#${row.attemptNumber}` : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted }}>
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filtered.length > 0 && (
          <Box sx={{ px: 2.5, py: 1.5, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, color: colors.muted }}>
              Showing {filtered.length} of {data?.rows.length ?? 0} employees
              {resultFilter !== "all" && ` · filtered by: ${resultFilter}`}
              {search && ` · search: "${search}"`}
            </Typography>
            {cycleFilter !== "all" && data?.cycle && (
              <Typography sx={{ fontSize: 11, color: colors.muted }}>
                Cycle: {data.cycle.label} · pass mark {data.cycle.passingScore}/10
              </Typography>
            )}
          </Box>
        )}
      </Card>
    </Container>
  );
}
