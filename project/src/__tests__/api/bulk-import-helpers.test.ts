import {
  detectColumns,
  normalizeEmail,
  isValidEmail,
  analyzeRows,
} from "@/lib/bulk-import";

// ── detectColumns ─────────────────────────────────────────────────────────────

describe("detectColumns — exact matches", () => {
  it("detects Name and Email (exact, capitalised)", () => {
    const r = detectColumns(["Name", "Email"]);
    expect(r.nameCol).toBe("Name");
    expect(r.emailCol).toBe("Email");
    expect(r.missingCols).toHaveLength(0);
  });

  it("detects Full Name and Email Address (common Excel export headers)", () => {
    const r = detectColumns(["Full Name", "Email Address", "Department"]);
    expect(r.nameCol).toBe("Full Name");
    expect(r.emailCol).toBe("Email Address");
    expect(r.missingCols).toHaveLength(0);
  });

  it("detects Employee Name and Email", () => {
    const r = detectColumns(["Employee Name", "Email"]);
    expect(r.nameCol).toBe("Employee Name");
    expect(r.emailCol).toBe("Email");
    expect(r.missingCols).toHaveLength(0);
  });

  it("detects fullname (no space) and mail synonyms", () => {
    const r = detectColumns(["Fullname", "Mail"]);
    expect(r.nameCol).toBe("Fullname");
    expect(r.emailCol).toBe("Mail");
  });

  it("detects Employee (bare) and EmailAddress (camelCase)", () => {
    const r = detectColumns(["Employee", "EmailAddress"]);
    expect(r.nameCol).toBe("Employee");
    expect(r.emailCol).toBe("EmailAddress");
  });
});

describe("detectColumns — case insensitivity", () => {
  it("matches lower-case headers", () => {
    const r = detectColumns(["name", "email"]);
    expect(r.nameCol).toBe("name");
    expect(r.emailCol).toBe("email");
  });

  it("matches ALL CAPS headers", () => {
    const r = detectColumns(["NAME", "EMAIL"]);
    expect(r.nameCol).toBe("NAME");
    expect(r.emailCol).toBe("EMAIL");
  });

  it("matches mixed-case 'FULL NAME'", () => {
    const r = detectColumns(["FULL NAME", "EMAIL ADDRESS"]);
    expect(r.nameCol).toBe("FULL NAME");
    expect(r.emailCol).toBe("EMAIL ADDRESS");
  });
});

describe("detectColumns — missing columns", () => {
  it("reports missing name column", () => {
    const r = detectColumns(["Email"]);
    expect(r.nameCol).toBeNull();
    expect(r.emailCol).toBe("Email");
    expect(r.missingCols.length).toBeGreaterThan(0);
    expect(r.missingCols[0]).toMatch(/name/i);
  });

  it("reports missing email column", () => {
    const r = detectColumns(["Full Name", "Department"]);
    expect(r.nameCol).toBe("Full Name");
    expect(r.emailCol).toBeNull();
    expect(r.missingCols.length).toBeGreaterThan(0);
    expect(r.missingCols[0]).toMatch(/email/i);
  });

  it("reports both columns missing for unrecognised headers", () => {
    const r = detectColumns(["ID", "Phone", "Country"]);
    expect(r.nameCol).toBeNull();
    expect(r.emailCol).toBeNull();
    expect(r.missingCols).toHaveLength(2);
  });

  it("returns empty missingCols when both columns found", () => {
    const r = detectColumns(["Full Name", "Email"]);
    expect(r.missingCols).toHaveLength(0);
  });
});

// ── normalizeEmail ────────────────────────────────────────────────────────────

describe("normalizeEmail", () => {
  it("lowercases the email", () => {
    expect(normalizeEmail("ALICE@SEBSAWORLD.COM")).toBe("alice@sebsaworld.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  bob@example.com  ")).toBe("bob@example.com");
  });

  it("lowercases and trims together", () => {
    expect(normalizeEmail("  Jane.Doe@Company.COM  ")).toBe("jane.doe@company.com");
  });
});

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it.each([
    "user@example.com",
    "john.doe@sebsaworld.com",
    "admin+tag@company.co.uk",
  ])("accepts valid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "notanemail",
    "@nodomain",
    "missing-at-sign.com",
    "space in@email.com",
  ])("rejects invalid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

// ── analyzeRows ───────────────────────────────────────────────────────────────

describe("analyzeRows — basic classification", () => {
  const existingEmails = new Set(["existing@company.com"]);

  it("marks a new valid row as would_create", () => {
    const rows = [{ name: "Alice Smith", email: "alice@company.com" }];
    const result = analyzeRows(rows, existingEmails);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("would_create");
    expect(result[0].fullName).toBe("Alice Smith");
    expect(result[0].email).toBe("alice@company.com");
  });

  it("marks a row whose email already exists as already_exists", () => {
    const rows = [{ name: "Bob Jones", email: "existing@company.com" }];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("already_exists");
    expect(result[0].reason).toBeTruthy();
  });

  it("skips completely blank rows (no name and no email)", () => {
    const rows = [
      { name: "", email: "" },
      { name: "Alice", email: "alice@example.com" },
      { name: "   ", email: "   " },
    ];
    const result = analyzeRows(rows, existingEmails);
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("Alice");
  });

  it("marks a row with missing name as invalid", () => {
    const rows = [{ name: "", email: "noname@company.com" }];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toMatch(/name/i);
  });

  it("marks a row with missing email as invalid", () => {
    const rows = [{ name: "No Email Person", email: "" }];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toMatch(/email/i);
  });

  it("marks a row with invalid email format as invalid", () => {
    const rows = [{ name: "Bad Email", email: "not-an-email" }];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toMatch(/format/i);
  });
});

describe("analyzeRows — duplicate detection within file", () => {
  const existingEmails = new Set<string>();

  it("first occurrence is would_create; second is duplicate_in_file", () => {
    const rows = [
      { name: "Alice", email: "alice@company.com" },
      { name: "Alice Again", email: "alice@company.com" },
    ];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("would_create");
    expect(result[1].status).toBe("duplicate_in_file");
    expect(result[1].reason).toBeTruthy();
  });

  it("handles three occurrences: first is would_create, next two are duplicate_in_file", () => {
    const rows = [
      { name: "Sam", email: "sam@company.com" },
      { name: "Sam 2", email: "sam@company.com" },
      { name: "Sam 3", email: "sam@company.com" },
    ];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("would_create");
    expect(result[1].status).toBe("duplicate_in_file");
    expect(result[2].status).toBe("duplicate_in_file");
  });

  it("duplicate detection is case-insensitive (normalises email)", () => {
    const rows = [
      { name: "Carol", email: "Carol@Company.Com" },
      { name: "Carol Again", email: "carol@company.com" },
    ];
    const result = analyzeRows(rows, existingEmails);
    expect(result[0].status).toBe("would_create");
    expect(result[1].status).toBe("duplicate_in_file");
  });
});

describe("analyzeRows — DB duplicate vs file duplicate priority", () => {
  it("first occurrence of a DB-existing email is already_exists; second is duplicate_in_file", () => {
    const existingEmails = new Set(["known@company.com"]);
    const rows = [
      { name: "Known User",   email: "known@company.com" },
      { name: "Known User 2", email: "known@company.com" },
    ];
    const result = analyzeRows(rows, existingEmails);
    // Row 0: email added to seenInFile, then existingEmails hit → already_exists
    // Row 1: email already in seenInFile → duplicate_in_file (file-dup check runs first)
    expect(result[0].status).toBe("already_exists");
    expect(result[1].status).toBe("duplicate_in_file");
  });

  it("assigns correct row numbers starting from 2 by default", () => {
    const rows = [
      { name: "User One", email: "one@co.com" },
      { name: "User Two", email: "two@co.com" },
    ];
    const result = analyzeRows(rows, new Set());
    expect(result[0].row).toBe(2);
    expect(result[1].row).toBe(3);
  });

  it("respects custom firstDataRow offset", () => {
    const rows = [{ name: "Only", email: "only@co.com" }];
    const result = analyzeRows(rows, new Set(), 5);
    expect(result[0].row).toBe(5);
  });
});

describe("analyzeRows — mixed file", () => {
  it("imports valid rows even when other rows are invalid", () => {
    const existing = new Set(["old@co.com"]);
    const rows = [
      { name: "Good User",     email: "good@co.com" },
      { name: "Existing User", email: "old@co.com"  },
      { name: "",              email: "noname@co.com" },
      { name: "Bad Email",     email: "not-valid"   },
      { name: "Second Good",   email: "good2@co.com" },
    ];
    const result = analyzeRows(rows, existing);
    expect(result.find((r) => r.email === "good@co.com")?.status).toBe("would_create");
    expect(result.find((r) => r.email === "old@co.com")?.status).toBe("already_exists");
    expect(result.find((r) => r.email === "noname@co.com")?.status).toBe("invalid");
    expect(result.find((r) => r.email === "not-valid")?.status).toBe("invalid");
    expect(result.find((r) => r.email === "good2@co.com")?.status).toBe("would_create");
  });
});
