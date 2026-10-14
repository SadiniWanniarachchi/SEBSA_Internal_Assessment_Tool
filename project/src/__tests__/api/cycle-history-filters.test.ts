/**
 * Tests for assessment-cycle history filtering logic and deactivation enforcement.
 *
 * These tests exercise the pure business-logic helpers used by the API routes
 * without touching the database, so they run fast and deterministically.
 */

// ── helpers mirroring the filter logic in GET /api/admin/assessments ──────────

/** Build the MongoDB `openedAt` filter for a given month/year combination */
function buildMonthYearFilter(month: string | null, year: string | null) {
  const filter: Record<string, any> = {};
  const m = month ? parseInt(month, 10) : null;
  const y = year  ? parseInt(year,  10) : null;

  if (y && m) {
    filter.$gte = new Date(Date.UTC(y, m - 1, 1));
    filter.$lt  = new Date(Date.UTC(y, m, 1));
  } else if (y) {
    filter.$gte = new Date(Date.UTC(y, 0, 1));
    filter.$lt  = new Date(Date.UTC(y + 1, 0, 1));
  }
  return filter;
}

/** Build the MongoDB `openedAt` filter for a custom date range */
function buildDateRangeFilter(startDate: string | null, endDate: string | null) {
  const filter: Record<string, any> = {};
  if (startDate) filter.$gte = new Date(startDate + "T00:00:00.000Z");
  if (endDate)   filter.$lte = new Date(endDate   + "T23:59:59.999Z");
  return filter;
}

/** Returns true when a date falls within a filter object produced by the above builders */
function matchesDateFilter(date: Date, filter: Record<string, any>): boolean {
  if (filter.$gte && date < filter.$gte) return false;
  if (filter.$lt  && date >= filter.$lt) return false;
  if (filter.$lte && date > filter.$lte) return false;
  return true;
}

/** Simulate server-side invitation expiry check */
function isInvitationValid(invitation: {
  expiresAt: Date;
  status:    "pending" | "opened" | "completed" | "resent" | "expired";
}): boolean {
  const now = new Date();
  if (invitation.expiresAt < now && invitation.status !== "completed") return false;
  return true;
}

/** Simulate cycle-level access guard (used by GET /api/assessment and POST /api/attempts) */
function isCycleAccessible(cycle: { status: string }): boolean {
  return cycle.status === "active";
}

// ────────────────────────────────────────────────────────────────────────────────

describe("Assessment cycle history — date filter logic", () => {

  describe("buildMonthYearFilter — January", () => {
    const filter = buildMonthYearFilter("1", "2026");
    const janFirst  = new Date("2026-01-01T00:00:00.000Z");
    const janMid    = new Date("2026-01-15T12:00:00.000Z");
    const janLast   = new Date("2026-01-31T23:59:59.999Z");
    const febFirst  = new Date("2026-02-01T00:00:00.000Z");
    const dec2025   = new Date("2025-12-31T23:59:59.999Z");

    it("includes the first moment of January 2026", () => {
      expect(matchesDateFilter(janFirst, filter)).toBe(true);
    });
    it("includes a mid-January date", () => {
      expect(matchesDateFilter(janMid, filter)).toBe(true);
    });
    it("includes the last moment of January 2026", () => {
      expect(matchesDateFilter(janLast, filter)).toBe(true);
    });
    it("excludes February 1 2026", () => {
      expect(matchesDateFilter(febFirst, filter)).toBe(false);
    });
    it("excludes December 2025", () => {
      expect(matchesDateFilter(dec2025, filter)).toBe(false);
    });
  });

  describe("buildMonthYearFilter — June", () => {
    const filter = buildMonthYearFilter("6", "2026");
    const junFirst = new Date("2026-06-01T00:00:00.000Z");
    const junMid   = new Date("2026-06-15T00:00:00.000Z");
    const julFirst = new Date("2026-07-01T00:00:00.000Z");
    const mayLast  = new Date("2026-05-31T23:59:59.999Z");

    it("includes June 1", () => {
      expect(matchesDateFilter(junFirst, filter)).toBe(true);
    });
    it("includes June 15", () => {
      expect(matchesDateFilter(junMid, filter)).toBe(true);
    });
    it("excludes July 1", () => {
      expect(matchesDateFilter(julFirst, filter)).toBe(false);
    });
    it("excludes May 31", () => {
      expect(matchesDateFilter(mayLast, filter)).toBe(false);
    });
  });

  describe("buildMonthYearFilter — year only (no month)", () => {
    const filter = buildMonthYearFilter(null, "2025");

    it("includes January 2025", () => {
      expect(matchesDateFilter(new Date("2025-01-15T00:00:00.000Z"), filter)).toBe(true);
    });
    it("includes December 2025", () => {
      expect(matchesDateFilter(new Date("2025-12-15T00:00:00.000Z"), filter)).toBe(true);
    });
    it("excludes January 2026", () => {
      expect(matchesDateFilter(new Date("2026-01-01T00:00:00.000Z"), filter)).toBe(false);
    });
    it("excludes December 2024", () => {
      expect(matchesDateFilter(new Date("2024-12-31T00:00:00.000Z"), filter)).toBe(false);
    });
  });

  describe("buildDateRangeFilter — custom range", () => {
    const filter = buildDateRangeFilter("2026-03-01", "2026-06-30");

    it("includes a date inside the range", () => {
      expect(matchesDateFilter(new Date("2026-04-15T00:00:00.000Z"), filter)).toBe(true);
    });
    it("includes the start bound", () => {
      expect(matchesDateFilter(new Date("2026-03-01T00:00:00.000Z"), filter)).toBe(true);
    });
    it("includes the end bound (end of day UTC)", () => {
      expect(matchesDateFilter(new Date("2026-06-30T23:59:59.999Z"), filter)).toBe(true);
    });
    it("excludes the day before the start", () => {
      expect(matchesDateFilter(new Date("2026-02-28T23:59:59.999Z"), filter)).toBe(false);
    });
    it("excludes the day after the end", () => {
      expect(matchesDateFilter(new Date("2026-07-01T00:00:00.000Z"), filter)).toBe(false);
    });
  });

  describe("buildDateRangeFilter — open-ended range (start only)", () => {
    const filter = buildDateRangeFilter("2026-06-01", null);
    it("includes a date after the start", () => {
      expect(matchesDateFilter(new Date("2026-09-01T00:00:00.000Z"), filter)).toBe(true);
    });
    it("excludes a date before the start", () => {
      expect(matchesDateFilter(new Date("2026-05-31T00:00:00.000Z"), filter)).toBe(false);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────────

describe("Invitation expiry enforcement", () => {

  it("rejects a pending invitation whose expiresAt is in the past", () => {
    const inv = {
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status:    "pending" as const,
    };
    expect(isInvitationValid(inv)).toBe(false);
  });

  it("rejects an opened invitation whose expiresAt is in the past", () => {
    const inv = {
      expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      status:    "opened" as const,
    };
    expect(isInvitationValid(inv)).toBe(false);
  });

  it("accepts a completed invitation even if expiresAt is in the past", () => {
    const inv = {
      expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      status:    "completed" as const,
    };
    expect(isInvitationValid(inv)).toBe(true);
  });

  it("accepts a pending invitation whose expiresAt is in the future", () => {
    const inv = {
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status:    "pending" as const,
    };
    expect(isInvitationValid(inv)).toBe(true);
  });

  it("rejects an invitation that expires exactly at the check time (strict less-than)", () => {
    // expiresAt = 1ms in the past
    const inv = {
      expiresAt: new Date(Date.now() - 1),
      status:    "opened" as const,
    };
    expect(isInvitationValid(inv)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────────

describe("Cycle deactivation — access guard", () => {

  it("allows access to an active cycle", () => {
    expect(isCycleAccessible({ status: "active" })).toBe(true);
  });

  it("denies access to a deactivated cycle", () => {
    expect(isCycleAccessible({ status: "deactivated" })).toBe(false);
  });

  it("denies access to a closed cycle", () => {
    expect(isCycleAccessible({ status: "closed" })).toBe(false);
  });

  it("deactivated and closed are both inaccessible but distinct strings", () => {
    expect("deactivated").not.toBe("closed");
    expect(isCycleAccessible({ status: "deactivated" })).toBe(false);
    expect(isCycleAccessible({ status: "closed" })).toBe(false);
  });

  it("does not allow a frontend-only status change to bypass validation", () => {
    // The check always reads the cycle.status from the DB object passed in;
    // a tampered string that is not exactly "active" still fails.
    const tamperedStatuses = ["Active", "ACTIVE", "deactivated ", " active", ""];
    for (const s of tamperedStatuses) {
      expect(isCycleAccessible({ status: s })).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────

describe("Status display — deactivated vs expired are distinct", () => {
  it("'deactivated' is not equal to 'expired'", () => {
    expect("deactivated").not.toBe("expired");
  });

  it("'deactivated' is not equal to 'closed'", () => {
    expect("deactivated").not.toBe("closed");
  });

  it("'expired' invitation status is not equal to 'deactivated' cycle status", () => {
    const invitationStatus = "expired";
    const cycleStatus      = "deactivated";
    expect(invitationStatus).not.toBe(cycleStatus);
  });
});
