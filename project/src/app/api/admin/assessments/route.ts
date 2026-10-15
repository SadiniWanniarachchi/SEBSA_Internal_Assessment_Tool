import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Invitation, Attempt } from "@/db/models";

// GET /api/admin/assessments
// Query params:
//   search      – substring match on cycle label (case-insensitive)
//   month       – 1-12 (filter by calendar month of openedAt)
//   year        – YYYY (used with month or alone)
//   startDate   – ISO date string (custom range lower bound, inclusive)
//   endDate     – ISO date string (custom range upper bound, inclusive)
//   status      – "active" | "deactivated" | "closed" (filter by status)
//   page        – page number (default 1)
//   limit       – records per page (default 10, max 50)
//   sortBy      – "openedAt" | "label" | "passRate" | "recipients" (default "openedAt")
//   sortOrder   – "asc" | "desc" (default "desc")
export async function GET(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  // ── Parse filter params ───────────────────────────────────────────────────
  const search    = sp.get("search")?.trim() ?? "";
  const month     = sp.get("month");      // "1"–"12"
  const year      = sp.get("year");       // "2026"
  const startDate = sp.get("startDate");  // "2026-01-01"
  const endDate   = sp.get("endDate");    // "2026-06-30"
  const statusFilter = sp.get("status");
  const page      = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit     = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "10", 10)));
  const sortBy    = sp.get("sortBy") ?? "openedAt";
  const sortOrder = sp.get("sortOrder") === "asc" ? 1 : -1;

  await connectDB();

  // ── Build MongoDB filter ───────────────────────────────────────────────────
  const filter: Record<string, any> = {};

  if (search) {
    filter.label = { $regex: search, $options: "i" };
  }

  if (statusFilter && ["active", "deactivated", "closed"].includes(statusFilter)) {
    filter.status = statusFilter;
  }

  // Date range — custom range takes precedence over month/year
  if (startDate || endDate) {
    filter.openedAt = {};
    if (startDate) filter.openedAt.$gte = new Date(startDate + "T00:00:00.000Z");
    if (endDate)   filter.openedAt.$lte = new Date(endDate   + "T23:59:59.999Z");
  } else if (month || year) {
    // Build UTC range for the given month/year
    const m = month ? parseInt(month, 10) : null;   // 1-12
    const y = year  ? parseInt(year,  10) : null;

    if (y && m) {
      const start = new Date(Date.UTC(y, m - 1, 1));           // first day of month
      const end   = new Date(Date.UTC(y, m, 1));               // first day of next month
      filter.openedAt = { $gte: start, $lt: end };
    } else if (y) {
      filter.openedAt = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lt:  new Date(Date.UTC(y + 1, 0, 1)),
      };
    } else if (m) {
      // Filter by month across all years
      // Use $expr with $month aggregate operator
      filter.$expr = { $eq: [{ $month: "$openedAt" }, m] };
    }
  }

  // ── Count and fetch ────────────────────────────────────────────────────────
  const mongoSort: Record<string, 1 | -1> =
    sortBy === "label" ? { label: sortOrder } : { openedAt: sortOrder };

  const [total, cycles] = await Promise.all([
    AssessmentCycle.countDocuments(filter),
    AssessmentCycle.find(filter)
      .sort(mongoSort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const cycleIds = cycles.map((c) => c._id);

  const [allInvitations, allAttempts] = await Promise.all([
    Invitation.find({ cycleId: { $in: cycleIds } })
      .select("cycleId employeeId status emailStatus expiresAt sentAt resentAt")
      .lean(),
    Attempt.find({ cycleId: { $in: cycleIds } })
      .select("cycleId employeeId score passed isFinal attemptNumber submittedAt")
      .lean(),
  ]);

  const invsByCycle    = new Map<string, typeof allInvitations>();
  const attemptsByCycle = new Map<string, typeof allAttempts>();

  for (const inv of allInvitations) {
    const key = inv.cycleId.toString();
    if (!invsByCycle.has(key)) invsByCycle.set(key, []);
    invsByCycle.get(key)!.push(inv);
  }
  for (const att of allAttempts) {
    const key = att.cycleId.toString();
    if (!attemptsByCycle.has(key)) attemptsByCycle.set(key, []);
    attemptsByCycle.get(key)!.push(att);
  }

  const now = new Date();

  const data = cycles.map((c) => {
    const invs     = invsByCycle.get(c._id.toString()) ?? [];
    const attempts = attemptsByCycle.get(c._id.toString()) ?? [];

    const emailsSent   = invs.filter((i) => i.emailStatus === "sent").length;
    const emailsFailed = invs.filter((i) => i.emailStatus === "failed").length;
    const expiredInvs  = invs.filter((i) => i.expiresAt < now && i.status !== "completed").length;
    const started      = invs.filter((i) => ["opened", "completed"].includes(i.status)).length;

    const finalAttempts = attempts.filter((a) => a.isFinal);
    const completed     = finalAttempts.length;
    const passed        = finalAttempts.filter((a) => a.passed).length;
    const failed        = finalAttempts.filter((a) => !a.passed).length;
    const passRate      = completed > 0 ? Math.round((passed / completed) * 100) : 0;

    return {
      id:             c._id.toString(),
      label:          c.label,
      status:         c.status,
      openedAt:       c.openedAt,
      closedAt:       c.closedAt,
      deactivatedAt:  c.deactivatedAt ?? null,
      passingScore:   c.passingScore ?? 8,
      recipients:     invs.length,
      emailsSent,
      emailsFailed,
      expiredInvitations: expiredInvs,
      started,
      completed,
      passed,
      failed,
      passRate,
      invitationExpiryDays: 7,
    };
  });

  // Client-side sort for computed fields (passRate, recipients) that can't use mongo sort
  if (sortBy === "passRate" || sortBy === "recipients") {
    const key = sortBy as keyof (typeof data)[0];
    data.sort((a, b) => {
      const av = (a[key] as number) ?? 0;
      const bv = (b[key] as number) ?? 0;
      return sortOrder === 1 ? av - bv : bv - av;
    });
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
