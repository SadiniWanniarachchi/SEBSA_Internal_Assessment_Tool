"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
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
  AddOutlined,
  BlockOutlined,
  CheckCircleOutlineOutlined,
  PersonOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  roleTitle?: string;
  employeeIdCode?: string;
  status: "active" | "inactive";
}

const emptyForm = { fullName: "", email: "", department: "", password: "" };

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  useEffect(() => {
    async function load() {
      await fetchEmployees();
      setLoading(false);
    }
    load();
  }, []);

  async function fetchEmployees() {
    const res = await fetch("/api/employees");
    const json = await res.json();
    if (json.success) setEmployees(json.data);
  }

  async function handleAdd() {
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.error || "Failed to create employee.");
        return;
      }
      await fetchEmployees();
      setPageMessage(`Employee "${form.fullName}" added successfully.`);
      setDialogOpen(false);
      setForm(emptyForm);
    } catch {
      setFormError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(emp: Employee) {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setPageMessage(`${emp.fullName} has been ${newStatus === "active" ? "re-activated" : "deactivated"}.`);
    await fetchEmployees();
  }

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter((e) => e.status === "active").length;

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
            Employee Management
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted }}>
            {employees.length} total · {activeCount} active
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => { setDialogOpen(true); setForm(emptyForm); setFormError(""); }}
          sx={{ px: 2.5, alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          Add Employee
        </Button>
      </Stack>

      {pageMessage && (
        <Alert severity="success" onClose={() => setPageMessage("")} sx={{ mb: 2 }}>
          {pageMessage}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1}>
            <Chip icon={<PersonOutlined />} label={`${activeCount} Active`} color="success" size="small" />
            <Chip label={`${employees.length - activeCount} Inactive`} size="small" />
          </Stack>
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
                <TableCell>Employee ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                    {search ? "No employees match your search." : "No employees found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: `${P}18`, color: P }}>
                          {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{emp.fullName}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: colors.muted }}>{emp.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{emp.department ?? "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted, fontFamily: "monospace" }}>
                        {emp.employeeIdCode ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={emp.status}
                        color={emp.status === "active" ? "success" : "default"}
                        size="small"
                        sx={{ textTransform: "capitalize", fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={emp.status === "active" ? "Deactivate" : "Re-activate"}>
                        <IconButton
                          size="small"
                          onClick={() => toggleStatus(emp)}
                          color={emp.status === "active" ? "warning" : "success"}
                        >
                          {emp.status === "active"
                            ? <BlockOutlined sx={{ fontSize: 16 }} />
                            : <CheckCircleOutlineOutlined sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Full Name" fullWidth value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Department (optional)" fullWidth value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <TextField label="Temporary Password" type="password" fullWidth value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="Employee can change this later." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={saving}>
            {saving ? "Adding…" : "Add Employee"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
