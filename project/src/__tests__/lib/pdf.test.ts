import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { generateCertificate } from "@/lib/pdf";

const sample = {
  employeeName: "Sajini Koongahawattage", employeeEmail: "sajini.koongahawattage@sebsaworld.com",
  cycleLabel: "2026 H2", score: 9, attemptNumber: 3,
  dateCompleted: new Date("2026-07-27T10:00:00+05:30"), certificateNumber: "CERT-20260727044756-3fcae849",
};
test("creates a landscape certificate using the supplied template and employee details", async () => {
  const bytes = await generateCertificate(sample);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
  const streams = doc.context.enumerateIndirectObjects()
    .map(([, object]) => object).filter((object): object is PDFRawStream => object instanceof PDFRawStream);
  const content = streams.filter((stream) => !stream.dict.has(doc.context.obj("Subtype")))
    .map((stream) => Buffer.from(decodePDFRawStream(stream).decode()).toString()).join("\n");
  for (const text of ["ASSESSMENT COMPLETION CERTIFICATE", "This certificate is presented to", sample.employeeName,
    sample.employeeEmail, "EMPLOYEE AWARENESS ASSESSMENT", "Pass", "9/10 (90%)", "27 July 2026",
    "Certificate ID: " + sample.certificateNumber, "Human Resources Department"]) {
    expect(content).toContain(Buffer.from(text).toString("hex").toUpperCase());
  }
  // Both the logo and its transparency mask are embedded, rather than a text replacement.
  expect(streams.some((stream) => stream.dict.get(doc.context.obj("Subtype"))?.toString() === "/Image")).toBe(true);
  expect(content).not.toContain(Buffer.from("SIMPLE . FAST . ACCURATE").toString("hex").toUpperCase());
});
test("fits long names and email addresses inside the certificate", async () => {
  const bytes = await generateCertificate({ ...sample,
    employeeName: "An employee with a particularly long full name ".repeat(4),
    employeeEmail: "long.email.address.".repeat(10) + "@example.com",
  });
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});
