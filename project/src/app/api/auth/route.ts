import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signToken, verifyToken } from "@/lib/auth";
import { loginSchema } from "@/schemas";
import connectDB from "@/db";
import { Employee, AdminUser, AssessmentCycle, Attempt, Certificate } from "@/db/models";

// ── POST /api/auth (Login) ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  try {
    await connectDB();
  } catch (dbErr) {
    console.error("[Login] DB connection failed:", (dbErr as Error).message);
    return NextResponse.json(
      { success: false, error: "Service temporarily unavailable. Please try again in a moment." },
      { status: 503 }
    );
  }

  // Try employee collection first (case insensitive email search)
  const employee = await Employee.findOne({ email: email.toLowerCase() }).lean();

  if (employee) {
    if (employee.status === "inactive") {
      return NextResponse.json(
        { success: false, error: "Your account is inactive. Please contact HR." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await signToken({ id: employee._id.toString(), email: employee.email, role: "employee" });
    const response = NextResponse.json({
      success: true,
      data: {
        role: "employee",
        user: {
          id: employee._id.toString(),
          fullName: employee.fullName,
          email: employee.email,
          department: employee.department,
          roleTitle: employee.roleTitle,
          employeeIdCode: employee.employeeIdCode,
          tierBadge: employee.tierBadge,
        }
      }
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return response;
  }

  // Try admin collection
  const admin = await AdminUser.findOne({ email: email.toLowerCase() }).lean();

  if (admin) {
    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await signToken({ id: admin._id.toString(), email: admin.email, role: "admin" });
    const response = NextResponse.json({
      success: true,
      data: {
        role: "admin",
        user: {
          id: admin._id.toString(),
          fullName: admin.fullName,
          email: admin.email,
        }
      }
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  return NextResponse.json(
    { success: false, error: "Incorrect email or password." },
    { status: 401 }
  );
}

// ── GET /api/auth (Current Session & Profile) ─────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token).catch(() => null);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
  }

  try {
    await connectDB();
  } catch (dbErr) {
    console.error("[Session] DB connection failed:", (dbErr as Error).message);
    return NextResponse.json(
      { success: false, error: "Service temporarily unavailable." },
      { status: 503 }
    );
  }

  if (payload.role === "employee") {
    const employee = await Employee.findById(payload.sub).select("-passwordHash").lean();
    if (!employee) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Run independent queries in parallel to cut round-trip latency
    const [activeCycle, allAttempts] = await Promise.all([
      AssessmentCycle.findOne({ status: "active" }).lean(),
      Attempt.find({ employeeId: employee._id })
        .select("_id cycleId score submittedAt")
        .populate({ path: "cycleId", select: "label" })
        .lean(),
    ]);

    // currentAttempt and certificates depend on the results above — run them in parallel too
    const attemptIds = allAttempts.map(a => a._id);
    const [latestAttempt, certificates] = await Promise.all([
      activeCycle
        ? Attempt.findOne({ employeeId: employee._id, cycleId: activeCycle._id })
            .sort({ attemptNumber: -1 })
            .select("_id score submittedAt isFinal passed attemptNumber")
            .lean()
        : Promise.resolve(null),
      Certificate.find({ attemptId: { $in: attemptIds } })
        .select("_id certificateNumber issuedAt attemptId")
        .lean(),
    ]);

    // pendingAssessment: true when no attempt started yet
    const pendingAssessment = activeCycle ? !latestAttempt : false;
    // canRetry: attempt 1 done but not final (score < RETRY_THRESHOLD, retry available)
    const canRetry = !!(latestAttempt && !latestAttempt.isFinal);
    const currentAttempt = latestAttempt;

    // O(1) lookup instead of O(n²) nested scan
    const attemptById = new Map(allAttempts.map(a => [a._id.toString(), a]));

    const certList = certificates.map(c => {
      const attempt = attemptById.get(c.attemptId.toString());
      return {
        id: c._id.toString(),
        certificateNumber: c.certificateNumber,
        issuedAt: c.issuedAt,
        score: attempt?.score ?? null,
        cycleLabel: (attempt?.cycleId as any)?.label ?? null,
      };
    }).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: employee._id.toString(),
          fullName: employee.fullName,
          email: employee.email,
          department: employee.department || "Enterprise Consulting",
          roleTitle: employee.roleTitle || "Senior ERP Consultant · Supply Chain Practice",
          employeeIdCode: employee.employeeIdCode || "SBS-0482",
          tierBadge: employee.tierBadge || "Tier-1 Certified",
          joinedDate: employee.joinedDate || new Date("2021-03-15"),
          role: "employee",
        },
        activeCycle: activeCycle ? {
          id: activeCycle._id.toString(),
          label: activeCycle.label,
          deadline: "November 30, 2026",
        } : null,
        pendingAssessment,
        canRetry,
        currentAttempt: currentAttempt ? {
          id: currentAttempt._id.toString(),
          score: currentAttempt.score,
          passed: currentAttempt.passed,
          isFinal: currentAttempt.isFinal,
          attemptNumber: currentAttempt.attemptNumber,
          submittedAt: currentAttempt.submittedAt,
        } : null,
        certificates: certList,
      }
    });
  }

  if (payload.role === "admin") {
    const admin = await AdminUser.findById(payload.sub).select("-passwordHash").lean();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: admin._id.toString(),
          fullName: admin.fullName,
          email: admin.email,
          role: "admin",
        }
      }
    });
  }

  return NextResponse.json({ success: false, error: "Invalid role" }, { status: 403 });
}

// ── DELETE /api/auth (Logout) ────────────────────────────────────────────────
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete("token");
  return response;
}
