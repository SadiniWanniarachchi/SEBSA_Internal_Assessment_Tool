"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
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
  IconButton,
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
  AdminPanelSettingsOutlined,
  DeleteOutlined,
  LockOutlined,
  MailOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface AdminRecord {
  id:        string;
  fullName:  string;
  email:     string;
  role:      string;
  createdAt: string;
}

interface AdminUser {
  id:       string;
  fullName: string;
  email:    string;
  role:     string;
}

const emptyNewAdmin = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function AdminProfilePage() {
  // ── Current user state ───────────────────────────────────────────────────────
  const [admin, setAdmin]         = useState<AdminUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState("");
  const [error, setError]         = useState("");
  const [fullName, setFullName]   = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // ── Admin Users list state ───────────────────────────────────────────────────
  const [admins,        setAdmins]        = useState<AdminRecord[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [addOpen,       setAddOpen]       = useState(false);
  const [newAdmin,      setNewAdmin]      = useState(emptyNewAdmin);
  const [addBusy,       setAddBusy]       = useState(false);
  const [addError,      setAddError]      = useState("");
  const [removeTarget,  setRemoveTarget]  = useState<AdminRecord | null>(null);
  const [removing,      setRemoving]      = useState(false);
  const [removeError,   setRemoveError]   = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/auth");
        const json = await res.json();
        if (json.success && json.data.user.role === "admin") {
          setAdmin(json.data.user);
          setFullName(json.data.user.fullName);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setAdminsLoading(true);
    try {
      const res  = await fetch("/api/admin/admins");
      const json = await res.json();
      if (json.success) setAdmins(json.data);
    } finally {
      setAdminsLoading(false);
    }
  }

  async function handleSaveName() {
    if (!admin || !fullName.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res  = await fetch(`/api/admin/profile`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fullName: fullName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setAdmin({ ...admin, fullName: fullName.trim() });
        setMessage("Profile updated successfully.");
      } else {
        setError(json.error ?? "Failed to update profile.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!newPw || newPw !== confirmPw) { setError("Passwords do not match."); return; }
    if (newPw.length < 8) { setError("New password must be at least 8 characters."); return; }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res  = await fetch(`/api/admin/profile`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Password changed successfully.");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setError(json.error ?? "Failed to change password.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAdmin() {
    if (newAdmin.password !== newAdmin.confirmPassword) {
      setAddError("Passwords do not match.");
      return;
    }
    setAddBusy(true);
    setAddError("");
    try {
      const res  = await fetch("/api/admin/admins", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fullName: newAdmin.fullName.trim(),
          email:    newAdmin.email.trim(),
          password: newAdmin.password,
        }),
      });
      const json = await res.json();
      if (!json.success) { setAddError(json.error ?? "Failed to add admin."); return; }
      setMessage(`Admin account created for ${newAdmin.fullName}.`);
      setAddOpen(false);
      setNewAdmin(emptyNewAdmin);
      await fetchAdmins();
    } catch {
      setAddError("Network error.");
    } finally {
      setAddBusy(false);
    }
  }

  async function handleRemoveAdmin() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError("");
    try {
      const res  = await fetch(`/api/admin/admins/${removeTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) { setRemoveError(json.error ?? "Failed to remove admin."); return; }
      setMessage(json.message ?? `${removeTarget.fullName} has been removed.`);
      setRemoveTarget(null);
      await fetchAdmins();
    } catch {
      setRemoveError("Network error.");
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 200 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (!admin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load admin profile.</Alert>
      </Container>
    );
  }

  const initials = admin.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, sm: 4 } }}>
      {/* Page heading */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, letterSpacing: "-0.5px" }}>
          My Profile
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted }}>
          Account information, security settings, and admin user management
        </Typography>
      </Box>

      {/* Alerts */}
      {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {error   && <Alert severity="error"   onClose={() => setError("")}   sx={{ mb: 2 }}>{error}</Alert>}

      {/* Identity banner */}
      <Card sx={{ borderRadius: 2, mb: 3, bgcolor: `${P}06`, border: `1px solid ${P}20` }}>
        <CardContent sx={{ py: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} sx={{ alignItems: { xs: "flex-start", sm: "center" } }}>
            <Avatar sx={{ width: { xs: 56, sm: 64 }, height: { xs: 56, sm: 64 }, fontWeight: 800, fontSize: { xs: 20, sm: 24 }, bgcolor: `${P}20`, color: P, flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, letterSpacing: "-0.3px" }}>
                {admin.fullName}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: "center" }}>
                <MailOutlined sx={{ fontSize: 14, color: colors.muted }} />
                <Typography sx={{ fontSize: 13.5, color: colors.muted }}>{admin.email}</Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", bgcolor: `${P}12`, px: 1.5, py: 0.75, borderRadius: 1.5, flexShrink: 0 }}>
              <AdminPanelSettingsOutlined sx={{ fontSize: 15, color: P }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: P }}>Administrator</Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.5, sm: 4 }}>
            {[
              { icon: <PersonOutlined sx={{ fontSize: 14 }} />, label: "Name",  value: admin.fullName },
              { icon: <MailOutlined sx={{ fontSize: 14 }} />,    label: "Email", value: admin.email },
              { icon: <AdminPanelSettingsOutlined sx={{ fontSize: 14 }} />, label: "Role", value: "Administrator" },
            ].map((f) => (
              <Stack key={f.label} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <Box sx={{ mt: 0.2, color: colors.muted, flexShrink: 0 }}>{f.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: ".07em" }}>
                    {f.label}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5 }}>{f.value}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Two-column edit area */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}>
        {/* Left: Edit profile */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
              <PersonOutlined sx={{ fontSize: 18, color: P }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Edit Profile</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth size="small" autoComplete="name"
              />
              <TextField
                label="Email"
                value={admin.email}
                fullWidth size="small" disabled
                helperText="Email cannot be changed here."
              />
              <Button
                variant="contained"
                onClick={handleSaveName}
                disabled={saving || !fullName.trim() || fullName.trim() === admin.fullName}
                sx={{ alignSelf: "flex-start" }}
              >
                Save Changes
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Right: Change password */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
              <LockOutlined sx={{ fontSize: 18, color: P }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Change Password</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField label="Current Password" type="password" value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                fullWidth size="small" autoComplete="current-password" />
              <TextField label="New Password" type="password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                fullWidth size="small" helperText="Minimum 8 characters." autoComplete="new-password" />
              <TextField label="Confirm New Password" type="password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                fullWidth size="small" autoComplete="new-password" />
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={saving || !currentPw || !newPw || !confirmPw}
                sx={{ alignSelf: "flex-start" }}
              >
                Change Password
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* ── Admin Users section ───────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AdminPanelSettingsOutlined sx={{ fontSize: 18, color: P }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Admin Users</Typography>
            {!adminsLoading && (
              <Chip label={admins.length} size="small" sx={{ fontWeight: 700, bgcolor: `${P}15`, color: P }} />
            )}
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => { setAddOpen(true); setNewAdmin(emptyNewAdmin); setAddError(""); }}
          >
            Add Admin
          </Button>
        </Box>

        <Divider />

        {adminsLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Added</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                      No admin accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((a) => {
                    const isMe = a.email.toLowerCase() === admin.email.toLowerCase();
                    const ini  = a.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, bgcolor: `${P}18`, color: P }}>
                              {ini}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                {a.fullName}
                                {isMe && (
                                  <Chip label="You" size="small" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 700, height: 18, bgcolor: `${P}15`, color: P }} />
                                )}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12.5, color: colors.muted }}>{a.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, color: colors.muted }}>
                            {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {!isMe && (
                            <Tooltip title="Remove admin access">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => { setRemoveTarget(a); setRemoveError(""); }}
                              >
                                <DeleteOutlined sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Add Admin dialog */}
      <Dialog open={addOpen} onClose={() => !addBusy && setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Admin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <TextField
              label="Full Name"
              fullWidth size="small" autoFocus
              value={newAdmin.fullName}
              onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth size="small"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth size="small"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              helperText="Minimum 8 characters."
              autoComplete="new-password"
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth size="small"
              value={newAdmin.confirmPassword}
              onChange={(e) => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
              autoComplete="new-password"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} color="inherit" disabled={addBusy}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddAdmin}
            disabled={addBusy || !newAdmin.fullName.trim() || !newAdmin.email.trim() || !newAdmin.password}
          >
            {addBusy ? "Adding…" : "Add Admin"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Admin confirmation dialog */}
      <Dialog open={!!removeTarget} onClose={() => !removing && setRemoveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: colors.error }}>Remove Admin Access?</DialogTitle>
        <DialogContent>
          {removeError && <Alert severity="error" sx={{ mb: 2 }}>{removeError}</Alert>}
          <DialogContentText>
            This will permanently remove <strong>{removeTarget?.fullName}</strong> ({removeTarget?.email}) from the admin panel.
            They will no longer be able to log in as an administrator.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)} color="inherit" disabled={removing}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemoveAdmin} disabled={removing}>
            {removing ? "Removing…" : "Remove Admin"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
