import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─────────────────────────────────────────────────────────────────────────────
// Certificate PDF generator
// Spec: Section 12 — A4 PDF with employee name, cycle, score, date, cert ID
// Spec: FR-07 — generated on submission; FR-08 — downloadable + emailed
// ─────────────────────────────────────────────────────────────────────────────

export interface CertificateData {
  employeeName:      string;
  cycleLabel:        string;   // e.g. "SEBSA Internal Assessment — 2026 H2"
  score:             number;   // 0–10
  dateCompleted:     Date;
  certificateNumber: string;   // UUID from DB
}

/**
 * Generate a branded A4 PDF certificate.
 * Returns raw PDF bytes as a Buffer ready to store or send.
 */
export async function generateCertificate(data: CertificateData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // A4 in points: 595 × 842
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // ── Fonts ─────────────────────────────────────────────────────────────────
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Brand colours ──────────────────────────────────────────────────────────
  // TODO: update with actual SEBSA brand guidelines
  const primaryBlue = rgb(0.118, 0.227, 0.373); // #1E3A5F
  const accentGold  = rgb(0.961, 0.651, 0.137); // #F5A623
  const darkGray    = rgb(0.2, 0.2, 0.2);

  // ── Background ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

  // Top accent bar
  page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: primaryBlue });
  // Bottom accent bar
  page.drawRectangle({ x: 0, y: 0, width, height: 12, color: primaryBlue });
  // Left accent bar
  page.drawRectangle({ x: 0, y: 0, width: 12, height, color: accentGold });
  // Right accent bar
  page.drawRectangle({ x: width - 12, y: 0, width: 12, height, color: accentGold });

  // ── SEBSA logo placeholder ─────────────────────────────────────────────────
  // TODO: embed actual SEBSA logo PNG/JPEG once brand assets are available
  page.drawText("SEBSA", {
    x:    width / 2 - 40,
    y:    height - 90,
    size: 32,
    font: boldFont,
    color: primaryBlue,
  });

  // ── Certificate heading ────────────────────────────────────────────────────
  page.drawText("Certificate of Completion", {
    x:    width / 2 - 155,
    y:    height - 160,
    size: 22,
    font: boldFont,
    color: darkGray,
  });

  // ── Body text ──────────────────────────────────────────────────────────────
  page.drawText("This certifies that", {
    x: width / 2 - 60, y: height - 220, size: 13, font: regularFont, color: darkGray,
  });

  page.drawText(data.employeeName, {
    x:    width / 2 - (data.employeeName.length * 8) / 2,
    y:    height - 260,
    size: 24,
    font: boldFont,
    color: primaryBlue,
  });

  page.drawText("has successfully completed", {
    x: width / 2 - 85, y: height - 300, size: 13, font: regularFont, color: darkGray,
  });

  page.drawText(data.cycleLabel, {
    x:    width / 2 - (data.cycleLabel.length * 6) / 2,
    y:    height - 340,
    size: 16,
    font: boldFont,
    color: darkGray,
  });

  // ── Score ──────────────────────────────────────────────────────────────────
  page.drawText(`Score: ${data.score} / 10`, {
    x: width / 2 - 45, y: height - 400, size: 18, font: boldFont, color: primaryBlue,
  });

  // ── Date ──────────────────────────────────────────────────────────────────
  const dateStr = data.dateCompleted.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  page.drawText(`Date: ${dateStr}`, {
    x: width / 2 - 70, y: height - 450, size: 12, font: regularFont, color: darkGray,
  });

  // ── Certificate ID ────────────────────────────────────────────────────────
  page.drawText(`Certificate ID: ${data.certificateNumber}`, {
    x: 50, y: 30, size: 8, font: regularFont, color: rgb(0.5, 0.5, 0.5),
  });

  // ── Serialize ─────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
