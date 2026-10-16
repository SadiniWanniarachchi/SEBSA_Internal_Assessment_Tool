import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import dns from "node:dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}
import mongoose from "mongoose";
import { AdminUser, Employee, Question } from "../src/db/models";
import { hashPassword } from "../src/lib/auth";

async function seed() {
  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_EMPLOYEE_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD and SEED_EMPLOYEE_PASSWORD must be set for seeding.");
  }

  if (!process.env.MONGODB_URI) {
    console.error("Ã¢ÂÅ’ MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  try {
    console.log("Ã¢ÂÂ³ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Ã¢Å“â€¦ Connected to MongoDB.");

    // Clear existing users for a fresh start (optional, uncomment if needed)
    // await AdminUser.deleteMany({});
    // await Employee.deleteMany({});
    // await Question.deleteMany({});

    // Ã¢â€â‚¬Ã¢â€â‚¬ Create default Admin Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const existingAdmin = await AdminUser.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const adminPassword = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "");
      await AdminUser.create({
        fullName: process.env.SEED_ADMIN_NAME ?? "SEBSA Administrator",
        email: adminEmail,
        passwordHash: adminPassword,
        role: "admin",
      });
      console.log("Default Admin created");
    } else {
      console.log(`Ã¢â€žÂ¹Ã¯Â¸Â Admin ${adminEmail} already exists.`);
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Create default Employees Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const employeesToSeed = process.env.SEED_EMPLOYEES_JSON
      ? JSON.parse(process.env.SEED_EMPLOYEES_JSON)
      : [];

    for (const emp of employeesToSeed) {
      const existing = await Employee.findOne({ email: emp.email });
      if (!existing) {
        const passwordHash = await hashPassword(emp.password);
        await Employee.create({
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
          roleTitle: emp.roleTitle,
          employeeIdCode: emp.employeeIdCode,
          tierBadge: emp.tierBadge,
          joinedDate: emp.joinedDate,
          passwordHash,
          status: "active",
        });
        console.log(`Employee created: ${emp.email}`);
      } else {
        console.log(`Ã¢â€žÂ¹Ã¯Â¸Â Employee ${emp.email} already exists.`);
    }
      }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Create active AssessmentCycle Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const { AssessmentCycle } = await import("../src/db/models");
    const adminRecord = await AdminUser.findOne({ email: adminEmail });
    const existingCycle = await AssessmentCycle.findOne({ status: "active" });
    if (!existingCycle && adminRecord) {
      await AssessmentCycle.create({
        label: "2026 H2",
        status: "active",
        openedAt: new Date(),
        openedBy: adminRecord._id,
      });
      console.log("Ã¢Å“â€¦ Active AssessmentCycle created: 2026 H2");
    } else {
      console.log("Ã¢â€žÂ¹Ã¯Â¸Â Active AssessmentCycle already exists.");
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Create Questions from documents or fallback to samples Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const count = await Question.countDocuments();
    if (count === 0) {
      const fs = await import("fs");
      const path = await import("path");
      const questionsJsonPath = path.resolve(__dirname, "../../documents/sebsa_assessment_questions_with_answers.json");

      let questionsToInsert = [];

      if (fs.existsSync(questionsJsonPath)) {
        try {
          const raw = fs.readFileSync(questionsJsonPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.questions)) {
            questionsToInsert = parsed.questions.map((q: any) => ({
              questionText:  q.questionText,
              optionA:       q.options?.find((o: any) => o.id === "a")?.text ?? "",
              optionB:       q.options?.find((o: any) => o.id === "b")?.text ?? "",
              optionC:       q.options?.find((o: any) => o.id === "c")?.text ?? "",
              optionD:       q.options?.find((o: any) => o.id === "d")?.text ?? "",
              correctOption: (q.correctOption || "a").toLowerCase(),
              category:      "Confidentiality & Data Protection",
              status:        "active",
            }));
            console.log(`Ã°Å¸â€œâ€ž Loaded ${questionsToInsert.length} questions from documents dataset.`);
          }
        } catch (err) {
          console.warn("Ã¢Å¡Â Ã¯Â¸Â Failed reading questions JSON file, using fallback sample questions:", err);
        }
      }

      if (questionsToInsert.length === 0) {
        questionsToInsert = [
          {
            questionText: "What is the strongest example of a phishing indicator?",
            optionA: "An email from a known colleague with no attachment",
            optionB: "An urgent request to click a link and re-enter your password",
            optionC: "A calendar invite from your manager",
            optionD: "A newsletter you subscribed to",
            correctOption: "b",
            category: "Security Awareness",
            status: "active",
          },
          {
            questionText: "Which of these is a safe way to share sensitive files?",
            optionA: "Email attachment to a personal address",
            optionB: "Saving it on an unencrypted USB drive",
            optionC: "Using the company's approved secure file sharing tool",
            optionD: "Sending via WhatsApp",
            correctOption: "c",
            category: "Data Privacy",
            status: "active",
          }
        ];
      }

      await Question.insertMany(questionsToInsert);
      console.log(`Ã¢Å“â€¦ Inserted ${questionsToInsert.length} questions into the database.`);
    } else {
      console.log(`Ã¢â€žÂ¹Ã¯Â¸Â Questions already exist in the database (${count} questions found).`);
    }

    console.log("Ã°Å¸Å½â€° Seeding completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("Ã¢ÂÅ’ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
