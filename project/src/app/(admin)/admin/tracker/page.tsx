"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  InputAdornment,
  LinearProgress,
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
  GroupsOutlined,
  PendingActionsOutlined,
  SearchOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface TrackerRow {
  employeeId: string;
  fullName: string;
  email: string;
  department: string | null;
  employeeStatus: "active" | "inactive";
  assessmentStatus: "Completed" | "Not Started";
  score: number | null;
  percentage: number | null;
  submittedAt: string | null;
}

interface TrackerData {
  cycle: { id: string; label: string; openedAt: string; status: string } | null;
  rows: TrackerRow[];
  stats: { total: number; completed: number; pending: number; completionRate: number };
}

export default function AdminTrackerPage() {
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/tracker");
        const json = await res.json();
        if (json.success) setData(json.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = (data?.rows ?? []).filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

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

  const stats = data?.stats ?? { total: 0, completed: 0, pending: 0, completionRate: 0 };

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Assessment Tracker
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: { xs: 13, sm: 14 }, color: colors.muted }}>
          {data?.cycle
            ? `Active cycle: ${data.cycle.label} · opened ${new Date(data.cycle.openedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
            : "No active assessment cycle"}
        </Typography>
      </Box>

      {/* Stats row */}
      <Stack
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}
      >
        {[
          { icon: <GroupsOutlined />, label: "Total Employees", value: stats.total, color: P },
          { icon: <CheckCircleOutlined />, label: "Completed", value: stats.completed, color: colors.success },
          { icon: <PendingActionsOutlined />, label: "Pending", value: stats.pending, color: "#F59E0B" },
          { icon: <TrendingUpOutlined />, label: "Completion Rate", value: `${stats.completionRate}%`, color: P },
        ].map((s) => (
          <Card key={s.label} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: "16px !important" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: `${s.color}20`, color: s.color, display: "grid", placeItems: "center" }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 800, color: colors.ink }}>{s.value}</Typography>
                </Box>
              </Stack>
              {s.label === "Completion Rate" && (
                <LinearProgress variant="determinate" value={stats.completionRate} sx={{ mt: 1.5, height: 4, borderRadius: 2 }} />
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Table card */}
      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>Employee Status</Typography>
          <TextField
            size="small"
            placeholder="Search name, email, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 18, color: colors.muted }} /></InputAdornment> } }}
            sx={{ width: { xs: "100%", sm: 280 } }}
          />
        </Box>
        <Divider />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Assessment</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                    {search ? "No employees match your search." : "No employees found."}
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
                      <Typography sx={{ fontSize: 13 }}>{row.department ?? "—"}</Typography>
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
                        color={row.assessmentStatus === "Completed" ? "success" : "warning"}
                        size="small"
                        sx={{ fontSize: 11, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.score !== null ? (
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: row.percentage! >= 80 ? colors.success : "#B45309" }}>
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
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: colors.muted }}>
              Showing {filtered.length} of {data?.rows.length ?? 0} employees
            </Typography>
          </Box>
        )}
      </Card>
    </Container>
  );
}
