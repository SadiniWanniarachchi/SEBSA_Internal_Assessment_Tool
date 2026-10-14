import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@/types";

// 10 rounds in dev (~100 ms), 12 in production (~400 ms) — bcrypt cost scales exponentially
const SALT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

// ─── Password hashing ─────────────────────────────────────────────────────────

/** Hash a plain-text password. Never store plain passwords. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compare a plain-text password against a stored hash. */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { signToken, verifyToken } from "./jwt";
