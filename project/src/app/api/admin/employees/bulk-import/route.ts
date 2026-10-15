import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireRole, hashPassword } from "@/lib/auth";
import connectDB from "@/db";
import { Employee } from "@/db/models";
import { detectColumns, analyzeRows, normalizeEmail, ImportStatus } from "@/lib/bulk-import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTS  = new Set([".xlsx", ".xls", ".csv"]);

async function parseFileToRows(
  file: File,
): Promise<{ ok: true; rows: Record<string, string>[] } | { ok: false; error: string }> {
  const lower = file.name.toLowerCase();
  const dot   = lower.lastIndexOf(".");
  const ext   = dot === -1 ? "" : lower.slice(dot);

  if (!ALLOWED_EXTS.has(ext)) {
    return { ok: false, error: "Unsupported file type. Please upload a .xlsx or .csv file." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb     = XLSX.read(buffer, { type: "buffer" });
    const ws     = wb.Sheets[wb.SheetNames[0]];
    const rows   = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
    return { ok: true, rows };
  } catch {
    return { ok: false, error: "Could not parse file. Ensure it is a valid .xlsx or .csv." };
  }
}

// POST /api/admin/employees/bulk-import
// ?preview=1  → parse + classify rows, no inserts
// (no param)  → parse, classify, and insert "would_create" rows
export async function POST(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const isPreview = req.nextUrl.searchParams.get("preview") === "1";

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ success: false, error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: "File size exceeds the 5 MB limit." }, { status: 400 });
  }

  const parsed = await parseFileToRows(file);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  const { rows } = parsed;
  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: "The file is empty or has no data rows." }, { status: 400 });
  }

  // Detect which columns to use
  const headers = Object.keys(rows[0]);
  const { nameCol, emailCol, missingCols } = detectColumns(headers);
  if (missingCols.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error:   `Could not identify required columns: ${missingCols.join("; ")}. Found: ${headers.join(", ")}.`,
      },
      { status: 422 },
    );
  }

  const dataRows = rows.map((r) => ({
    name:  String(r[nameCol!]  ?? ""),
    email: String(r[emailCol!] ?? ""),
  }));

  await connectDB();

  // Load all existing emails at once to avoid N+1 DB queries
  const existingDocs   = await Employee.find().select("email").lean();
  const existingEmails = new Set(existingDocs.map((e) => normalizeEmail(e.email)));

  const analyzed = analyzeRows(dataRows, existingEmails);

  // ── Preview mode: return classification without touching the DB ──────────
  if (isPreview) {
    return NextResponse.json({
      success: true,
      data: {
        rows: analyzed,
        summary: {
          wouldCreate:    analyzed.filter((r) => r.status === "would_create").length,
          alreadyExists:  analyzed.filter((r) => r.status === "already_exists").length,
          duplicateInFile: analyzed.filter((r) => r.status === "duplicate_in_file").length,
          invalid:        analyzed.filter((r) => r.status === "invalid").length,
          total:          analyzed.length,
        },
      },
    });
  }

  // ── Import mode: create every "would_create" row ─────────────────────────
  const defaultPassword = process.env.EMPLOYEE_DEFAULT_PASSWORD;

  interface ResultRow {
    row:      number;
    fullName: string;
    email:    string;
    status:   ImportStatus;
    reason?:  string;
  }

  const results: ResultRow[] = [];

  for (const r of analyzed) {
    if (r.status !== "would_create") {
      results.push({ row: r.row, fullName: r.fullName, email: r.email, status: r.status, reason: r.reason });
      continue;
    }

    try {
      const pwd          = defaultPassword || r.email;
      const passwordHash = await hashPassword(pwd);
      await Employee.create({ fullName: r.fullName, email: r.email, passwordHash });
      results.push({ row: r.row, fullName: r.fullName, email: r.email, status: "created" });
    } catch (err: unknown) {
      // MongoDB duplicate-key error (code 11000) — race condition guard
      if ((err as { code?: number }).code === 11000) {
        results.push({ row: r.row, fullName: r.fullName, email: r.email, status: "already_exists", reason: "Already exists (concurrent insert)." });
      } else {
        results.push({ row: r.row, fullName: r.fullName, email: r.email, status: "failed", reason: "Database error." });
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      rows: results,
      summary: {
        created:         results.filter((r) => r.status === "created").length,
        alreadyExists:   results.filter((r) => r.status === "already_exists").length,
        duplicateInFile: results.filter((r) => r.status === "duplicate_in_file").length,
        invalid:         results.filter((r) => r.status === "invalid").length,
        failed:          results.filter((r) => r.status === "failed").length,
        total:           results.length,
      },
    },
  });
}
