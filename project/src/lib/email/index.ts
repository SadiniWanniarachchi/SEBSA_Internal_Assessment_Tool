/**
 * Server-side email module — Brevo Transactional Email API v3.
 * Never import this in client components or pages marked "use client".
 *
 * Uses native fetch (available in Node 18+ / Next.js 14+) so no extra
 * package is required.  The Resend dependency in package.json is no longer
 * used by this module; it can be removed during a future dependency cleanup.
 *
 * NOTE: A 201 response from Brevo means the email was accepted for delivery;
 * it does not guarantee the message reached the recipient's inbox.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000; // abort if Brevo doesn't respond in 10 s

// ── Config ────────────────────────────────────────────────────────────────────
// Read lazily inside functions so module load never throws and tests can set
// env vars before calling.

interface EmailConfig {
  apiKey:    string;
  fromEmail: string;
  fromName:  string;
  hrCc:      string;
  baseUrl:   string;
}

function getConfig(): EmailConfig {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error(
      "[Email] BREVO_API_KEY is not configured. " +
      "Set it in your environment variables before sending email.",
    );
  }

  return {
    apiKey,
    fromEmail: process.env.EMAIL_FROM         ?? "no-reply@sebsaworld.com",
    fromName:  process.env.BREVO_SENDER_NAME  ?? "SEBSA Internal Assessment",
    hrCc:      process.env.HR_EMAIL_CC        ?? "",
    // NEXT_PUBLIC_BASE_URL is only consumed here (server-side).
    // It must be set to the production URL in every deployed environment.
    baseUrl:   process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  };
}

// ── Brevo send helper ─────────────────────────────────────────────────────────

interface BrevoRecipient {
  email: string;
  name?: string;
}

interface BrevoAttachment {
  name:    string;
  content: string; // base64-encoded
}

interface BrevoPayload {
  sender:      { name: string; email: string };
  to:          BrevoRecipient[];
  cc?:         BrevoRecipient[];
  subject:     string;
  htmlContent: string;
  attachment?: BrevoAttachment[];
}

async function sendBrevoEmail(payload: BrevoPayload, apiKey: string): Promise<void> {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

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
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("[Email] Brevo API request timed out after 10 seconds.");
    }
    throw new Error(`[Email] Network error contacting Brevo: ${(err as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text().catch(() => "(unreadable response)");
    console.error(`[Email] Brevo API returned ${res.status}. Response: ${text}`);
    // Include a sanitized snippet so the emailError stored in the Invitation
    // document contains actionable diagnostic information (e.g. "Unauthorized",
    // "sender not verified"). Cap at 200 chars to avoid storing HTML error pages.
    const snippet = text.slice(0, 200).replace(/[\r\n]+/g, " ").trim();
    throw new Error(`[Email] Brevo API error: HTTP ${res.status}. ${snippet}`);
  }
}

// ── Assessment Invitation ─────────────────────────────────────────────────────

export async function sendAssessmentInvitation(params: {
  toEmail:      string;
  employeeName: string;
  cycleLabel:   string;
  expiresAt:    Date;
}): Promise<void> {
  const { apiKey, fromEmail, fromName, baseUrl } = getConfig();

  const assessmentUrl = `${baseUrl}/assessment`;
  const expiryStr     = params.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  await sendBrevoEmail(
    {
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: params.toEmail, name: params.employeeName }],
      subject:     `[SEBSA] Your Internal Assessment is Ready — ${params.cycleLabel}`,
      htmlContent: `
        <h2>Hi ${params.employeeName},</h2>
        <p>Your SEBSA Internal Assessment for <strong>${params.cycleLabel}</strong> is now open.</p>
        <p>Please log in and complete your assessment at your earliest convenience:</p>
        <p><a href="${assessmentUrl}" style="background:#3E0B78;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
          Start Assessment
        </a></p>
        <p><strong>This invitation expires on ${expiryStr}.</strong> After that date you will not be able to start the assessment through this invitation.</p>
        <p>You have up to two attempts. If you score below 6 on your first attempt, you will be offered one retry with the same questions.</p>
        <hr/>
        <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
      `,
    },
    apiKey,
  );
}

// ── Certificate Email ─────────────────────────────────────────────────────────

/**
 * Email the PDF certificate to the employee (To:) with HR CC'd.
 * Returns void on success; throws on failure.
 */
export async function sendCertificateEmail(params: {
  toEmail:           string;
  employeeName:      string;
  cycleLabel:        string;
  score:             number;
  total:             number;
  passed:            boolean;
  certificatePdf:    Buffer;
  certificateNumber: string;
}): Promise<void> {
  const { apiKey, fromEmail, fromName, hrCc } = getConfig();

  if (!hrCc) {
    console.warn(
      "[Email] HR_EMAIL_CC is not configured — certificate will be sent without HR CC.",
    );
  }

  const ccList: BrevoRecipient[] = hrCc ? [{ email: hrCc }] : [];

  // Brevo requires base64-encoded attachment content
  const pdfBase64 = params.certificatePdf.toString("base64");
  const safeLabel = params.cycleLabel.replace(/\s+/g, "_");

  await sendBrevoEmail(
    {
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: params.toEmail, name: params.employeeName }],
      ...(ccList.length > 0 && { cc: ccList }),
      subject:     `SEBSA Assessment Certificate — ${params.cycleLabel}`,
      htmlContent: `
        <h2>Congratulations, ${params.employeeName}!</h2>
        <p>You have successfully completed the <strong>${params.cycleLabel}</strong> Internal Assessment.</p>
        <p><strong>Score: ${params.score} / ${params.total}</strong> — <strong style="color:${params.passed ? "#129B14" : "#A30D0D"}">${params.passed ? "PASS" : "FAIL"}</strong></p>
        <p>Your official certificate is attached to this email. You can also re-download it at any time from the assessment portal.</p>
        <p><strong>Certificate reference:</strong> ${params.certificateNumber}</p>
        <hr/>
        <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
      `,
      attachment: [
        {
          name:    `SEBSA_Certificate_${safeLabel}.pdf`,
          content: pdfBase64,
        },
      ],
    },
    apiKey,
  );
}
