/**
 * Next.js Instrumentation Hook — runs once when the Node.js server starts.
 * Pre-warms the MongoDB Atlas connection so the first login does not pay
 * the full TCP + TLS + auth handshake cost on the first request.
 *
 * Requires experimental.instrumentationHook: true in next.config.mjs (Next.js 14).
 * The hook is stable and flag-free in Next.js 15+.
 */
export async function register() {
  // Only run on the Node.js runtime (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
