import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@/types";

// Pure Web Crypto / Edge Runtime compatible JWT helpers

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT for the given user.
 * @param payload  id, email, and role of the authenticated user
 * @returns        signed JWT string
 */
export async function signToken(payload: {
  id:    string;
  email: string;
  role:  UserRole;
}): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "8h";

  return new SignJWT({
    sub:   payload.id,
    email: payload.email,
    role:  payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT.
 * Throws if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as unknown as JwtPayload;
}
