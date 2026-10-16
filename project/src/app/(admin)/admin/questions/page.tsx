"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined,
  EditOutlined,
  QuizOutlined,
  SearchOutlined,
  ToggleOffOutlined,
  ToggleOnOutlined,
} from "@mui/icons-material";
import { sebsaColors } from "@/lib/theme";

const colors = sebsaColors;
const P = colors.primary;

interface Question {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  category: string | null;
  status: "active" | "inactive";
}

type FormState = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  category: string;
  status: "active" | "inactive";
};

const emptyForm: FormState = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
  category: "",
  status: "active",
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const pendingStatus = useRef(new Set<string>());

  useEffect(() => {
    async function load() {
      await fetchQuestions();
      setLoading(false);
    }
    load();
  }, []);

  async function fetchQuestions() {
    const res = await fetch("/api/questions");
    const json = await res.json();
    if (json.success) setQuestions(json.data);
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function openEdit(q: Question) {
    setEditId(q.id);
    setForm({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      category: q.category ?? "",
      status: q.status,
    });
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = { ...form, category: form.category || undefined };
      const url = editId ? `/api/questions/${editId}` : "/api/questions";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save question.");
        return;
      }
      await fetchQuestions();
      setSuccess(editId ? "Question updated." : "Question added.");
      setDialogOpen(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(q: Question) {
    if (pendingStatus.current.has(q.id)) return;
    pendingStatus.current.add(q.id);
    setUpdatingStatus((prev) => ({ ...prev, [q.id]: true }));
    setStatusError("");
    const newStatus = q.status === "active" ? "inactive" : "active";
    const replaceQuestion = (question: Question) =>
      setQuestions((prev) => prev.map((item) => item.id === q.id ? question : item));
    replaceQuestion({ ...q, status: newStatus });
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to update question status.");
      }
      replaceQuestion(json.data);
    } catch (err) {
      replaceQuestion(q);
      setStatusError(err instanceof Error ? err.message : "Failed to update question status.");
      // A network failure may happen after the server commits. Reconcile if reachable.
      try {
        const res = await fetch("/api/questions", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json.success) {
          const persisted = json.data.find((item: Question) => item.id === q.id);
          if (persisted) replaceQuestion(persisted);
        }
      } catch {
        setStatusError("Unable to confirm question status. Please reload when your connection returns.");
      }
    } finally {
      pendingStatus.current.delete(q.id);
      setUpdatingStatus((prev) => ({ ...prev, [q.id]: false }));
    }
  }

  const filtered = questions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      (q.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = questions.filter((q) => q.status === "active").length;

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
            Question Bank
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted }}>
            {questions.length} total · {activeCount} active
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={openAdd}
          sx={{ px: 2.5, alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          Add Question
        </Button>
      </Stack>

      {statusError && (
        <Alert severity="error" onClose={() => setStatusError("")} sx={{ mb: 2 }}>
          {statusError}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1}>
            <Chip icon={<QuizOutlined />} label={`${activeCount} Active`} color="success" size="small" />
            <Chip label={`${questions.length - activeCount} Inactive`} size="small" />
          </Stack>
          <TextField
            size="small"
            placeholder="Search questions or category…"
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
                <TableCell sx={{ width: "45%" }}>Question</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Correct</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", py: 4, color: colors.muted }}>
                    {search ? "No questions match your search." : "No questions in the bank yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                        {q.questionText.length > 100 ? q.questionText.slice(0, 100) + "…" : q.questionText}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: colors.muted }}>
                        {q.category ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={q.correctOption.toUpperCase()} color="primary" size="small" sx={{ fontWeight: 800, minWidth: 30 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={q.status}
                        color={q.status === "active" ? "success" : "default"}
                        size="small"
                        sx={{ textTransform: "capitalize", fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" disabled={updatingStatus[q.id]} onClick={() => openEdit(q)}>
                            <EditOutlined sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={q.status === "active" ? "Deactivate" : "Activate"}>
                          <IconButton
                            size="small"
                            onClick={() => toggleStatus(q)}
                            disabled={updatingStatus[q.id]}
                            role="switch"
                            aria-checked={q.status === "active"}
                            aria-label={`${q.status === "active" ? "Deactivate" : "Activate"} question: ${q.questionText}`}
                            sx={{
                              color: q.status === "active" ? "#129B14" : "#A30D0D",
                              "&.Mui-disabled": { color: q.status === "active" ? "#129B14" : "#A30D0D", opacity: 0.6 },
                            }}
                          >
                            {q.status === "active"
                              ? <ToggleOnOutlined sx={{ fontSize: 18 }} />
                              : <ToggleOffOutlined sx={{ fontSize: 18 }} />}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Question" : "Add New Question"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Question Text"
              multiline
              minRows={2}
              fullWidth
              value={form.questionText}
              onChange={(e) => setForm({ ...form, questionText: e.target.value })}
            />
            {(["optionA", "optionB", "optionC", "optionD"] as const).map((key, i) => (
              <TextField
                key={key}
                label={`Option ${["A", "B", "C", "D"][i]}`}
                fullWidth
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
            <FormControl fullWidth>
              <InputLabel>Correct Option</InputLabel>
              <Select
                label="Correct Option"
                value={form.correctOption}
                onChange={(e) => setForm({ ...form, correctOption: e.target.value as "a" | "b" | "c" | "d" })}
              >
                {["a", "b", "c", "d"].map((v) => (
                  <MenuItem key={v} value={v}>{v.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Category (optional)"
              fullWidth
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
              <FormHelperText>Inactive questions are excluded from new assessments.</FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Saving…" : editId ? "Save Changes" : "Add Question"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
