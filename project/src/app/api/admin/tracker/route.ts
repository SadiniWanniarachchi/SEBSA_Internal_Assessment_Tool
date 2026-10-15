import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import connectDB from "@/db";
import { AssessmentCycle, Employee, Attempt, Invitation } from "@/db/models";

// ─── Types ────────────────────────────────────────────────────────────────────

type PassFail = "Pass" | "Fail" | "Pending" | "Retry Available" | "Not Started";

interface TrackerRow {
  employeeId:       string;
  fullName:         string;
  email:            string;
  employeeStatus:   "active" | "inactive";
  assessmentStatus: string;
  passFail:         PassFail;
  score:            number | null;
  percentage:       number | null;
  submittedAt:      string | null;
  attemptNumber:    number | null;
  invitationExpiry: string | null;
}

// ─── Row builder helpers ──────────────────────────────────────────────────────

function buildSingleCycleRows(
  employees: any[],
  attempts:  any[],
  invitations: any[],
): TrackerRow[] {
  const invByEmployee = new Map(invitations.map((i) => [i.employeeId.toString(), i]));

  const attemptsByEmployee = new Map<string, any[]>();
  for (const att of attempts) {
    const key = att.employeeId.toString();
    if (!attemptsByEmployee.has(key)) attemptsByEmployee.set(key, []);
    attemptsByEmployee.get(key)!.push(att);
  }

  return employees.map((emp) => {
    const empAttempts  = attemptsByEmployee.get(emp._id.toString()) ?? [];
    const finalAttempt = empAttempts.find((a) => a.isFinal)
      ?? (empAttempts.length > 0
          ? empAttempts.sort((a, b) => b.attemptNumber - a.attemptNumber)[0]
          : null);
    const attempt1 = empAttempts.find((a) => a.attemptNumber === 1);
    const inv      = invByEmployee.get(emp._id.toString());

    let assessmentStatus: string;
    let passFail: PassFail;

    if (!inv) {
      assessmentStatus = "Not Started";
      passFail         = "Not Started";
    } else if (inv.status === "expired" && !finalAttempt) {
      assessmentStatus = "Expired";
      passFail         = "Not Started";
    } else if (!finalAttempt && !attempt1) {
      assessmentStatus = inv.status === "opened" ? "In Progress" : "Not Started";
      passFail         = "Not Started";
    } else if (attempt1 && !attempt1.isFinal) {
      assessmentStatus = "Retry Available";
      passFail         = "Retry Available";
    } else if (finalAttempt?.isFinal) {
      assessmentStatus = "Completed";
      passFail         = finalAttempt.passed ? "Pass" : "Fail";
    } else {
      assessmentStatus = "Not Started";
      passFail         = "Not Started";
    }

    return {
      employeeId:       emp._id.toString(),
      fullName:         emp.fullName,
      email:            emp.email,
      employeeStatus:   emp.status,
      assessmentStatus,
      passFail,
      score:            finalAttempt?.score ?? null,
      percentage:       finalAttempt != null
        ? Math.round((finalAttempt.score / 10) * 100)
        : null,
      submittedAt:      finalAttempt?.submittedAt ?? null,
      attemptNumber:    finalAttempt?.attemptNumber ?? null,
      invitationExpiry: inv?.expiresAt ?? null,
    };
  });
}

// For "All Cycles" mode: each employee appears once with their best result
// across ALL cycles. Preference order: Pass (any cycle) > Fail (latest) >
// Retry Available (latest) > In Progress > Not Started.
function buildAllCyclesRows(
  employees:  any[],
  attempts:   any[],
  invitations: any[],
  cycleOpenedAt: Map<string, number>,
): TrackerRow[] {
  const attemptsByEmployee = new Map<string, any[]>();
  for (const att of attempts) {
    const key = att.employeeId.toString();
    if (!attemptsByEmployee.has(key)) attemptsByEmployee.set(key, []);
    attemptsByEmployee.get(key)!.push(att);
  }

  const invsByEmployee = new Map<string, any[]>();
  for (const inv of invitations) {
    const key = inv.employeeId.toString();
    if (!invsByEmployee.has(key)) invsByEmployee.set(key, []);
    invsByEmployee.get(key)!.push(inv);
  }

  return employees.map((emp) => {
    const empAttempts = attemptsByEmployee.get(emp._id.toString()) ?? [];
    const empInvs     = invsByEmployee.get(emp._id.toString()) ?? [];

    const finalAttempts = empAttempts.filter((a) => a.isFinal);
    const byDate        = (a: any, b: any) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

    // Best final passed attempt (any cycle)
    const passedFinals  = finalAttempts.filter((a) => a.passed).sort(byDate);
    const bestPassed    = passedFinals[0] ?? null;

    // Best final failed attempt (latest, no pass anywhere)
    const failedFinals  = !bestPassed ? finalAttempts.filter((a) => !a.passed).sort(byDate) : [];
    const bestFailed    = failedFinals[0] ?? null;

    // Retry available: a non-final attempt1 (no final attempt yet)
    const retryAttempts = !bestPassed && !bestFailed
      ? empAttempts.filter((a) => !a.isFinal && a.attemptNumber === 1).sort(byDate)
      : [];
    const retryAvailable = retryAttempts[0] ?? null;

    const displayAttempt = bestPassed ?? bestFailed ?? retryAvailable;

    let assessmentStatus: string;
    let passFail: PassFail;

    if (bestPassed) {
      assessmentStatus = "Completed";
      passFail         = "Pass";
    } else if (bestFailed) {
      assessmentStatus = "Completed";
      passFail         = "Fail";
    } else if (retryAvailable) {
      assessmentStatus = "Retry Available";
      passFail         = "Retry Available";
    } else if (empInvs.length > 0) {
      // Sort by the cycle's openedAt so we use the latest invitation
      const sorted    = empInvs.sort(
        (a, b) =>
          (cycleOpenedAt.get(b.cycleId?.toString() ?? "") ?? 0) -
          (cycleOpenedAt.get(a.cycleId?.toString() ?? "") ?? 0),
      );
      const latestInv = sorted[0];
      assessmentStatus =
        latestInv.status === "expired" ? "Expired"
        : latestInv.status === "opened" ? "In Progress"
        : "Not Started";
      passFail = "Not Started";
    } else {
      assessmentStatus = "Not Started";
      passFail         = "Not Started";
    }

    return {
      employeeId:       emp._id.toString(),
      fullName:         emp.fullName,
      email:            emp.email,
      employeeStatus:   emp.status,
      assessmentStatus,
      passFail,
      score:            displayAttempt?.score ?? null,
      percentage:       displayAttempt != null
        ? Math.round((displayAttempt.score / 10) * 100)
        : null,
      submittedAt:      displayAttempt?.submittedAt ?? null,
      attemptNumber:    displayAttempt?.attemptNumber ?? null,
      invitationExpiry: null,
    };
  });
}

function calcStats(rows: TrackerRow[]) {
  const totalCompleted = rows.filter((r) => r.assessmentStatus === "Completed").length;
  const totalPassed    = rows.filter((r) => r.passFail === "Pass").length;
  const totalFailed    = rows.filter((r) => r.passFail === "Fail").length;
  const totalRetry     = rows.filter((r) => r.assessmentStatus === "Retry Available").length;

  return {
    total:          rows.length,
    completed:      totalCompleted,
    pending:        rows.length - totalCompleted - totalRetry,
    retryAvailable: totalRetry,
    completionRate: rows.length > 0
      ? Math.round((totalCompleted / rows.length) * 100)
      : 0,
    passCount:  totalPassed,
    failCount:  totalFailed,
    passRate:   totalCompleted > 0
      ? Math.round((totalPassed / totalCompleted) * 100)
      : 0,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

// GET /api/admin/tracker?cycleId=<id|all>
//
// cycleId not provided or unrecognised → active cycle (existing behaviour)
// cycleId=all                         → aggregate across all cycles
// cycleId=<mongoId>                   → specific cycle
//
// Response always includes `cycles` (all cycles, newest first) for the dropdown.
export async function GET(req: NextRequest) {
  if (!requireRole(req, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const cycleIdParam = req.nextUrl.searchParams.get("cycleId") ?? "";
  const isAllMode    = cycleIdParam === "all";

  const [allCycles, allEmployees] = await Promise.all([
    AssessmentCycle.find()
      .sort({ openedAt: -1 })
      .select("_id label status openedAt passingScore")
      .lean(),
    Employee.find()
      .sort({ fullName: 1 })
      .select("_id fullName email status")
      .lean(),
  ]);

  const cyclesList = allCycles.map((c) => ({
    id:       c._id.toString(),
    label:    c.label,
    status:   c.status,
    openedAt: c.openedAt,
  }));

  // Resolve the target cycle (only used in single-cycle mode)
  let targetCycle: (typeof allCycles)[number] | null = null;

  if (!isAllMode) {
    if (cycleIdParam && /^[0-9a-f]{24}$/i.test(cycleIdParam)) {
      targetCycle = allCycles.find((c) => c._id.toString() === cycleIdParam) ?? null;
    }
    // Fall back to the active cycle if nothing matched
    if (!targetCycle) {
      targetCycle = allCycles.find((c) => c.status === "active") ?? null;
    }
  }

  // Fetch attempts + invitations
  let attempts:    any[] = [];
  let invitations: any[] = [];

  if (isAllMode) {
    [attempts, invitations] = await Promise.all([
      Attempt.find({})
        .select("employeeId cycleId score passed isFinal attemptNumber submittedAt")
        .lean(),
      Invitation.find({})
        .select("employeeId cycleId status expiresAt")
        .lean(),
    ]);
  } else if (targetCycle) {
    [attempts, invitations] = await Promise.all([
      Attempt.find({ cycleId: targetCycle._id })
        .select("employeeId score passed isFinal attemptNumber submittedAt")
        .lean(),
      Invitation.find({ cycleId: targetCycle._id })
        .select("employeeId status expiresAt")
        .lean(),
    ]);
  }

  const rows = isAllMode
    ? buildAllCyclesRows(
        allEmployees,
        attempts,
        invitations,
        new Map(allCycles.map((c) => [c._id.toString(), c.openedAt.getTime()])),
      )
    : buildSingleCycleRows(allEmployees, attempts, invitations);

  return NextResponse.json({
    success: true,
    data: {
      cycle: targetCycle
        ? {
            id:           targetCycle._id.toString(),
            label:        targetCycle.label,
            openedAt:     targetCycle.openedAt,
            status:       targetCycle.status,
            passingScore: (targetCycle as any).passingScore ?? 8,
          }
        : null,
      cycles: cyclesList,
      rows,
      stats:  calcStats(rows),
    },
  });
}
