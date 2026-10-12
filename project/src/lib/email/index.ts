import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.EMAIL_FROM    ?? "no-reply@sebsaworld.com";
const HR_CC   = process.env.HR_EMAIL_CC   ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// ─── Assessment Invitation ────────────────────────────────────────────────────
/**
 * Send the assessment invitation email to a single employee.
 * Called in bulk by the "Send Assessment" cycle action (FR-13).
 */
export async function sendAssessmentInvitation(params: {
  toEmail:    string;
  employeeName: string;
  cycleLabel: string;
}): Promise<void> {
  const assessmentUrl = `${BASE_URL}/assessment`;

  await resend.emails.send({
    from:    FROM,
    to:      params.toEmail,
    subject: `[SEBSA] Your Internal Assessment is Ready — ${params.cycleLabel}`,
    html: `
      <h2>Hi ${params.employeeName},</h2>
      <p>Your SEBSA Internal Assessment for <strong>${params.cycleLabel}</strong> is now open.</p>
      <p>Please log in and complete your assessment at your earliest convenience:</p>
      <p><a href="${assessmentUrl}" style="background:#1E3A5F;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
        Start Assessment
      </a></p>
      <p>You have one attempt. Please ensure you have 10–15 minutes of uninterrupted time.</p>
      <hr/>
      <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
    `,
  });
}

// ─── Certificate Email ────────────────────────────────────────────────────────
/**
 * Email the PDF certificate to the employee immediately after submission.
 * CC's the HR/Admin email as required by FR-08.
 */
export async function sendCertificateEmail(params: {
  toEmail:        string;
  employeeName:   string;
  cycleLabel:     string;
  score:          number;
  certificatePdf: Buffer; // raw PDF bytes
  certificateNumber: string;
}): Promise<void> {
  const ccList = HR_CC ? [HR_CC] : [];

  await resend.emails.send({
    from:    FROM,
    to:      params.toEmail,
    cc:      ccList,
    subject: `[SEBSA] Your Assessment Certificate — ${params.cycleLabel}`,
    html: `
      <h2>Congratulations, ${params.employeeName}!</h2>
      <p>You have successfully completed the <strong>${params.cycleLabel}</strong> Internal Assessment.</p>
      <p><strong>Your score: ${params.score} / 10</strong></p>
      <p>Your certificate is attached to this email. You can also re-download it anytime by logging into the assessment portal.</p>
      <p><strong>Certificate ID:</strong> ${params.certificateNumber}</p>
      <hr/>
      <p style="color:#888;font-size:12px;">SEBSA Internal HR System — Do not reply to this email.</p>
    `,
    attachments: [
      {
        filename:    `SEBSA_Certificate_${params.cycleLabel.replace(/\s+/g, "_")}.pdf`,
        content:     params.certificatePdf,
      },
    ],
  });
}
