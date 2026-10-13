/**
 * Dev endpoint security tests.
 *
 * Tests verify that /api/dev/* endpoints:
 *   1. Return 403 in production (server-side guard)
 *   2. Return 401 without a valid JWT token (in dev)
 *   3. Return 403 when accessed by an admin (employee-only endpoints)
 *
 * NOTE: Jest runs with NODE_ENV="test". The production guard is tested by
 * setting NODE_ENV to "production" inside each test and using jest.resetModules()
 * to reload the route module with the new env value.
 */

import { NextRequest } from "next/server";

function makeReq(method: string, cookieHeader?: string): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest("http://localhost:3000/api/dev/reset-attempt", {
    method,
    headers,
  });
}

// ─── Production guard ─────────────────────────────────────────────────────────

describe("Dev endpoint production guard", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    // Restore to test (Jest default)
    (process.env as NodeJS.ProcessEnv & { NODE_ENV: string }).NODE_ENV = "test";
    jest.resetModules();
  });

  it("reset-attempt GET: returns 403 in production", async () => {
    (process.env as NodeJS.ProcessEnv & { NODE_ENV: string }).NODE_ENV = "production";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require("@/app/api/dev/reset-attempt/route");
    const res = await GET(makeReq("GET"));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/production/i);
  });

  it("reset-attempt DELETE: returns 403 in production", async () => {
    (process.env as NodeJS.ProcessEnv & { NODE_ENV: string }).NODE_ENV = "production";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DELETE } = require("@/app/api/dev/reset-attempt/route");
    const res = await DELETE(makeReq("DELETE"));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/production/i);
  });

  it("new-cycle POST: returns 403 in production", async () => {
    (process.env as NodeJS.ProcessEnv & { NODE_ENV: string }).NODE_ENV = "production";
    const req = new NextRequest("http://localhost:3000/api/dev/new-cycle", { method: "POST" });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { POST } = require("@/app/api/dev/new-cycle/route");
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/production/i);
  });
});

// ─── Dev-mode auth guards (no DB calls needed — token check comes first) ──────

describe("Dev endpoint auth guards (development mode)", () => {
  // jest runs with NODE_ENV="test" which is != "production", so the prod guard
  // passes and the next check (JWT token) fires.

  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret_for_jest_at_least_32_characters_long!!";
  });

  it("reset-attempt DELETE: returns 401 when no cookie is present", async () => {
    const { DELETE } = await import("@/app/api/dev/reset-attempt/route");
    const res = await DELETE(makeReq("DELETE")); // no cookie
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("reset-attempt GET: returns 401 when no cookie is present", async () => {
    const { GET } = await import("@/app/api/dev/reset-attempt/route");
    const res = await GET(makeReq("GET")); // no cookie
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("new-cycle POST: returns 401 when no cookie is present", async () => {
    const req = new NextRequest("http://localhost:3000/api/dev/new-cycle", { method: "POST" });
    const { POST } = await import("@/app/api/dev/new-cycle/route");
    const res = await POST(req); // no cookie
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("reset-attempt DELETE: returns 403 when cookie holds a non-employee token", async () => {
    // Build a token signed as "admin" role — the endpoint requires "employee"
    const { signToken } = await import("@/lib/auth");
    const adminToken = await signToken({
      id: "000000000000000000000001",
      email: "admin@sebsaworld.com",
      role: "admin",
    });

    const { DELETE } = await import("@/app/api/dev/reset-attempt/route");
    const res = await DELETE(makeReq("DELETE", `token=${adminToken}`));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
