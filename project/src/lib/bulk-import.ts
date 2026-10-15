// Pure helpers for bulk employee import — no DB access, fully testable.

export const NAME_SYNONYMS = ["name", "employee name", "full name", "fullname", "employee"];
export const EMAIL_SYNONYMS = ["email", "email address", "emailaddress", "mail"];

export interface DetectedColumns {
  nameCol: string | null;
  emailCol: string | null;
  missingCols: string[];
}

export function detectColumns(headers: string[]): DetectedColumns {
  let nameCol: string | null = null;
  let emailCol: string | null = null;

  for (const h of headers) {
    const norm = h.toLowerCase().trim();
    if (nameCol === null && NAME_SYNONYMS.includes(norm)) nameCol = h;
    if (emailCol === null && EMAIL_SYNONYMS.includes(norm)) emailCol = h;
  }

  const missingCols: string[] = [];
  if (!nameCol) missingCols.push('name (e.g. "Name", "Full Name", "Employee Name")');
  if (!emailCol) missingCols.push('email (e.g. "Email", "Email Address")');

  return { nameCol, emailCol, missingCols };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export type PreviewStatus = "would_create" | "already_exists" | "duplicate_in_file" | "invalid";
export type ImportStatus  = "created" | "already_exists" | "duplicate_in_file" | "invalid" | "failed";

export interface AnalyzedRow {
  row:      number;   // 1-based spreadsheet row (header = row 1, first data = row 2)
  fullName: string;
  email:    string;
  status:   PreviewStatus;
  reason?:  string;
}

export interface RawDataRow {
  name:  string;
  email: string;
}

/**
 * Classify each row: skip blanks, validate fields, detect file-level and
 * DB-level duplicates.  Pure — no DB calls; caller provides existingEmails.
 */
export function analyzeRows(
  dataRows:       RawDataRow[],
  existingEmails: ReadonlySet<string>,
  firstDataRow    = 2,
): AnalyzedRow[] {
  const results: AnalyzedRow[] = [];
  const seenInFile = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum   = firstDataRow + i;
    const fullName = dataRows[i].name.trim();
    const email    = normalizeEmail(dataRows[i].email);

    if (!fullName && !email) continue; // completely blank row

    if (!fullName) {
      results.push({ row: rowNum, fullName: "", email, status: "invalid", reason: "Name is missing." });
      continue;
    }
    if (!email) {
      results.push({ row: rowNum, fullName, email: "", status: "invalid", reason: "Email is missing." });
      continue;
    }
    if (!isValidEmail(email)) {
      results.push({ row: rowNum, fullName, email, status: "invalid", reason: "Invalid email format." });
      continue;
    }
    if (seenInFile.has(email)) {
      results.push({ row: rowNum, fullName, email, status: "duplicate_in_file", reason: "Email appears more than once in this file." });
      continue;
    }
    seenInFile.add(email);

    if (existingEmails.has(email)) {
      results.push({ row: rowNum, fullName, email, status: "already_exists", reason: "An employee with this email already exists." });
      continue;
    }

    results.push({ row: rowNum, fullName, email, status: "would_create" });
  }

  return results;
}
