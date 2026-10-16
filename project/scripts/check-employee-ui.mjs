// Run after npm run build: node scripts/check-employee-ui.mjs
// Isolated browser fixtures only: all API calls are intercepted, never sent to the database.
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import next from "next";
import { chromium, expect } from "@playwright/test";
import { SignJWT } from "jose";

process.env.JWT_SECRET = "isolated-browser-test-secret-not-for-real-sessions";
// The startup hook may pre-warm MongoDB; keep that away from configured real databases too.
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/isolated-ui-check?serverSelectionTimeoutMS=1000";
const app = next({ dev: false, hostname: "127.0.0.1", port: 3107 });
await app.prepare();
const server = createServer(app.getRequestHandler());
await new Promise(resolve => server.listen(3107, "127.0.0.1", resolve));
const base = "http://127.0.0.1:3107";
const screenshots = mkdtempSync(join(tmpdir(), "sebsa-ui-check-"));
let browser;
try {
  browser = await chromium.launch({ ...(process.platform === "win32" ? { channel: "msedge" } : {}), headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  const certificate = { id: "cert-1", certificateNumber: "test-owned-certificate", issuedAt: "2026-01-02T12:00:00Z", score: 9, cycleLabel: "Historical cycle" };
  const initial = () => ({
    user: { id: "browser-fixture", fullName: "UI Test Employee", email: "ui@example.test", role: "employee" },
    activeCycle: { id: "cycle-1", label: "Knowledge Assessment", deadline: "1 January 2099", invitation: { expiresAt: "2099-01-01T12:00:00Z", status: "pending" } },
    pendingAssessment: true, canRetry: false, currentAttempt: null,
    completedAssessmentCount: 2, certificates: [certificate],
  });
  let data = initial();
  let getFailure = false;
  let downloadFailure = false;
  let logoutFailure = false;
  let loginMode = "invalid";
  let releaseLogin;
  let releaseSession;
  let sessionPaused = false;
  let authGets = 0;
  const unexpectedApis = [];
  const cookie = async role => {
    const token = await new SignJWT({ sub: "browser-fixture", role, email: "ui@example.test" })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    await context.addCookies([{ name: "token", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
  };
  await context.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === "/api/auth" && method === "GET") {
      authGets++;
      if (sessionPaused) await new Promise(resolve => { releaseSession = resolve; });
      return route.fulfill({ status: getFailure ? 503 : 200, json: getFailure ? { success: false, error: "Service temporarily unavailable." } : { success: true, data } });
    }
    if (path === "/api/auth" && method === "POST") {
      if (loginMode === "network") return route.abort();
      if (loginMode === "loading") await new Promise(resolve => { releaseLogin = resolve; });
      if (["employee", "admin"].includes(loginMode)) {
        await cookie(loginMode);
        data.user.role = loginMode;
        return route.fulfill({ json: { success: true, data: { role: loginMode } } });
      }
      return route.fulfill({ status: 401, json: { success: false, error: "Incorrect email or password." } });
    }
    if (path === "/api/auth" && method === "DELETE") {
      if (!logoutFailure) await context.clearCookies();
      return route.fulfill({ status: logoutFailure ? 503 : 200, json: { success: !logoutFailure } });
    }
    if (path === `/api/certificates/${certificate.certificateNumber}`) {
      if (downloadFailure) return route.fulfill({ status: 503, json: { success: false, error: "Certificate temporarily unavailable." } });
      return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4\n% isolated browser test fixture" });
    }
    // Admin data is outside this UI test; do not let redirects touch real APIs.
    if (!path.startsWith("/api/admin/")) unexpectedApis.push(`${method} ${path}`);
    return route.fulfill({ status: 503, json: { success: false, error: "Isolated UI check" } });
  });
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "horizontal overflow");

  await page.goto(`${base}/login`);
  await expect(page.getByRole("heading", { name: "Assessment, Simplified." })).toBeVisible();
  await expect(page.getByLabel("Email Address", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  assert.equal(await page.getByText(/QUICK DEMO|Employee: Sadini|Admin: System/).count(), 0);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
    const panel = page.getByRole("complementary");
    await expect(panel).toHaveCSS("background-color", "rgb(62, 11, 120)");
    const steps = panel.getByRole("listitem");
    await expect(steps).toHaveCount(3);
    const first = await steps.nth(0).boundingBox();
    const second = await steps.nth(1).boundingBox();
    assert.ok(width < 600 ? second.y > first.y : second.x > first.x);
    if ([1440, 390].includes(width)) await page.screenshot({ path: join(screenshots, `login-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByLabel("Email Address", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Email Address", { exact: true }).fill("ui@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Show password", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.locator(".MuiAlert-root")).toContainText("Incorrect email or password.");
  loginMode = "network";
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.locator(".MuiAlert-root")).toContainText("Network error");
  loginMode = "loading";
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByRole("button", { name: /Signing in/ })).toBeDisabled();
  await expect.poll(() => Boolean(releaseLogin)).toBe(true);
  releaseLogin();
  await expect(page.locator(".MuiAlert-root")).toBeVisible();
  loginMode = "employee";
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page).toHaveURL(`${base}/dashboard`);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toContainText("UI Test Employee");
  console.log("PASS login validation, password keyboard control, errors/loading, employee redirect and responsive workflow");

  const loadDashboard = async () => {
    authGets = 0;
    await page.goto(`${base}/dashboard`);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    assert.equal(authGets, 1, "one session request per dashboard mount");
  };
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
    await expect(page.getByRole("link", { name: "Start Assessment", exact: true })).toBeVisible();
    if ([1440, 390].includes(width)) await page.screenshot({ path: join(screenshots, `dashboard-${width}.png`), fullPage: true });
  }
  data.activeCycle.invitation = null;
  await loadDashboard();
  await expect(page.getByRole("link", { name: /Start/ })).toHaveCount(0);
  data = initial(); data.activeCycle.invitation.expiresAt = new Date(Date.now() + 2500).toISOString();
  await loadDashboard();
  await expect(page.getByRole("link", { name: "Start Assessment", exact: true })).toBeVisible();
  await expect(page.getByText("Invitation expired", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: /Start/ })).toHaveCount(0);
  data = initial(); data.activeCycle.invitation.expiresAt = "2000-01-01T12:00:00Z";
  await loadDashboard();
  await expect(page.getByText("Invitation expired", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start/ })).toHaveCount(0);
  data = initial(); data.pendingAssessment = false; data.canRetry = true;
  data.currentAttempt = { score: 3, passed: false, isFinal: false, attemptNumber: 1 };
  await loadDashboard();
  await expect(page.getByRole("link", { name: "Start Second Attempt", exact: true })).toBeVisible();
  data.canRetry = false; data.currentAttempt = { score: 9, passed: true, isFinal: true, attemptNumber: 2 };
  data.activeCycle.invitation.status = "completed";
  data.activeCycle.invitation.expiresAt = "2000-01-01T12:00:00Z";
  await loadDashboard();
  await expect(page.getByRole("link", { name: "View Result", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start/ })).toHaveCount(0);
  data.activeCycle = null; data.currentAttempt = null;
  await loadDashboard();
  await expect(page.getByText("Historical cycle", { exact: true })).toBeVisible();
  downloadFailure = true;
  await page.getByRole("button", { name: /Download/ }).first().click();
  await expect(page.locator(".MuiAlert-root")).toContainText(/certificate/i);
  downloadFailure = false;
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download/ }).first().click();
  await download;
  data.certificates = [];
  await loadDashboard();
  await expect(page.getByText("No certificates yet", { exact: true })).toBeVisible();
  getFailure = true;
  await page.goto(`${base}/dashboard`);
  await expect(page.locator(".MuiAlert-root")).toBeVisible();
  getFailure = false;
  await page.getByRole("button", { name: /Try again|Retry/i }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  sessionPaused = true;
  await page.goto(`${base}/dashboard`);
  await expect.poll(() => Boolean(releaseSession)).toBe(true);
  await expect(page.getByRole("link", { name: /Start/ })).toHaveCount(0);
  sessionPaused = false; releaseSession();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  console.log("PASS dashboard responsive layouts, one-request loading, errors/retry, empty/no-invitation/expired/retry/final states and historical certificate downloads");

  logoutFailure = true;
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page.locator(".MuiAlert-root")).toContainText("Unable to log out");
  logoutFailure = false;
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(`${base}/login`);
  loginMode = "admin";
  await page.getByLabel("Email Address", { exact: true }).fill("ui@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page).toHaveURL(`${base}/admin/tracker`);
  assert.deepEqual(unexpectedApis, []);
  assert.deepEqual(pageErrors, []);
  console.log("PASS logout success/failure and admin redirect; no unexpected API calls or browser errors");
  console.log(`Screenshots: ${screenshots}`);
} catch (error) {
  console.error("FAIL browser verification:", error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await app.close();
}
