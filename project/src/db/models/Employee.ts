import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Employee Model
// One document per SEBSA employee who can log in (FR-01, FR-12)
// ─────────────────────────────────────────────────────────────────────────────

export interface IEmployee extends Document {
  fullName:     string;
  email:        string;
  department:   string | null;
  passwordHash: string;   // bcrypt hash — NEVER store plain text (§13)
  status:       "active" | "inactive";
  createdAt:    Date;
  updatedAt:    Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    department:   { type: String, default: null, trim: true },
    passwordHash: { type: String, required: true },
    status:       { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt
  }
);


// Prevent model re-registration on hot reload
export const Employee: Model<IEmployee> =
  mongoose.models.Employee ?? mongoose.model<IEmployee>("Employee", EmployeeSchema);
