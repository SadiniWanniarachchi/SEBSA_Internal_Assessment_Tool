import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// AdminUser Model
// HR/Admin accounts — separate collection from employees (spec §10)
// Note: A Super Admin role can be added in Phase 2 (spec §5)
// ─────────────────────────────────────────────────────────────────────────────

export interface IAdminUser extends Document {
  fullName:     string;
  email:        string;
  passwordHash: string;
  role:         "admin" | "super_admin"; // super_admin is Phase 2 (spec §5)
  createdAt:    Date;
  updatedAt:    Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["admin", "super_admin"], default: "admin" },
  },
  {
    timestamps: true,
  }
);


export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ?? mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
