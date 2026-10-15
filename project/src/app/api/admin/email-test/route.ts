import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/admin/email-test
 *
 * Admin-only diagnostic endpoint. Validates email environment configuration
 * without sending any real emails or making external HTTP requests.
 *
 * Returns: config summary (API key prefix only, never the full key), a list
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
  const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL;

  const issues: string[] = [];

  if (!apiKey) {
    issues.push(
      "BREVO_API_KEY is not set. Email sending will fail immediately. " +
      "Generate an API key at https://app.brevo.com/settings/keys/api (Account → SMTP & API → API Keys tab).",
    );
  } else if (apiKey.startsWith("xsmtpsib-")) {
    issues.push(
      "BREVO_API_KEY starts with 'xsmtpsib-', which is a Brevo SMTP relay key. " +
      "The Brevo HTTP API (POST /v3/smtp/email) requires an API key that starts with 'xkeysib-'. " +
      "Go to https://app.brevo.com/settings/keys/api, create a new key under the 'API Keys' tab " +
      "(not 'SMTP'), copy it, and set BREVO_API_KEY to that value.",
    );
  } else if (!apiKey.startsWith("xkeysib-")) {
    issues.push(
      "BREVO_API_KEY does not start with 'xkeysib-'. Verify it is a valid Brevo HTTP API key " +
      "(not an SMTP relay key and not a key from another provider).",
    );
  }

  if (!emailFrom) {
    issues.push(
      "EMAIL_FROM is not set — falling back to 'no-reply@sebsaworld.com'. " +
      "Ensure this sender address is registered and verified under Senders & IPs in Brevo.",
    );
  }

  if (!hrCc) {
    issues.push(
      "HR_EMAIL_CC is not set. Certificate emails will be sent without a CC to HR.",
    );
  }

  if (!baseUrl) {
    issues.push(
      "NEXT_PUBLIC_BASE_URL is not set — invitation links will use 'http://localhost:3000'. " +
      "Set it to your production URL (e.g. https://sebsa.vercel.app) in all deployed environments.",
    );
  } else if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    issues.push(
      `NEXT_PUBLIC_BASE_URL is '${baseUrl}'. Invitation emails will link to localhost, ` +
      "which is unreachable for real employees. Update it to the public deployment URL.",
    );
  }

  // Redact the actual key value; show only prefix + length so admins can
  // confirm which key type is in use without exposing secret material.
  const keyDisplay = apiKey
    ? `${apiKey.slice(0, Math.min(12, apiKey.indexOf("-", 4) + 1) )}…(${apiKey.length} chars)`
    : null;

  return NextResponse.json({
    success: true,
    data: {
      config: {
        BREVO_API_KEY:        keyDisplay,
        EMAIL_FROM:           emailFrom  ?? "(not set — using default)",
        BREVO_SENDER_NAME:    senderName ?? "(not set — using default)",
        HR_EMAIL_CC:          hrCc       ?? "(not set)",
        NEXT_PUBLIC_BASE_URL: baseUrl    ?? "(not set — using localhost fallback)",
      },
      issues,
      healthy: issues.length === 0,
    },
  });
}
