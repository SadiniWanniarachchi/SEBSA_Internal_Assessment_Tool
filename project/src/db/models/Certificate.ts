import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Certificate Model
// One document per issued certificate (FR-07, FR-08, FR-09)
// ─────────────────────────────────────────────────────────────────────────────

export interface ICertificate extends Document {
  attemptId:         Types.ObjectId; // ref → Attempt
  certificateNumber: string;         // UUID
  filePath:          string;         // S3 key or file path
  issuedAt:          Date;
  createdAt:         Date;
  updatedAt:         Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", required: true, unique: true },
    certificateNumber: { type: String, required: true, unique: true },
    filePath: { type: String, required: true },
    issuedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
  }
);


export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate ?? mongoose.model<ICertificate>("Certificate", CertificateSchema);
