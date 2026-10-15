import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// AssessmentCycle Model
// One document per 6-monthly cycle (FR-13, spec §10, §11)
// HR/Admin opens a new cycle; one cycle active at a time (spec §4 assumption)
// ─────────────────────────────────────────────────────────────────────────────

export interface IAssessmentCycle extends Document {
  label:         string;           // e.g. "2026 H2"
  passingScore:  number;           // minimum score out of 10 required to pass
  status:        "active" | "closed" | "deactivated";
  openedAt:      Date;
  openedBy:      Types.ObjectId;   // ref → AdminUser
  closedAt:      Date | null;
  deactivatedAt: Date | null;
  deactivatedBy: Types.ObjectId | null;  // ref → AdminUser
  createdAt:     Date;
  updatedAt:     Date;
}

const AssessmentCycleSchema = new Schema<IAssessmentCycle>(
  {
    label:         { type: String, required: true, trim: true },
    passingScore:  { type: Number, required: true, min: 0, max: 10, default: 8 },
    status:        { type: String, enum: ["active", "closed", "deactivated"], default: "active" },
    openedAt:      { type: Date, default: () => new Date() },
    openedBy:      { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    closedAt:      { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  {
    timestamps: true,
  }
);

// Index for finding the currently active cycle quickly (FR-02, FR-15)
AssessmentCycleSchema.index({ status: 1, openedAt: -1 });

export const AssessmentCycle: Model<IAssessmentCycle> =
  mongoose.models.AssessmentCycle ??
  mongoose.model<IAssessmentCycle>("AssessmentCycle", AssessmentCycleSchema);
