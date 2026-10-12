// ─── Central TypeScript type definitions ──────────────────────────────────────
// These types mirror the database schema and are shared across the app.

// ── User Roles ────────────────────────────────────────────────────────────────
export type UserRole = "employee" | "admin";

// ── Status Enums ──────────────────────────────────────────────────────────────
export type ActiveStatus = "active" | "inactive";
export type CycleStatus  = "active" | "closed";

// ── Answer options ────────────────────────────────────────────────────────────
export type AnswerOption = "a" | "b" | "c" | "d";

// ─────────────────────────────────────────────────────────────────────────────
// Entity types (match DB rows)
// ─────────────────────────────────────────────────────────────────────────────

export interface Employee {
  id:           string;
  fullName:     string;
  email:        string;
  department:   string | null;
  status:       ActiveStatus;
  createdAt:    Date;
  updatedAt:    Date;
  // passwordHash is intentionally NOT included here — never send to client
}

export interface AdminUser {
  id:        string;
  fullName:  string;
  email:     string;
  role:      string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id:            string;
  questionText:  string;
  optionA:       string;
  optionB:       string;
  optionC:       string;
  optionD:       string;
  correctOption: AnswerOption;
  category:      string | null;
  status:        ActiveStatus;
  createdAt:     Date;
  updatedAt:     Date;
}

/** A question as served to the employee — correct answer is stripped out */
export interface QuestionForEmployee {
  id:           string;
  questionText: string;
  options:      { key: AnswerOption; text: string }[]; // shuffled
}

export interface AssessmentCycle {
  id:        string;
  label:     string;
  status:    CycleStatus;
  openedAt:  Date;
  openedBy:  string; // admin_users.id
  closedAt:  Date | null;
  createdAt: Date;
}

export interface Attempt {
  id:                  string;
  employeeId:          string;
  cycleId:             string;
  selectedQuestionIds: string[];
  answers:             Record<string, AnswerOption>;
  score:               number;
  submittedAt:         Date;
}

export interface Certificate {
  id:                string;
  attemptId:         string;
  certificateNumber: string; // UUID
  filePath:          string;
  issuedAt:          Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data:    T;
}

export interface ApiError {
  success: false;
  error:   string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// Auth / Session
// ─────────────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub:   string;      // user id (stringified)
  email: string;
  role:  UserRole;
  iat?:  number;
  exp?:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker / Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackerRow {
  employeeId:   string;
  fullName:     string;
  email:        string;
  department:   string | null;
  status:       "Not Started" | "Completed";
  score:        number | null;
  completedAt:  Date | null;
  certificateId?: string | null;
}
