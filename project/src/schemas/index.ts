import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Questions ────────────────────────────────────────────────────────────────
export const questionSchema = z.object({
  questionText:  z.string().min(5, "Question text must be at least 5 characters"),
  optionA:       z.string().min(1, "Option A is required"),
  optionB:       z.string().min(1, "Option B is required"),
  optionC:       z.string().min(1, "Option C is required"),
  optionD:       z.string().min(1, "Option D is required"),
  correctOption: z.enum(["a", "b", "c", "d"], { message: "Correct option must be a, b, c, or d" }),
  category:      z.string().optional(),
  status:        z.enum(["active", "inactive"]).default("active"),
});
export type QuestionInput = z.infer<typeof questionSchema>;

// ─── Employees ────────────────────────────────────────────────────────────────
// Only Name + Email are required for employee creation.
// The initial password is set server-side via EMPLOYEE_DEFAULT_PASSWORD env var.
export const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email:    z.string().email("Please enter a valid email address"),
  status:   z.enum(["active", "inactive"]).default("active"),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const updateEmployeeSchema = employeeSchema.partial().extend({
  password: z.string().min(8).optional(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ─── Assessment Cycles ────────────────────────────────────────────────────────
export const createCycleSchema = z.object({
  label:        z.string().min(3, "Cycle label must be at least 3 characters"),
  passingScore: z.number().int().min(0).max(10).default(8),
});
export type CreateCycleInput = z.infer<typeof createCycleSchema>;

// ─── Assessment Submission ────────────────────────────────────────────────────
export const submitAssessmentSchema = z.object({
  cycleId: z.string().min(1, "Cycle ID is required"),
  answers: z.record(
    z.string(),
    z.enum(["a", "b", "c", "d"])
  ).refine(
    (answers) => Object.keys(answers).length === 10,
    { message: "All 10 questions must be answered before submitting" }
  ),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
