import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Attempt Model
// Up to two attempts per employee per cycle (FR-05, FR-06, FR-10).
// attemptNumber 1 → first submission.
// attemptNumber 2 → retry (only allowed when attempt 1 score < 6).
// isFinal → true when no further attempts are permitted for this employee+cycle.
// ─────────────────────────────────────────────────────────────────────────────

export interface IAttempt extends Document {
  employeeId:          Types.ObjectId; // ref → Employee
  cycleId:             Types.ObjectId; // ref → AssessmentCycle
  attemptNumber:       number;         // 1 or 2
  selectedQuestionIds: Types.ObjectId[]; // ref → Question
  answers:             Map<string, "a" | "b" | "c" | "d">;
  score:               number;
  passed:              boolean;
  isFinal:             boolean; // true = no more retries permitted
  submittedAt:         Date;
  createdAt:           Date;
  updatedAt:           Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    cycleId:    { type: Schema.Types.ObjectId, ref: "AssessmentCycle", required: true },
    attemptNumber: { type: Number, required: true, min: 1, max: 2, default: 1 },
    selectedQuestionIds: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
    answers: {
      type: Map,
      of: { type: String, enum: ["a", "b", "c", "d"] },
      required: true,
    },
    score:    { type: Number, required: true, min: 0, max: 10 },
    passed:   { type: Boolean, required: true, default: false },
    isFinal:  { type: Boolean, required: true, default: false },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// One record per (employee, cycle, attempt number)
AttemptSchema.index({ employeeId: 1, cycleId: 1, attemptNumber: 1 }, { unique: true });
// Supports tracker query: find all attempts for a given cycle
AttemptSchema.index({ cycleId: 1 });
// Supports employee history queries
AttemptSchema.index({ employeeId: 1, cycleId: 1 });

export const Attempt: Model<IAttempt> =
  mongoose.models.Attempt ?? mongoose.model<IAttempt>("Attempt", AttemptSchema);
