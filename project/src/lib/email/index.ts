import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM     = process.env.EMAIL_FROM    ?? "no-reply@sebsaworld.com";
const HR_CC    = process.env.HR_EMAIL_CC   ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// ─── Assessment Invitation ────────────────────────────────────────────────────
export async function sendAssessmentInvitation(params: {
  toEmail:      string;
  employeeName: string;
  cycleLabel:   string;
  expiresAt:    Date;
}): Promise<void> {
  const assessmentUrl = `${BASE_URL}/assessment`;
  const expiryStr     = params.expiresAt.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  await resend.emails.send({
    from:    FROM,
    to:      params.toEmail,
    subject: `[SEBSA] Your Internal Assessment is Ready — ${params.cycleLabel}`,
    html: `
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
  });
}

// ─── Certificate Email ────────────────────────────────────────────────────────
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
  if (!HR_CC) {
    console.warn("[Email] HR_EMAIL_CC is not configured — certificate will be sent without HR CC.");
  }

  const ccList = HR_CC ? [HR_CC] : [];

  await resend.emails.send({
    from:    FROM,
    to:      params.toEmail,
    cc:      ccList,
    subject: `SEBSA Assessment Certificate — ${params.cycleLabel}`,
    html: `
      <h2>Congratulations, ${params.employeeName}!</h2>
      <p>You have successfully completed the <strong>${params.cycleLabel}</strong> Internal Assessment.</p>
      <p><strong>Score: ${params.score} / ${params.total}</strong> — <strong style="color:${params.passed ? "#129B14" : "#A30D0D"}">${params.passed ? "PASS" : "FAIL"}</strong></p>
      <p>Your official certificate is attached to this email. You can also re-download it at any time from the assessment portal.</p>
      <p><strong>Certificate reference:</strong> ${params.certificateNumber}</p>
      <hr/>
      <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
    `,
    attachments: [
      {
        filename: `SEBSA_Certificate_${params.cycleLabel.replace(/\s+/g, "_")}.pdf`,
        content:  params.certificatePdf,
      },
    ],
  });
}
