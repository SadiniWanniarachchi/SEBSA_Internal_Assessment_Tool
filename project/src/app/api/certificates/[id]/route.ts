import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/db";
import { Certificate, Attempt, Employee, AssessmentCycle } from "@/db/models";
import { generateCertificate } from "@/lib/pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth: verify the requester is a logged-in employee ────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token).catch(() => null);
  if (!payload || payload.role !== "employee") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  await connectDB();

  // Find by certificateNumber (primary) or ObjectId (legacy)
  let cert = await Certificate.findOne({ certificateNumber: id }).lean();
  if (!cert && id.match(/^[0-9a-fA-F]{24}$/)) {
    cert = await Certificate.findById(id).lean();
  }
  if (!cert) {
    return NextResponse.json({ success: false, error: "Certificate not found" }, { status: 404 });
  }

  const attempt = await Attempt.findById(cert.attemptId)
    .select("employeeId cycleId score submittedAt")
    .lean();
  if (!attempt) {
    return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
  }

  // Prevent employees from accessing certificates belonging to other employees
  if (attempt.employeeId.toString() !== payload.sub) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Run all three independent queries in parallel
  const [employee, cycle, attemptNumber] = await Promise.all([
    Employee.findById(attempt.employeeId).select("fullName email").lean(),
    AssessmentCycle.findById(attempt.cycleId).select("label").lean(),
    Attempt.countDocuments({ employeeId: attempt.employeeId }),
  ]);

  const pdfBuffer = await generateCertificate({
    employeeName:      employee?.fullName       || "SEBSA Employee",
    employeeEmail:     employee?.email          || "",
    cycleLabel:        cycle?.label             || "2026 H2",
    score:             attempt.score,
    attemptNumber,
    dateCompleted:     attempt.submittedAt instanceof Date
                         ? attempt.submittedAt
                         : new Date(attempt.submittedAt),
    certificateNumber: cert.certificateNumber,
  });

  const safeName = (employee?.fullName || "Employee").replace(/[^a-zA-Z0-9]/g, "_");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="SEBSA_Certificate_${safeName}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
