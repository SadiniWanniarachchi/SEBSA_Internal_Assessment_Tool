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
  DialogContentText,
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
  DeleteOutlined,
  PersonOutlined,
  SearchOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";
import { BulkImportDialog } from "@/components/BulkImportDialog";

const colors = sebsaColors;
const P = colors.primary;

interface Employee {
  id:     string;
  fullName: string;
  email:  string;
  status: "active" | "inactive";
}

const emptyForm = { fullName: "", email: "" };

export default function AdminEmployeesPage() {
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");
  const [pageMessage, setPageMessage]   = useState("");
  const [deleteTarget, setDeleteTarget]   = useState<Employee | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [importOpen, setImportOpen]       = useState(false);
  const [statusFilter,   setStatusFilter]   = useState<"all" | "active" | "inactive">("all");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction,     setBulkAction]     = useState<"activate" | "deactivate">("deactivate");
  const [bulkBusy,       setBulkBusy]       = useState(false);
  const [bulkError,      setBulkError]      = useState("");

  useEffect(() => {
    async function load() {
      await fetchEmployees();
      setLoading(false);
    }
    load();
  }, []);

  async function fetchEmployees() {
    const res  = await fetch("/api/employees");
    const json = await res.json();
    if (json.success) setEmployees(json.data);
  }

  async function handleAdd() {
    setSaving(true);
    setFormError("");
    try {
      const res  = await fetch("/api/employees", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
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
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });
    setPageMessage(`${emp.fullName} has been ${newStatus === "active" ? "re-activated" : "deactivated"}.`);
    await fetchEmployees();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/employees/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPageMessage(json.message ?? `${deleteTarget.fullName} has been permanently deleted.`);
        await fetchEmployees();
      } else {
        setPageMessage(`Error: ${json.error}`);
      }
    } catch {
      setPageMessage("Network error while deleting employee.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleBulkAction() {
    setBulkBusy(true);
    setBulkError("");
    try {
      const res  = await fetch("/api/employees/bulk-status", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: bulkAction }),
      });
      const json = await res.json();
      if (!json.success) {
        setBulkError(json.error ?? "Bulk action failed.");
        return;
      }
      setPageMessage(json.message ?? "Bulk action completed.");
      setBulkDialogOpen(false);
      await fetchEmployees();
    } catch {
      setBulkError("Network error.");
    } finally {
      setBulkBusy(false);
    }
  }

  const activeCount   = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.length - activeCount;

  const filtered = employees.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesSearch =
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}
        sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Employee Management
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted }}>
            {employees.length} total · {activeCount} active
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlined />}
            onClick={() => setImportOpen(true)}
            sx={{ px: 2, flexShrink: 0 }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => { setDialogOpen(true); setForm(emptyForm); setFormError(""); }}
            sx={{ px: 2.5 }}
          >
            Add Employee
          </Button>
        </Stack>
      </Stack>

      {pageMessage && (
        <Alert severity="success" onClose={() => setPageMessage("")} sx={{ mb: 2 }}>
          {pageMessage}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1.5, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Status filter chips — also serve as quick counts */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {(["all", "active", "inactive"] as const).map((f) => {
              const count = f === "all" ? employees.length : employees.filter((e) => e.status === f).length;
              const selected = statusFilter === f;
              return (
                <Chip
                  key={f}
                  label={`${f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} (${count})`}
                  icon={f === "active" ? <PersonOutlined /> : undefined}
                  onClick={() => setStatusFilter(f)}
                  color={selected && f === "active" ? "success" : selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  size="small"
                  clickable
                  sx={{ fontWeight: selected ? 700 : 400 }}
                />
              );
            })}
          </Stack>
          <TextField
            size="small"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 18, color: colors.muted }} /></InputAdornment> } }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
        </Box>
        {/* Bulk action buttons — shown only when there are employees to act on */}
        {(activeCount > 0 || inactiveCount > 0) && (
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {activeCount > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<BlockOutlined />}
                onClick={() => { setBulkAction("deactivate"); setBulkError(""); setBulkDialogOpen(true); }}
                sx={{ fontSize: 12 }}
              >
                Deactivate All ({activeCount})
              </Button>
            )}
            {inactiveCount > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CheckCircleOutlineOutlined />}
                onClick={() => { setBulkAction("activate"); setBulkError(""); setBulkDialogOpen(true); }}
                sx={{ fontSize: 12 }}
              >
                Activate All ({inactiveCount})
              </Button>
            )}
          </Box>
        )}
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
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
                      <Chip
                        label={emp.status}
                        color={emp.status === "active" ? "success" : "default"}
                        size="small"
                        sx={{ textTransform: "capitalize", fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
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
                        <Tooltip title="Delete employee">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(emp)}
                          >
                            <DeleteOutlined sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Employee Dialog — name + email only */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Full Name"
              fullWidth
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              autoFocus
            />
            <TextField
              label="Company Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              helperText="The employee will log in with their company email and password."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={saving}>
            {saving ? "Adding…" : "Add Employee"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: colors.error }}>Permanently Delete Employee?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will <strong>permanently remove</strong>{" "}
            <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email}) from the system.
            <br /><br />
            This action <strong>cannot be undone</strong>. The employee's personal profile will be deleted from the database.
            Assessment history and certificates are retained for audit purposes.
            <br /><br />
            To simply block access without deleting data, use <strong>Deactivate</strong> instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit" disabled={deleting}>Cancel</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Permanently Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Status Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => !bulkBusy && setBulkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: bulkAction === "deactivate" ? colors.error : "success.main" }}>
          {bulkAction === "deactivate"
            ? "Deactivate All Active Employees?"
            : "Activate All Inactive Employees?"}
        </DialogTitle>
        <DialogContent>
          {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}
          <DialogContentText>
            {bulkAction === "deactivate" ? (
              <>
                This will <strong>deactivate all {activeCount} active employee{activeCount !== 1 ? "s" : ""}</strong>.
                Deactivated employees will be blocked from logging in immediately.
                <br /><br />
                Assessment history, scores, and certificates are <strong>not affected</strong>.
                You can re-activate employees individually at any time.
              </>
            ) : (
              <>
                This will <strong>activate all {inactiveCount} inactive employee{inactiveCount !== 1 ? "s" : ""}</strong>,
                restoring their ability to log in.
                <br /><br />
                Existing assessment records are <strong>not affected</strong>.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} color="inherit" disabled={bulkBusy}>Cancel</Button>
          <Button
            onClick={handleBulkAction}
            variant="contained"
            color={bulkAction === "deactivate" ? "error" : "success"}
            disabled={bulkBusy}
          >
            {bulkBusy
              ? `${bulkAction === "deactivate" ? "Deactivating" : "Activating"}…`
              : bulkAction === "deactivate"
              ? `Deactivate All (${activeCount})`
              : `Activate All (${inactiveCount})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          fetchEmployees();
          setPageMessage("Bulk import completed. Employee list updated.");
        }}
      />
    </Container>
  );
}
