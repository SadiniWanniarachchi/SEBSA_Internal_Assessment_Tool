import { PDFDocument, rgb, StandardFonts, PDFFont, RGB } from "pdf-lib";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Certificate PDF generator — matches the official SEBSA template
// A4 landscape (842 × 595 pt), double dark-navy border, real logo PNG
// ─────────────────────────────────────────────────────────────────────────────

export interface CertificateData {
  employeeName:      string;
  employeeEmail:     string;
  cycleLabel:        string;
  score:             number;   // 0–10
  attemptNumber:     number;   // total attempts by this employee (used as cert sequence)
  dateCompleted:     Date;
  certificateNumber: string;
}

// Brand colours matching the certificate template
const NAVY  = rgb(0.078, 0.149, 0.369);   // #142460 — border, headings
const DARK  = rgb(0.18,  0.18,  0.18);    // body text
const GRAY  = rgb(0.48,  0.48,  0.48);    // tagline, cert ID
const LGRAY = rgb(0.75,  0.75,  0.75);    // separator lines

// Return the x that centres `text` horizontally on the page
function cx(text: string, font: PDFFont, size: number, pageWidth: number): number {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

export async function generateCertificate(data: CertificateData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // A4 landscape: 842 × 595 pt
  const W = 842;
  const H = 595;
  const page = pdfDoc.addPage([W, H]);

  // ── Fonts (standard, always available in pdf-lib) ─────────────────────────
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // ── White background ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

  // ── Double border (outer thick + inner thin, both dark navy) ──────────────
  // Outer border: 3 pt thick, 18 pt from page edge
  page.drawRectangle({
    x: 18, y: 18,
    width: W - 36, height: H - 36,
    borderColor: NAVY, borderWidth: 3,
  });
  // Inner border: 1 pt thick, 28 pt from page edge
  page.drawRectangle({
    x: 28, y: 28,
    width: W - 56, height: H - 56,
    borderColor: NAVY, borderWidth: 1,
  });

  // ── SEBSA logo PNG ────────────────────────────────────────────────────────
  try {
    const logoPath  = path.join(process.cwd(), "public", "sebsa-logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    const logoImg   = await pdfDoc.embedPng(logoBytes);
    const dims      = logoImg.scaleToFit(160, 46);
    page.drawImage(logoImg, {
      x: (W - dims.width) / 2,
      y: H - 38 - dims.height,   // top: ~H-38
      width:  dims.width,
      height: dims.height,
    });
  } catch {
    // Fallback text if logo file is missing
    const fallback = "SEBSA";
    page.drawText(fallback, {
      x: cx(fallback, bold, 26, W), y: H - 75,
      size: 26, font: bold, color: NAVY,
    });
  }

  // ── "SIMPLE . FAST . ACCURATE" ────────────────────────────────────────────
  const tagline = "SIMPLE . FAST . ACCURATE";
  page.drawText(tagline, {
    x: cx(tagline, regular, 8, W), y: H - 98,
    size: 8, font: regular, color: GRAY,
  });

  // ── Top separator ─────────────────────────────────────────────────────────
  const SEP_Y1 = H - 110;
  page.drawLine({ start: { x: 42, y: SEP_Y1 }, end: { x: W - 42, y: SEP_Y1 }, thickness: 0.6, color: LGRAY });

  // ── "ASSESSMENT COMPLETION CERTIFICATE" ───────────────────────────────────
  const HEADING = "ASSESSMENT COMPLETION CERTIFICATE";
  page.drawText(HEADING, {
    x: cx(HEADING, bold, 17, W), y: H - 135,
    size: 17, font: bold, color: NAVY,
  });

  // ── "This certificate is presented to" ────────────────────────────────────
  const PREAMBLE = "This certificate is presented to";
  page.drawText(PREAMBLE, {
    x: cx(PREAMBLE, italic, 10, W), y: H - 160,
    size: 10, font: italic, color: DARK,
  });

  // ── Employee name ─────────────────────────────────────────────────────────
  // Scale down font if name is very long
  let nameFontSize = 22;
  while (bold.widthOfTextAtSize(data.employeeName, nameFontSize) > W - 120 && nameFontSize > 14) {
    nameFontSize -= 1;
  }
  page.drawText(data.employeeName, {
    x: cx(data.employeeName, bold, nameFontSize, W), y: H - 192,
    size: nameFontSize, font: bold, color: DARK,
  });

  // ── "for completing the" ──────────────────────────────────────────────────
  const FOR_TEXT = "for completing the";
  page.drawText(FOR_TEXT, {
    x: cx(FOR_TEXT, italic, 10, W), y: H - 218,
    size: 10, font: italic, color: DARK,
  });

  // ── "EMPLOYEE AWARENESS ASSESSMENT" ──────────────────────────────────────
  const ASSESS_TITLE = "EMPLOYEE AWARENESS ASSESSMENT";
  page.drawText(ASSESS_TITLE, {
    x: cx(ASSESS_TITLE, bold, 13, W), y: H - 240,
    size: 13, font: bold, color: NAVY,
  });

  // ── Middle separator ──────────────────────────────────────────────────────
  const SEP_Y2 = H - 256;
  page.drawLine({ start: { x: 42, y: SEP_Y2 }, end: { x: W - 42, y: SEP_Y2 }, thickness: 0.6, color: LGRAY });

  // ── Details table ─────────────────────────────────────────────────────────
  const labels = [
    "Employee Email:",
    "Assessment Result:",
    "Score:",
    "Attempt Number:",
    "Completion Date:",
  ];

  const scorePercent = Math.round((data.score / 10) * 100);
  const resultPass   = data.score >= 6;
  const dateStr      = data.dateCompleted.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const values = [
    data.employeeEmail,
    resultPass ? "Pass" : "Fail",
    `${data.score}/10 (${scorePercent}%)`,
    String(data.attemptNumber),
    dateStr,
  ];

  const ROW_SIZE  = 10;
  const ROW_GAP   = 17;
  const TABLE_GAP = 10;  // gap between label and value columns

  // Pre-compute max label width for right-aligning labels
  const maxLabelW = Math.max(...labels.map(l => bold.widthOfTextAtSize(l, ROW_SIZE)));

  // Centre the two-column block on the page
  const maxValueW  = Math.max(...values.map(v => regular.widthOfTextAtSize(v, ROW_SIZE)));
  const tableTotal = maxLabelW + TABLE_GAP + maxValueW;
  const tableLeft  = (W - tableTotal) / 2;
  const valueLeft  = tableLeft + maxLabelW + TABLE_GAP;

  const TABLE_START_Y = SEP_Y2 - 18;

  labels.forEach((label, i) => {
    const rowY = TABLE_START_Y - i * ROW_GAP;
    // Right-align labels
    const labelX = tableLeft + (maxLabelW - bold.widthOfTextAtSize(label, ROW_SIZE));
    page.drawText(label, {
      x: labelX, y: rowY,
      size: ROW_SIZE, font: bold, color: DARK,
    });
    page.drawText(values[i], {
      x: valueLeft, y: rowY,
      size: ROW_SIZE, font: regular, color: DARK,
    });
  });

  // ── Bottom separator ──────────────────────────────────────────────────────
  const lastRowY  = TABLE_START_Y - (labels.length - 1) * ROW_GAP;
  const SEP_Y3    = lastRowY - 14;
  page.drawLine({ start: { x: 42, y: SEP_Y3 }, end: { x: W - 42, y: SEP_Y3 }, thickness: 0.6, color: LGRAY });

  // ── Certificate ID ────────────────────────────────────────────────────────
  const certIdText = `Certificate ID: ${data.certificateNumber}`;
  page.drawText(certIdText, {
    x: cx(certIdText, regular, 7.5, W), y: SEP_Y3 - 16,
    size: 7.5, font: regular, color: GRAY,
  });

  // ── "Human Resources Department" ─────────────────────────────────────────
  const HR_TEXT = "Human Resources Department";
  page.drawText(HR_TEXT, {
    x: cx(HR_TEXT, italic, 9, W), y: 48,
    size: 9, font: italic, color: DARK,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
