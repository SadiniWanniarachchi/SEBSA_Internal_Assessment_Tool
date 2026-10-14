import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Invitation Model
// One record per employee per cycle (created when Admin sends a cycle).
// Tracks per-employee email delivery and the 7-day expiry window.
// ─────────────────────────────────────────────────────────────────────────────

export interface IInvitation extends Document {
  employeeId:   Types.ObjectId; // ref → Employee
  cycleId:      Types.ObjectId; // ref → AssessmentCycle
  sentAt:       Date;
  expiresAt:    Date;           // sentAt + 7 days (UTC)
  status:       "pending" | "opened" | "completed" | "resent" | "expired";
  emailStatus:  "sent" | "failed";
  emailError?:  string;
  resentAt?:    Date;           // set when a resent replaces this invitation
  createdAt:    Date;
  updatedAt:    Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    employeeId:  { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    cycleId:     { type: Schema.Types.ObjectId, ref: "AssessmentCycle", required: true },
    sentAt:      { type: Date, default: () => new Date() },
    expiresAt:   { type: Date, required: true },
    status:      {
      type: String,
      enum: ["pending", "opened", "completed", "resent", "expired"],
      default: "pending",
    },
    emailStatus: { type: String, enum: ["sent", "failed"], default: "sent" },
    emailError:  { type: String },
    resentAt:    { type: Date },
  },
  { timestamps: true }
);

// Fast per-employee lookup when checking invitation validity
InvitationSchema.index({ employeeId: 1, cycleId: 1 });
// Tracker aggregate queries
InvitationSchema.index({ cycleId: 1 });

export const Invitation: Model<IInvitation> =
  mongoose.models.Invitation ?? mongoose.model<IInvitation>("Invitation", InvitationSchema);
