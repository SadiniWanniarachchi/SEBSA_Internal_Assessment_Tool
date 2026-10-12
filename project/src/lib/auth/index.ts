import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@/types";

const SALT_ROUNDS = 12;

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
