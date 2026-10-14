/**
 * Migration: two-attempt policy
 *
 * Run once in development after updating Attempt model:
 *   npx tsx scripts/migrate.ts
 *
 * What this does:
 *  1. Back-fills attemptNumber=1, isFinal=true, passed on all existing Attempt docs.
 *  2. Drops the old unique index { employeeId_1_cycleId_1 } so the new
 *     { employeeId_1_cycleId_1_attemptNumber_1 } index can be created.
 *  3. Creates a synthetic Invitation record for each existing Attempt so the
 *     invitation-expiry check does not block already-existing submissions.
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set in .env.local / environment.");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db!;

  // ── 1. Back-fill Attempt fields ───────────────────────────────────────────
  const attemptsCol = db.collection("attempts");
  const cyclesCol   = db.collection("assessmentcycles");

  // Build a map of cycleId → passingScore
  const cycles = await cyclesCol.find({}).toArray();
  const passingScoreMap = new Map<string, number>(
    cycles.map((c) => [c._id.toString(), c.passingScore ?? 8])
  );

  const allAttempts = await attemptsCol.find({ attemptNumber: { $exists: false } }).toArray();
  console.log(`Back-filling ${allAttempts.length} existing Attempt records…`);

  for (const att of allAttempts) {
    const passingScore = passingScoreMap.get(att.cycleId.toString()) ?? 8;
    const passed       = att.score >= passingScore;
    await attemptsCol.updateOne(
      { _id: att._id },
      { $set: { attemptNumber: 1, isFinal: true, passed } }
    );
  }
  console.log("Back-fill complete.");

  // ── 2. Drop old unique index on { employeeId, cycleId } ──────────────────
  const indexes = await attemptsCol.indexes();
  const oldIdx  = indexes.find(
    (i) =>
      i.key &&
      Object.keys(i.key).join(",") === "employeeId,cycleId" &&
      i.unique === true
  );
  if (oldIdx) {
    console.log(`Dropping old unique index "${oldIdx.name}"…`);
    await attemptsCol.dropIndex(oldIdx.name as string);
    console.log("Old index dropped.");
  } else {
    console.log("Old unique index not found (already dropped or not present).");
  }

  // ── 3. Create Invitation records for employees who have existing attempts ─
  const invitationsCol = db.collection("invitations");
  const employeesCol   = db.collection("employees");

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const existingAttempts = await attemptsCol.find({}).toArray();
  let invCreated = 0;

  for (const att of existingAttempts) {
    const exists = await invitationsCol.findOne({
      employeeId: att.employeeId,
      cycleId:    att.cycleId,
    });
    if (exists) continue;

    const emp = await employeesCol.findOne({ _id: att.employeeId });
    if (!emp) continue;

    const sentAt    = att.submittedAt ?? att.createdAt ?? new Date();
    const expiresAt = new Date(sentAt.getTime() + SEVEN_DAYS_MS);

    await invitationsCol.insertOne({
      employeeId:  att.employeeId,
      cycleId:     att.cycleId,
      sentAt,
      expiresAt,
      status:      "completed",
      emailStatus: "sent",
      createdAt:   sentAt,
      updatedAt:   sentAt,
    });
    invCreated++;
  }

  // Also create non-expired synthetic invitations for active employees who
  // have NO attempt yet (so they are not blocked by the invitation check)
  const activeCycle = await cyclesCol.findOne({ status: "active" });
  if (activeCycle) {
    const activeEmployees = await employeesCol.find({ status: "active" }).toArray();
    for (const emp of activeEmployees) {
      const inv = await invitationsCol.findOne({
        employeeId: emp._id,
        cycleId:    activeCycle._id,
      });
      if (inv) continue;

      const now       = new Date();
      const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);

      await invitationsCol.insertOne({
        employeeId:  emp._id,
        cycleId:     activeCycle._id,
        sentAt:      now,
        expiresAt,
        status:      "pending",
        emailStatus: "sent",
        createdAt:   now,
        updatedAt:   now,
      });
      invCreated++;
    }
  }

  console.log(`Created ${invCreated} synthetic Invitation records.`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
