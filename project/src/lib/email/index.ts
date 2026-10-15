/**
 * Server-side email module — Brevo Transactional Email API v3.
 * Never import this in client components or pages marked "use client".
 *
 * Uses native fetch (available in Node 18+ / Next.js 14+) so no extra
 * package is required.
 *
 * NOTE: A 201 response from Brevo means the email was accepted for delivery;
 * it does not guarantee the message reached the recipient's inbox.
 */

const BREVO_API_URL   = "https://api.brevo.com/v3/smtp/email";
const SEND_TIMEOUT_MS = 10_000;

// ── Config ────────────────────────────────────────────────────────────────────

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
    fromEmail: process.env.EMAIL_FROM        ?? "no-reply@sebsaworld.com",
    fromName:  process.env.BREVO_SENDER_NAME ?? "SEBSA Internal Assessment",
    hrCc:      process.env.HR_EMAIL_CC       ?? "",
    baseUrl:   process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  };
}

// ── HTML escape ───────────────────────────────────────────────────────────────
// Prevents HTML injection from dynamic values in email templates.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#x27;");
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
  sender:       { name: string; email: string };
  to:           BrevoRecipient[];
  cc?:          BrevoRecipient[];
  subject:      string;
  htmlContent:  string;
  textContent?: string;
  attachment?:  BrevoAttachment[];
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
    const text    = await res.text().catch(() => "(unreadable response)");
    console.error(`[Email] Brevo API returned ${res.status}. Response: ${text}`);
    const snippet = text.slice(0, 200).replace(/[\r\n]+/g, " ").trim();
    throw new Error(`[Email] Brevo API error: HTTP ${res.status}. ${snippet}`);
  }
}

// ── Assessment Invitation — HTML template ─────────────────────────────────────

function buildInvitationHtml(p: {
  employeeName: string;
  cycleLabel:   string;
  expiryStr:    string;
  loginUrl:     string;
}): string {
  const name  = escapeHtml(p.employeeName);
  const cycle = escapeHtml(p.cycleLabel);
  const exp   = escapeHtml(p.expiryStr);
  const url   = escapeHtml(p.loginUrl);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Internal Assessment Ready | SEBSA Assessment Portal</title>
</head>
<body style="margin:0;padding:0;background-color:#f0edf6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Hidden preheader text -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f0edf6;">
Your ${cycle} assessment is now open &mdash; complete it before ${exp}.&#160;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0edf6;">
<tr><td align="center" style="padding:40px 16px;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

    <!-- ── Header ─────────────────────────────────────────── -->
    <tr>
      <td style="background-color:#3E0B78;background:linear-gradient(135deg,#1a0a3d 0%,#3E0B78 55%,#6B21A8 100%);border-radius:12px 12px 0 0;padding:40px 40px 34px;text-align:center;">

        <p style="margin:0 0 8px;color:#ffffff;font-size:23px;font-weight:700;letter-spacing:-0.3px;line-height:1.2;">
          Internal Assessment Ready
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.6);font-size:11.5px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;">
          SEBSA Assessment Portal
        </p>

      </td>
    </tr>

    <!-- ── Body ───────────────────────────────────────────── -->
    <tr>
      <td style="background-color:#ffffff;padding:38px 40px 34px;">

        <!-- Greeting -->
        <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1a0a3d;line-height:1.3;">
          Hi ${name},
        </p>

        <!-- Intro -->
        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#374151;">
          Your SEBSA Internal Assessment for
          <strong style="color:#3E0B78;">${cycle}</strong>
          is now open! Please log in to the SEBSA Internal Assessment Portal and
          complete your assessment at your earliest convenience.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:34px;">
          <tr>
            <td align="center">
              <a href="${url}" target="_blank"
                 style="display:inline-block;background-color:#3E0B78;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:8px;letter-spacing:0.3px;">
                Start Assessment &rarr;
              </a>
            </td>
          </tr>
        </table>

        <!-- Info card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border-radius:8px;overflow:hidden;">
          <tr>
            <!-- Left accent bar -->
            <td width="4" style="background-color:#3E0B78;">&nbsp;</td>
            <!-- Card content -->
            <td style="background-color:#f8f5ff;padding:20px 22px;border-radius:0 8px 8px 0;">

              <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:#3E0B78;text-transform:uppercase;letter-spacing:1.5px;">
                Important Information
              </p>

              <!-- Expiry -->
              <p style="margin:0 0 10px;font-size:13.5px;color:#374151;line-height:1.6;">
                <strong style="color:#1a0a3d;">Invitation Expiry:</strong>&nbsp;${exp}
              </p>

              <!-- Attempts -->
              <p style="margin:0 0 10px;font-size:13.5px;color:#374151;line-height:1.6;">
                <strong style="color:#1a0a3d;">Maximum Attempts:</strong>&nbsp;2 attempts
              </p>

              <!-- Retry -->
              <p style="margin:0;font-size:13.5px;color:#374151;line-height:1.6;">
                <strong style="color:#1a0a3d;">Retry Policy:</strong>&nbsp;If you score below 6
                on your first attempt, you will be offered one retry using the same questions.
              </p>

            </td>
          </tr>
        </table>

        <!-- Expiry notice -->
        <p style="margin:0 0 26px;font-size:13.5px;line-height:1.7;color:#6b7280;padding-top:22px;border-top:1px solid #f3f4f6;">
          Please note that this invitation expires on
          <strong style="color:#1a0a3d;">${exp}</strong>.
          After that date, you will no longer be able to start the assessment through this
          invitation. We encourage you to complete your assessment before the expiry date.
        </p>

        <!-- Sign-off -->
        <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
          Best regards,<br>
          <strong style="color:#1a0a3d;">HR Team</strong><br>
          <span style="color:#9ca3af;font-size:12.5px;">Internal Assessment Portal</span>
        </p>

      </td>
    </tr>

    <!-- ── Footer ─────────────────────────────────────────── -->
    <tr>
      <td style="background-color:#f8f5ff;padding:20px 40px;border-top:1px solid #ede9fe;border-radius:0 0 12px 12px;text-align:center;">
        <p style="margin:0;font-size:11.5px;color:#9ca3af;line-height:1.8;">
          This is an automated message from the SEBSA Internal Assessment Portal.<br>
          Please do not reply to this email.
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

// ── Assessment Invitation — plain-text fallback ───────────────────────────────

function buildInvitationText(p: {
  employeeName: string;
  cycleLabel:   string;
  expiryStr:    string;
  loginUrl:     string;
}): string {
  return [
    `Hi ${p.employeeName},`,
    ``,
    `Your SEBSA Internal Assessment for ${p.cycleLabel} is now open!`,
    ``,
    `Please log in to the SEBSA Internal Assessment Portal and complete your assessment`,
    `at your earliest convenience:`,
    ``,
    `  ${p.loginUrl}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `IMPORTANT INFORMATION`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `  • Invitation Expiry:    ${p.expiryStr}`,
    `  • Maximum Attempts:     2 attempts`,
    `  • Retry Policy:         If you score below 6 on your first attempt,`,
    `                          you will be offered one retry using the same questions.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Please note that this invitation expires on ${p.expiryStr}. After that date, you`,
    `will no longer be able to start the assessment through this invitation.`,
    ``,
    `We encourage you to complete your assessment before the expiry date.`,
    ``,
    `Best regards,`,
    `HR Team`,
    `Internal Assessment Portal`,
    ``,
    `─────────────────────────────────────────────────────────`,
    `This is an automated message. Please do not reply to this email.`,
  ].join("\n");
}

// ── Assessment Invitation ─────────────────────────────────────────────────────

export async function sendAssessmentInvitation(params: {
  toEmail:      string;
  employeeName: string;
  cycleLabel:   string;
  expiresAt:    Date;
}): Promise<void> {
  const { apiKey, fromEmail, fromName, baseUrl } = getConfig();

  const loginUrl  = `${baseUrl}/login`;
  const expiryStr = params.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const templateData = {
    employeeName: params.employeeName,
    cycleLabel:   params.cycleLabel,
    expiryStr,
    loginUrl,
  };

  await sendBrevoEmail(
    {
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: params.toEmail, name: params.employeeName }],
      subject:     "Internal Assessment Ready | SEBSA Assessment Portal",
      htmlContent: buildInvitationHtml(templateData),
      textContent: buildInvitationText(templateData),
    },
    apiKey,
  );
}

// ── Certificate Email ─────────────────────────────────────────────────────────

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
  const pdfBase64 = params.certificatePdf.toString("base64");
  const safeLabel = params.cycleLabel.replace(/\s+/g, "_");

  const name  = escapeHtml(params.employeeName);
  const cycle = escapeHtml(params.cycleLabel);
  const cert  = escapeHtml(params.certificateNumber);

  await sendBrevoEmail(
    {
      sender: { name: fromName, email: fromEmail },
      to:     [{ email: params.toEmail, name: params.employeeName }],
      ...(ccList.length > 0 && { cc: ccList }),
      subject: `SEBSA Assessment Certificate — ${params.cycleLabel}`,
      htmlContent: `
        <h2>Congratulations, ${name}!</h2>
        <p>You have successfully completed the <strong>${cycle}</strong> Internal Assessment.</p>
        <p><strong>Score: ${params.score} / ${params.total}</strong> &mdash;
        <strong style="color:${params.passed ? "#129B14" : "#A30D0D"}">${params.passed ? "PASS" : "FAIL"}</strong></p>
        <p>Your official certificate is attached to this email. You can also re-download it at any time from the assessment portal.</p>
        <p><strong>Certificate reference:</strong> ${cert}</p>
        <hr/>
        <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
      `,
      textContent: [
        `Congratulations, ${params.employeeName}!`,
        ``,
        `You have successfully completed the ${params.cycleLabel} Internal Assessment.`,
        `Score: ${params.score} / ${params.total} — ${params.passed ? "PASS" : "FAIL"}`,
        ``,
        `Your official certificate is attached. You can also re-download it from the portal.`,
        `Certificate reference: ${params.certificateNumber}`,
        ``,
        `─────────────────────────────────────────`,
        `This is an automated message. Please do not reply to this email.`,
      ].join("\n"),
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
