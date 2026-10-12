import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// AdminAuditLog Model
// Records Admin actions for auditability (spec §13)
// ─────────────────────────────────────────────────────────────────────────────

export interface IAdminAuditLog extends Document {
  adminId:    Types.ObjectId; // ref → AdminUser
  action:     string;         // e.g. "cycle_sent", "question_added"
  targetId?:  Types.ObjectId; // ID of the affected record (nullable)
  targetType?: string;        // e.g. "cycle", "question", "employee"
  metadata?:  Record<string, any>; // extra context
  createdAt:  Date;
  updatedAt:  Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    action: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    targetType: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ?? mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
