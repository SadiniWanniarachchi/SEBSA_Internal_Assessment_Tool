import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Question Model
// The question bank — up to 60 active questions (FR-03, FR-11)
// Multiple choice, exactly one correct option per question (spec §4 assumption)
// ─────────────────────────────────────────────────────────────────────────────

export interface IQuestion extends Document {
  questionText:  string;
  optionA:       string;
  optionB:       string;
  optionC:       string;
  optionD:       string;
  correctOption: "a" | "b" | "c" | "d";
  category:      string | null;
  status:        "active" | "inactive";
  createdAt:     Date;
  updatedAt:     Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText:  { type: String, required: true, trim: true },
    optionA:       { type: String, required: true, trim: true },
    optionB:       { type: String, required: true, trim: true },
    optionC:       { type: String, required: true, trim: true },
    optionD:       { type: String, required: true, trim: true },
    correctOption: { type: String, enum: ["a", "b", "c", "d"], required: true },
    category:      { type: String, default: null, trim: true },
    // status allows Admin to retire a question without deleting history (spec §10)
    status:        { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);

// Index for filtering active questions quickly
QuestionSchema.index({ status: 1 });

export const Question: Model<IQuestion> =
  mongoose.models.Question ?? mongoose.model<IQuestion>("Question", QuestionSchema);
