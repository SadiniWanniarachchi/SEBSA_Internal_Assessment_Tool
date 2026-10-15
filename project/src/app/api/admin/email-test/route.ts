import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * GET /api/admin/email-test
 *
 * Admin-only configuration diagnostic. Validates environment variables
 * without making any outbound requests or sending any emails.
 *
 * Returns: config summary (key prefix only, never the full value), a list
 * of detected issues, and a `healthy` boolean.
 */
export async function GET(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const apiKey     = process.env.BREVO_API_KEY;
  const emailFrom  = process.env.EMAIL_FROM;
  const senderName = process.env.BREVO_SENDER_NAME;
  const hrCc       = process.env.HR_EMAIL_CC;
  const baseUrl    = process.env.APP_URL;

  const issues: string[] = [];

  if (!apiKey) {
    issues.push(
      "BREVO_API_KEY is not set. Email sending will fail immediately. " +
      "Generate an API key at https://app.brevo.com/settings/keys/api (Account → SMTP & API → API Keys tab).",
    );
  } else if (apiKey.startsWith("xsmtpsib-")) {
    issues.push(
      "BREVO_API_KEY starts with 'xsmtpsib-', which is a Brevo SMTP relay key. " +
      "The Brevo HTTP API requires a key starting with 'xkeysib-'. " +
      "Go to https://app.brevo.com/settings/keys/api, create a key under 'API Keys' (not 'SMTP'), and set BREVO_API_KEY to that value.",
    );
  } else if (!apiKey.startsWith("xkeysib-")) {
    issues.push(
      "BREVO_API_KEY does not start with 'xkeysib-'. Verify it is a valid Brevo HTTP API key.",
    );
  }

  if (!emailFrom) {
    issues.push(
      "EMAIL_FROM is not set — falling back to 'no-reply@sebsaworld.com'. " +
      "Ensure this address is verified under Senders & IPs in Brevo.",
    );
  }

  if (!hrCc) {
    issues.push(
      "HR_EMAIL_CC is not set. Certificate emails will be sent without a CC to HR.",
    );
  }

  if (!baseUrl) {
    issues.push(
      "APP_URL is not set — invitation links in emails will fall back to 'http://localhost:3000', " +
      "which is unreachable for real employees. " +
      "In Vercel: ensure APP_URL = https://sebsa-internal-assessment-tool.vercel.app is set.",
    );
  } else if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    issues.push(
      `APP_URL is '${baseUrl}'. Invitation emails will link to localhost, ` +
      "which is unreachable for real employees. Update it to the public deployment URL.",
    );
  }

  const keyDisplay = apiKey
    ? `${apiKey.slice(0, Math.min(12, apiKey.indexOf("-", 4) + 1))}…(${apiKey.length} chars)`
    : null;

  return NextResponse.json({
    success: true,
    data: {
      config: {
        BREVO_API_KEY:     keyDisplay,
        EMAIL_FROM:        emailFrom  ?? "(not set — using default)",
        BREVO_SENDER_NAME: senderName ?? "(not set — using default)",
        HR_EMAIL_CC:       hrCc       ?? "(not set)",
        APP_URL:           baseUrl    ?? "(not set — using localhost fallback)",
      },
      issues,
      healthy: issues.length === 0,
    },
  });
}

/**
 * POST /api/admin/email-test
 *
 * Admin-only. Sends a real test email to the authenticated admin's own
 * address so end-to-end Brevo delivery can be verified (including spam
 * folder). Returns the Brevo message ID for tracing in Brevo's activity log.
 *
 * Security: only the authenticated admin's own email (from the JWT via
 * x-user-email header) is used as recipient — never a user-supplied address.
 */
export async function POST(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const adminEmail = req.headers.get("x-user-email");
  if (!adminEmail) {
    return NextResponse.json(
      { success: false, error: "Admin email not available in session." },
      { status: 400 },
    );
  }

  const apiKey    = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM        ?? "no-reply@sebsaworld.com";
  const fromName  = process.env.BREVO_SENDER_NAME ?? "SEBSA Assessment Portal";

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "BREVO_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const sentAt = new Date().toISOString();

  const payload = {
    sender:      { name: fromName, email: fromEmail },
    to:          [{ email: adminEmail }],
    subject:     "SEBSA Assessment Portal — Email Delivery Test",
    htmlContent: `
      <div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;max-width:520px;margin:40px auto;padding:32px;border:1px solid #e5e7eb;border-radius:10px;">
        <p style="font-size:18px;font-weight:700;color:#1a0a3d;margin:0 0 12px;">Email delivery test</p>
        <p style="font-size:14px;color:#374151;margin:0 0 8px;">
          This is a diagnostic email from the <strong>SEBSA Assessment Portal</strong>.
          If you received it, Brevo delivery is working correctly.
        </p>
        <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">Sent at ${sentAt}</p>
      </div>
    `,
    textContent: [
      "Email delivery test — SEBSA Assessment Portal",
      "",
      "This is a diagnostic email. If you received it, Brevo delivery is working correctly.",
      "",
      `Sent at ${sentAt}`,
    ].join("\n"),
  };

  let res: Response;
  try {
    res = await fetch(BREVO_API_URL, {
      method:  "POST",
      headers: {
        "api-key":      apiKey,
        "Content-Type": "application/json",
        "Accept":       "application/json",
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";
    const isTimeout = (err as Error).name === "AbortError" || (err as Error).name === "TimeoutError";
    return NextResponse.json(
      { success: false, error: isTimeout ? "Request to Brevo timed out after 12 seconds." : `Network error: ${msg}` },
      { status: 502 },
    );
  }

  const responseText = await res.text().catch(() => "");

  if (!res.ok) {
    const snippet = responseText.slice(0, 400).replace(/[\r\n]+/g, " ").trim();
    console.error(`[EmailTest] Brevo returned ${res.status}: ${snippet}`);
    return NextResponse.json(
      {
        success: false,
        error:   `Brevo API returned HTTP ${res.status}.`,
        brevoResponse: snippet,
        guidance: res.status === 401
          ? "API key is invalid or wrong type. Verify BREVO_API_KEY starts with 'xkeysib-'."
          : res.status === 400
          ? "Sender address may not be verified in Brevo. Check EMAIL_FROM under Senders & IPs."
          : "Check the brevoResponse field for details.",
      },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  let messageId: string | null = null;
  try {
    const body = JSON.parse(responseText) as { messageId?: string };
    messageId = body.messageId ?? null;
  } catch { /* not a JSON body */ }

  console.log(`[EmailTest] Brevo accepted test email to ${adminEmail}. Message ID: ${messageId ?? "(none)"}`);

  return NextResponse.json({
    success: true,
    message: `Test email sent to ${adminEmail}. Check your inbox (and spam folder).`,
    data: {
      sentTo:    adminEmail,
      sentFrom:  fromEmail,
      messageId,
      sentAt,
      note: messageId
        ? `Use message ID '${messageId}' in Brevo's Activity Log to trace delivery.`
        : "Brevo did not return a message ID. Check Brevo Activity Log manually.",
    },
  });
}
