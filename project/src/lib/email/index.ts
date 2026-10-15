

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
    baseUrl:   process.env.APP_URL ?? "http://localhost:3000",
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

async function sendBrevoEmail(payload: BrevoPayload, apiKey: string): Promise<string | null> {
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

  // Return Brevo's message ID so callers can store it for delivery tracing.
  try {
    const body = await res.json() as { messageId?: string };
    if (body.messageId) {
      console.log(`[Email] Brevo accepted message. ID: ${body.messageId} → to: ${payload.to.map((r) => r.email).join(", ")}`);
      return body.messageId;
    }
  } catch {
    // Response body unreadable — not a failure, Brevo already returned 2xx.
  }
  return null;
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
<body style="margin:0;padding:0;background-color:#ede9f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Hidden preheader -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ede9f7;">
Your ${cycle} assessment is now open &mdash; complete it before ${exp}.&#160;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ede9f7;">
<tr><td align="center" style="padding:36px 16px 48px;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

    <!-- ── Header ─────────────────────────────────────────── -->
    <tr>
      <td style="background:linear-gradient(145deg,#120534 0%,#3E0B78 60%,#5b1fa8 100%);border-radius:14px 14px 0 0;padding:44px 44px 36px;text-align:center;">

        <!-- Icon circle -->
        <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background-color:rgba(255,255,255,0.12);margin-bottom:18px;line-height:52px;font-size:24px;text-align:center;">
          &#128196;
        </div>

        <p style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
          Internal Assessment Ready
        </p>
        <p style="margin:0;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;">
          SEBSA Assessment Portal
        </p>

      </td>
    </tr>

    <!-- ── Body ───────────────────────────────────────────── -->
    <tr>
      <td style="background-color:#ffffff;padding:40px 44px 36px;">

        <!-- Greeting -->
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#120534;line-height:1.25;">
          Hi ${name},
        </p>
        <p style="margin:0 0 28px;font-size:14px;color:#8b8fa8;font-weight:500;letter-spacing:0.2px;">
          You have a new assessment waiting for you.
        </p>

        <!-- Intro -->
        <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#374151;">
          Your SEBSA Internal Assessment for&nbsp;<strong style="color:#3E0B78;">${cycle}</strong>&nbsp;is
          now open. Please log in to the portal and complete your assessment at your earliest convenience.
        </p>

        <!-- ── CTA: highlighted-text style ── -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
          <tr>
            <td align="center" style="padding:4px 0 8px;">
              <!-- Thin rule above -->
              <div style="width:40px;height:2px;background-color:#ede9f7;margin:0 auto 20px;"></div>

              <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1.8px;text-transform:uppercase;">
                Ready to begin?
              </p>

              <!-- Highlighted-text link — background sits tight behind the letters -->
              <a href="${url}" target="_blank"
                 style="font-size:22px;font-weight:900;text-decoration:none;color:#120534;letter-spacing:-0.3px;line-height:1.4;
                        background-color:#d8b4fe;
                        padding:3px 10px 5px;
                        border-radius:5px;
                        display:inline;">
                Start Assessment &#8594;
              </a>

              <!-- Fallback URL note for plain clients -->
              <p style="margin:14px 0 0;font-size:11.5px;color:#9ca3af;">
                Or copy this link:&nbsp;
                <a href="${url}" style="color:#6d28d9;text-decoration:underline;word-break:break-all;">${url}</a>
              </p>

              <!-- Thin rule below -->
              <div style="width:40px;height:2px;background-color:#ede9f7;margin:20px auto 0;"></div>
            </td>
          </tr>
        </table>

        <!-- Info card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr>
            <td style="background-color:#f9f7ff;border-radius:10px;border:1px solid #ede9f7;padding:22px 24px;">

              <p style="margin:0 0 16px;font-size:10px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:1.8px;">
                Important Details
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="20" valign="top" style="padding-top:1px;font-size:14px;color:#6d28d9;">&#9679;</td>
                  <td style="font-size:13.5px;color:#374151;line-height:1.65;padding-bottom:10px;">
                    <strong style="color:#120534;">Invitation Expiry:</strong>&nbsp;${exp}
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="padding-top:1px;font-size:14px;color:#6d28d9;">&#9679;</td>
                  <td style="font-size:13.5px;color:#374151;line-height:1.65;padding-bottom:10px;">
                    <strong style="color:#120534;">Maximum Attempts:</strong>&nbsp;2 attempts
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="padding-top:1px;font-size:14px;color:#6d28d9;">&#9679;</td>
                  <td style="font-size:13.5px;color:#374151;line-height:1.65;">
                    <strong style="color:#120534;">Retry Policy:</strong>&nbsp;If you score below 6
                    on your first attempt, you will be offered one retry.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Expiry notice -->
        <p style="margin:0 0 28px;font-size:13px;line-height:1.7;color:#9ca3af;">
          This invitation expires on <strong style="color:#374151;">${exp}</strong>.
          After that date you will no longer be able to access the assessment through this link.
        </p>

        <!-- Sign-off -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-top:1px solid #f3f4f6;padding-top:22px;">
              <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                Best regards,<br>
                <strong style="color:#120534;">HR Team</strong><br>
                <span style="color:#9ca3af;font-size:12px;">SEBSA Internal Assessment Portal</span>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- ── Footer ─────────────────────────────────────────── -->
    <tr>
      <td style="background-color:#f3f0fb;padding:18px 44px;border-top:1px solid #e5dffa;border-radius:0 0 14px 14px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#a8a4be;line-height:1.9;">
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
}): Promise<{ messageId: string | null }> {
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

  const messageId = await sendBrevoEmail(
    {
      sender:      { name: fromName, email: fromEmail },
      to:          [{ email: params.toEmail, name: params.employeeName }],
      subject:     "Internal Assessment Ready | SEBSA Assessment Portal",
      htmlContent: buildInvitationHtml(templateData),
      textContent: buildInvitationText(templateData),
    },
    apiKey,
  );

  return { messageId };
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
