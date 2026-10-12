import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Next.js Middleware — runs on every request before the page/API handler.
 * Protects employee and admin routes; redirects unauthenticated users to /login.
 * Spec section 13: RBAC between Employee and Admin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public routes — no auth required ──────────────────────────────────────
  const PUBLIC_PATHS = ["/login", "/api/auth"];
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Extract JWT cookie ────────────────────────────────────────────────────
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Verify token ──────────────────────────────────────────────────────────
  const payload = await verifyToken(token).catch(() => null);

  if (!payload) {
    // Invalid or expired token — clear it and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // ── Admin-only route protection ───────────────────────────────────────────
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminRoute && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Employee-only route protection ────────────────────────────────────────
  const isEmployeeRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assessment") ||
    pathname.startsWith("/certificates");

  if (isEmployeeRoute && payload.role !== "employee") {
    return NextResponse.redirect(new URL("/admin/tracker", request.url));
  }

  // Forward the user identity to API routes via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id",   payload.sub);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
