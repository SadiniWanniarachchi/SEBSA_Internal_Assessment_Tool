/**
 * Next.js Instrumentation Hook — runs once when the Node.js server starts.
 * Pre-warms the MongoDB Atlas connection and validates required configuration.
 *
 * Requires experimental.instrumentationHook: true in next.config.mjs (Next.js 14).
 * The hook is stable and flag-free in Next.js 15+.
 */
export async function register() {
  // Only run on the Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── Required variable check ───────────────────────────────────────────────
    // Log clearly without printing secret values.
    const requiredVars = ["MONGODB_URI", "JWT_SECRET"];
    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.error(
        `[Config] FATAL: Missing required environment variable(s): ${missing.join(", ")}. ` +
        "The application will not function correctly until these are set.",
      );
    }

    if (!process.env.BREVO_API_KEY) {
      console.warn(
        "[Config] BREVO_API_KEY is not set. " +
        "Assessment invitations and certificate emails will fail until this is configured.",
      );
    }

    if (!process.env.HR_EMAIL_CC) {
      console.warn(
        "[Config] HR_EMAIL_CC is not set. Certificate emails will be sent without HR CC.",
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    if (!baseUrl || baseUrl.includes("localhost")) {
      console.warn(
        "[Config] NEXT_PUBLIC_BASE_URL is not set or points to localhost. " +
        "Email invitation links will use a local URL. Set the production URL before deploying.",
      );
    }

    // ── MongoDB pre-warm ──────────────────────────────────────────────────────
    try {
      // Dynamic import so this module is never bundled into the browser bundle
      const connectDB = (await import("@/db")).default;
      await connectDB();
      console.log("[Startup] MongoDB connection pre-warmed");
    } catch (err) {
      // Log and continue — the server still starts; each request retries the connection
      console.error("[Startup] MongoDB pre-warm failed:", (err as Error).message);
    }
  }
}
