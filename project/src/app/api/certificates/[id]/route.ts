import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db";
import { Certificate, Attempt, Employee, AssessmentCycle } from "@/db/models";
import { generateCertificate } from "@/lib/pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await connectDB();

  // Search by either ObjectId or certificateNumber
  let cert = null;
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    cert = await Certificate.findById(id).lean();
  }
  if (!cert) {
    cert = await Certificate.findOne({ certificateNumber: id }).lean();
  }

  if (!cert) {
    return NextResponse.json({ success: false, error: "Certificate not found" }, { status: 404 });
  }

  const attempt = await Attempt.findById(cert.attemptId).lean();
  if (!attempt) {
    return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
  }

  const employee = await Employee.findById(attempt.employeeId).lean();
  const cycle = await AssessmentCycle.findById(attempt.cycleId).lean();

  const pdfBuffer = await generateCertificate({
    employeeName: employee?.fullName || "SEBSA Employee",
    cycleLabel: `SEBSA Internal Assessment — ${cycle?.label || "2026 H2"}`,
    score: attempt.score,
    dateCompleted: attempt.submittedAt || new Date(),
    certificateNumber: cert.certificateNumber,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SEBSA_Certificate_${cert.certificateNumber.substring(0, 8)}.pdf"`,
    },
  });
}
