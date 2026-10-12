import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Attempt Model
// One document per employee per cycle (FR-05, FR-06, FR-10)
// selectedQuestionIds and answers stored for auditability (spec §10)
// ─────────────────────────────────────────────────────────────────────────────

export interface IAttempt extends Document {
  employeeId:          Types.ObjectId; // ref → Employee
  cycleId:             Types.ObjectId; // ref → AssessmentCycle
  selectedQuestionIds: Types.ObjectId[]; // ref → Question
  answers:             Map<string, "a" | "b" | "c" | "d">; // questionId -> answer
  score:               number;
  submittedAt:         Date;
  createdAt:           Date;
  updatedAt:           Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    cycleId:    { type: Schema.Types.ObjectId, ref: "AssessmentCycle", required: true },
    selectedQuestionIds: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
    answers: {
      type: Map,
      of: { type: String, enum: ["a", "b", "c", "d"] },
      required: true,
    },
    score: { type: Number, required: true, min: 0, max: 10 },
    submittedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
  }
);

// Index to enforce one attempt per employee per cycle (FR-10)
AttemptSchema.index({ employeeId: 1, cycleId: 1 }, { unique: true });

export const Attempt: Model<IAttempt> =
  mongoose.models.Attempt ?? mongoose.model<IAttempt>("Attempt", AttemptSchema);
