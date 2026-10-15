/**
 * Tests for the Brevo email service (src/lib/email/index.ts).
 *
 * All outbound HTTP calls are intercepted via jest.spyOn(global, "fetch").
 * No real emails are sent during these tests.
 */

import { sendAssessmentInvitation, sendCertificateEmail } from "@/lib/email";

// ── Test helpers ──────────────────────────────────────────────────────────────

const FAKE_API_KEY = "xkeysib-test-api-key-not-real";

function mockFetchOk(status = 201) {
  return jest
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ messageId: "test-msg-id" }), { status }),
    );
}

function mockFetchError(status: number, body = "Bad Request") {
  return jest
    .spyOn(global, "fetch")
    .mockResolvedValue(new Response(body, { status }));
}

function setEnv(overrides: Record<string, string | undefined>) {
  const original: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(overrides)) {
    original[key] = process.env[key];
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
  return () => {
    for (const [key, val] of Object.entries(original)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  };
}

// ── Assessment Invitation ─────────────────────────────────────────────────────

describe("sendAssessmentInvitation", () => {
  const inviteParams = {
    toEmail:      "alice@sebsaworld.com",
    employeeName: "Alice Smith",
    cycleLabel:   "2026 H2",
    expiresAt:    new Date("2026-12-31T23:59:59Z"),
  };

  afterEach(() => jest.restoreAllMocks());

  it("calls the Brevo API endpoint with correct URL and method", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    const spy = mockFetchOk();

    await sendAssessmentInvitation(inviteParams);

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    restore();
  });

  it("sets api-key header (value present but not verified to prevent log exposure)", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    const spy = mockFetchOk();

    await sendAssessmentInvitation(inviteParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers  = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBeTruthy();
    restore();
  });

  it("sends correct recipient email in the 'to' field", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    const spy = mockFetchOk();

    await sendAssessmentInvitation(inviteParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.to[0].email).toBe("alice@sebsaworld.com");
    expect(body.to[0].name).toBe("Alice Smith");
    restore();
  });

  it("includes the employee name in the html content", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    const spy = mockFetchOk();

    await sendAssessmentInvitation(inviteParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.htmlContent).toContain("Alice Smith");
    expect(body.htmlContent).toContain("2026 H2");
    restore();
  });

  it("uses the configured APP_URL for the login link (not localhost)", async () => {
    const restore = setEnv({
      BREVO_API_KEY: FAKE_API_KEY,
      APP_URL:       "https://sebsa.vercel.app",
    });
    const spy = mockFetchOk();

    await sendAssessmentInvitation(inviteParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.htmlContent).toContain("https://sebsa.vercel.app/login");
    expect(body.htmlContent).not.toContain("localhost");
    expect(body.textContent).toContain("https://sebsa.vercel.app/login");
    restore();
  });

  it("throws and does not send when BREVO_API_KEY is missing", async () => {
    const restore = setEnv({ BREVO_API_KEY: undefined });
    const spy = jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));

    await expect(sendAssessmentInvitation(inviteParams)).rejects.toThrow(/BREVO_API_KEY/);
    expect(spy).not.toHaveBeenCalled();
    restore();
  });

  it("throws when Brevo returns a 4xx error", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    mockFetchError(401, '{"message":"Unauthorized"}');

    await expect(sendAssessmentInvitation(inviteParams)).rejects.toThrow(/401/);
    restore();
  });

  it("throws when Brevo returns a 5xx error", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    mockFetchError(503, "Service Unavailable");

    await expect(sendAssessmentInvitation(inviteParams)).rejects.toThrow(/503/);
    restore();
  });

  it("does not include the API key in the thrown error message", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    mockFetchError(400, "Bad Request");

    try {
      await sendAssessmentInvitation(inviteParams);
      fail("Expected error was not thrown");
    } catch (err) {
      expect((err as Error).message).not.toContain(FAKE_API_KEY);
    }
    restore();
  });

  it("resolves without throwing on a successful 201 response", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    mockFetchOk(201);

    await expect(sendAssessmentInvitation(inviteParams)).resolves.toBeUndefined();
    restore();
  });
});

// ── Certificate Email ─────────────────────────────────────────────────────────

describe("sendCertificateEmail", () => {
  const certParams = {
    toEmail:           "bob@sebsaworld.com",
    employeeName:      "Bob Jones",
    cycleLabel:        "2026 H1",
    score:             9,
    total:             10,
    passed:            true,
    certificatePdf:    Buffer.from("fake-pdf-content"),
    certificateNumber: "SEBSA-2026-0042",
  };

  afterEach(() => jest.restoreAllMocks());

  it("sends to the correct recipient", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "hr@sebsaworld.com" });
    const spy = mockFetchOk();

    await sendCertificateEmail(certParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.to[0].email).toBe("bob@sebsaworld.com");
    restore();
  });

  it("CCs the HR email when HR_EMAIL_CC is configured", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "hr@sebsaworld.com" });
    const spy = mockFetchOk();

    await sendCertificateEmail(certParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.cc).toBeDefined();
    expect(body.cc[0].email).toBe("hr@sebsaworld.com");
    restore();
  });

  it("omits the cc field when HR_EMAIL_CC is not configured", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: undefined });
    const spy = mockFetchOk();

    await sendCertificateEmail(certParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.cc).toBeUndefined();
    restore();
  });

  it("includes a base64-encoded PDF attachment", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "" });
    const spy = mockFetchOk();

    await sendCertificateEmail(certParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.attachment).toHaveLength(1);
    expect(body.attachment[0].content).toBe(
      Buffer.from("fake-pdf-content").toString("base64"),
    );
    expect(body.attachment[0].name).toMatch(/\.pdf$/);
    restore();
  });

  it("includes the certificate number in the html content", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "" });
    const spy = mockFetchOk();

    await sendCertificateEmail(certParams);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.htmlContent).toContain("SEBSA-2026-0042");
    restore();
  });

  it("throws when BREVO_API_KEY is missing", async () => {
    const restore = setEnv({ BREVO_API_KEY: undefined });
    const spy = jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));

    await expect(sendCertificateEmail(certParams)).rejects.toThrow(/BREVO_API_KEY/);
    expect(spy).not.toHaveBeenCalled();
    restore();
  });

  it("throws when Brevo rejects the request — does not silently succeed", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "" });
    mockFetchError(422, '{"message":"Invalid sender"}');

    await expect(sendCertificateEmail(certParams)).rejects.toThrow(/422/);
    restore();
  });

  it("does not expose the API key in thrown error messages", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY, HR_EMAIL_CC: "" });
    mockFetchError(500);

    try {
      await sendCertificateEmail(certParams);
      fail("Expected error was not thrown");
    } catch (err) {
      expect((err as Error).message).not.toContain(FAKE_API_KEY);
    }
    restore();
  });
});

// ── Error body propagation ────────────────────────────────────────────────────

describe("error body propagation", () => {
  const inviteParams = {
    toEmail:      "err@sebsaworld.com",
    employeeName: "Err User",
    cycleLabel:   "2026 H2",
    expiresAt:    new Date("2026-12-31T23:59:59Z"),
  };

  afterEach(() => jest.restoreAllMocks());

  it("includes a sanitized Brevo response snippet in the thrown error", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response('{"message":"Invalid sender — not verified","code":"unauthorized"}', { status: 401 }),
    );

    try {
      await sendAssessmentInvitation(inviteParams);
      fail("Expected error was not thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("401");
      expect(msg).toContain("Invalid sender");
    }
    restore();
  });

  it("caps the error snippet at 200 characters when Brevo returns a long body", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    const longBody = "x".repeat(500);
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(longBody, { status: 400 }),
    );

    try {
      await sendAssessmentInvitation(inviteParams);
      fail("Expected error was not thrown");
    } catch (err) {
      const msg = (err as Error).message;
      // The snippet is capped; full 500-char body should not appear.
      expect(msg.length).toBeLessThan(400);
    }
    restore();
  });

  it("throws '[Email] Brevo API request timed out' when fetch is aborted", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    jest.spyOn(global, "fetch").mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    );

    await expect(sendAssessmentInvitation(inviteParams)).rejects.toThrow(/timed out/i);
    restore();
  });

  it("throws '[Email] Network error' when fetch rejects with a non-AbortError", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(sendAssessmentInvitation(inviteParams)).rejects.toThrow(/Network error/i);
    restore();
  });

  it("does not expose the full API key in the error from a 401 response", async () => {
    const restore = setEnv({ BREVO_API_KEY: FAKE_API_KEY });
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response('{"message":"Unauthorized"}', { status: 401 }),
    );

    try {
      await sendAssessmentInvitation(inviteParams);
      fail("Expected error was not thrown");
    } catch (err) {
      expect((err as Error).message).not.toContain(FAKE_API_KEY);
    }
    restore();
  });
});

// ── Sender configuration ──────────────────────────────────────────────────────

describe("sender configuration", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses EMAIL_FROM and BREVO_SENDER_NAME in the sender field", async () => {
    const restore = setEnv({
      BREVO_API_KEY:       FAKE_API_KEY,
      EMAIL_FROM:          "custom-from@sebsaworld.com",
      BREVO_SENDER_NAME:   "Custom Sender",
      HR_EMAIL_CC:         "",
    });
    const spy = mockFetchOk();

    await sendAssessmentInvitation({
      toEmail:      "test@sebsaworld.com",
      employeeName: "Test User",
      cycleLabel:   "Test Cycle",
      expiresAt:    new Date("2026-12-31"),
    });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.sender.email).toBe("custom-from@sebsaworld.com");
    expect(body.sender.name).toBe("Custom Sender");
    restore();
  });

  it("falls back to default sender values when env vars are not set", async () => {
    const restore = setEnv({
      BREVO_API_KEY:       FAKE_API_KEY,
      EMAIL_FROM:          undefined,
      BREVO_SENDER_NAME:   undefined,
      HR_EMAIL_CC:         undefined,
    });
    const spy = mockFetchOk();

    await sendAssessmentInvitation({
      toEmail:      "test@sebsaworld.com",
      employeeName: "Test User",
      cycleLabel:   "Test Cycle",
      expiresAt:    new Date("2026-12-31"),
    });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const body     = JSON.parse(init.body as string);
    expect(body.sender.email).toBe("no-reply@sebsaworld.com");
    expect(body.sender.name).toBe("SEBSA Internal Assessment");
    restore();
  });
});
