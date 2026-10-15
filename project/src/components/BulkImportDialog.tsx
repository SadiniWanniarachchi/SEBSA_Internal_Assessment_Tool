"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

const P = "#3E0B78";

type Step = "upload" | "preview" | "result";

type PreviewStatus = "would_create" | "already_exists" | "duplicate_in_file" | "invalid";
type ImportStatus  = "created" | "already_exists" | "duplicate_in_file" | "invalid" | "failed";

interface PreviewRow {
  row:      number;
  fullName: string;
  email:    string;
  status:   PreviewStatus;
  reason?:  string;
}

interface ResultRow {
  row:      number;
  fullName: string;
  email:    string;
  status:   ImportStatus;
  reason?:  string;
}

interface PreviewSummary {
  wouldCreate:     number;
  alreadyExists:   number;
  duplicateInFile: number;
  invalid:         number;
  total:           number;
}

interface ResultSummary {
  created:         number;
  alreadyExists:   number;
  duplicateInFile: number;
  invalid:         number;
  failed:          number;
  total:           number;
}

export interface BulkImportDialogProps {
  open:       boolean;
  onClose:    () => void;
  onImported: () => void;
}

// ── Status chip helpers ───────────────────────────────────────────────────────

const PREVIEW_CHIP: Record<PreviewStatus, { label: string; color: "success" | "warning" | "info" | "error" }> = {
  would_create:    { label: "To Import",        color: "success" },
  already_exists:  { label: "Already Exists",   color: "warning" },
  duplicate_in_file: { label: "Dup in File",    color: "info"    },
  invalid:         { label: "Invalid",           color: "error"   },
};

const IMPORT_CHIP: Record<ImportStatus, { label: string; color: "success" | "warning" | "info" | "error" }> = {
  created:         { label: "Added",            color: "success" },
  already_exists:  { label: "Already Exists",   color: "warning" },
  duplicate_in_file: { label: "Dup in File",    color: "info"    },
  invalid:         { label: "Invalid",          color: "error"   },
  failed:          { label: "Failed",           color: "error"   },
};

// ── Main component ────────────────────────────────────────────────────────────

export function BulkImportDialog({ open, onClose, onImported }: BulkImportDialogProps) {
  const [step,            setStep]           = useState<Step>("upload");
  const [file,            setFile]           = useState<File | null>(null);
  const [loading,         setLoading]        = useState(false);
  const [error,           setError]          = useState("");
  const [previewRows,     setPreviewRows]    = useState<PreviewRow[]>([]);
  const [previewSummary,  setPreviewSummary] = useState<PreviewSummary | null>(null);
  const [resultRows,      setResultRows]     = useState<ResultRow[]>([]);
  const [resultSummary,   setResultSummary]  = useState<ResultSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("upload");
    setFile(null);
    setLoading(false);
    setError("");
    setPreviewRows([]);
    setPreviewSummary(null);
    setResultRows([]);
    setResultSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd  = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/employees/bulk-import?preview=1", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? "Failed to parse file."); return; }
      setPreviewRows(json.data.rows);
      setPreviewSummary(json.data.summary);
      setStep("preview");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd  = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/employees/bulk-import", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? "Import failed."); return; }
      setResultRows(json.data.rows);
      setResultSummary(json.data.summary);
      setStep("result");
      if (json.data.summary.created > 0) onImported();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadFailedCsv() {
    const skipped = resultRows.filter((r) => r.status !== "created");
    if (skipped.length === 0) return;
    const lines = [
      "Row,Full Name,Email,Status,Reason",
      ...skipped.map(
        (r) =>
          `${r.row},"${r.fullName.replace(/"/g, '""')}","${r.email}","${r.status}","${(r.reason ?? "").replace(/"/g, '""')}"`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "import-skipped-rows.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Step: Upload ────────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Upload an Excel or CSV file. The file must contain columns for employee name
            and email address. Column names like <strong>Name</strong>, <strong>Full Name</strong>,{" "}
            <strong>Email</strong>, and <strong>Email Address</strong> are all recognised.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box
            component="label"
            htmlFor="bulk-import-file"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              p: 4,
              border: `2px dashed ${alpha(P, file ? 0.55 : 0.2)}`,
              borderRadius: 2,
              bgcolor: file ? alpha(P, 0.04) : "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": { borderColor: alpha(P, 0.5), bgcolor: alpha(P, 0.03) },
            }}
          >
            <input
              ref={fileInputRef}
              id="bulk-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
              }}
            />
            <UploadFileOutlinedIcon sx={{ fontSize: 42, color: file ? P : alpha(P, 0.35) }} />
            {file ? (
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: P }}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024).toFixed(1)} KB · click to change
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Click to select a file</Typography>
                <Typography variant="caption" color="text.secondary">.xlsx, .xls, .csv · max 5 MB</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
          <Button
            onClick={handlePreview}
            variant="contained"
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Parsing…" : "Preview Employees"}
          </Button>
        </DialogActions>
      </>
    );
  }

  // ── Step: Preview ───────────────────────────────────────────────────────────

  function renderPreview() {
    const s = previewSummary!;
    return (
      <>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Summary bar */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Chip label={`${s.wouldCreate} to import`}      color="success" size="small" />
            {s.alreadyExists   > 0 && <Chip label={`${s.alreadyExists} already exist`}   color="warning" size="small" />}
            {s.duplicateInFile > 0 && <Chip label={`${s.duplicateInFile} dup in file`}   color="info"    size="small" />}
            {s.invalid         > 0 && <Chip label={`${s.invalid} invalid`}               color="error"   size="small" />}
          </Stack>

          {s.wouldCreate === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No new employees to import. All rows are either duplicates or invalid.
            </Alert>
          )}

          <TableContainer sx={{ maxHeight: 320, border: `1px solid ${alpha("#000", 0.08)}`, borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((r) => {
                  const chip = PREVIEW_CHIP[r.status];
                  return (
                    <TableRow key={`${r.row}-${r.email}`}>
                      <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{r.row}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.fullName || <em style={{ color: "#999" }}>—</em>}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.email || <em style={{ color: "#999" }}>—</em>}</TableCell>
                      <TableCell>
                        <Chip
                          label={chip.label}
                          color={chip.color}
                          size="small"
                          title={r.reason}
                          sx={{ fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {s.total > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Showing all {s.total} rows.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setStep("upload"); setError(""); }} color="inherit" disabled={loading}>
            Back
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={s.wouldCreate === 0 || loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Importing…" : `Import ${s.wouldCreate} Employee${s.wouldCreate !== 1 ? "s" : ""}`}
          </Button>
        </DialogActions>
      </>
    );
  }

  // ── Step: Result ────────────────────────────────────────────────────────────

  function renderResult() {
    const s = resultSummary!;
    const hasSkipped = (s.alreadyExists + s.duplicateInFile + s.invalid + s.failed) > 0;
    return (
      <>
        <DialogContent>
          {s.created > 0 ? (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon />}
              sx={{ mb: 2 }}
            >
              Successfully added <strong>{s.created}</strong> employee{s.created !== 1 ? "s" : ""}.
              {hasSkipped && ` ${s.alreadyExists + s.duplicateInFile + s.invalid + s.failed} row${s.alreadyExists + s.duplicateInFile + s.invalid + s.failed !== 1 ? "s" : ""} skipped.`}
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No employees were added. All rows were skipped or failed.
            </Alert>
          )}

          {/* Summary chips */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
            {s.created         > 0 && <Chip label={`${s.created} added`}            color="success" size="small" />}
            {s.alreadyExists   > 0 && <Chip label={`${s.alreadyExists} existed`}    color="warning" size="small" />}
            {s.duplicateInFile > 0 && <Chip label={`${s.duplicateInFile} dup`}      color="info"    size="small" />}
            {s.invalid         > 0 && <Chip label={`${s.invalid} invalid`}          color="error"   size="small" />}
            {s.failed          > 0 && <Chip label={`${s.failed} failed`}            color="error"   size="small" />}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <TableContainer sx={{ maxHeight: 300, border: `1px solid ${alpha("#000", 0.08)}`, borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultRows.map((r) => {
                  const chip = IMPORT_CHIP[r.status];
                  return (
                    <TableRow key={`${r.row}-${r.email}`}>
                      <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{r.row}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.fullName || <em style={{ color: "#999" }}>—</em>}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.email || <em style={{ color: "#999" }}>—</em>}</TableCell>
                      <TableCell>
                        <Chip
                          label={chip.label}
                          color={chip.color}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{r.reason ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          {hasSkipped && (
            <Button
              onClick={downloadFailedCsv}
              startIcon={<DownloadOutlinedIcon />}
              color="inherit"
              size="small"
            >
              Download skipped rows
            </Button>
          )}
          <Button onClick={onClose} variant="contained">Done</Button>
        </DialogActions>
      </>
    );
  }

  const titles: Record<Step, string> = {
    upload:  "Import Employees",
    preview: "Import Preview",
    result:  "Import Complete",
  };

  return (
    <Dialog open={open} onClose={step === "result" ? onClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle>{titles[step]}</DialogTitle>
      {step === "upload"  && renderUpload()}
      {step === "preview" && renderPreview()}
      {step === "result"  && renderResult()}
    </Dialog>
  );
}
