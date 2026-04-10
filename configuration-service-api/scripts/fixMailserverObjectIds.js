/**
 * Migration: Fix mailserver info.projects[] — convert string IDs to ObjectIds
 *
 * Iterates every mailserver settings document and casts:
 *   info.projects[].project_id  — string → ObjectId
 *   info.projects[].assigned[]  — string[] → ObjectId[]
 *
 * Safe to run multiple times (idempotent — skips already-cast ObjectIds).
 *
 * Usage (from configuration-service-api/):
 *   MONGODB_URI=mongodb://localhost:27017/leadpylot node scripts/fixMailserverObjectIds.js
 */

'use strict';

try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); } catch {}

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://host.docker.internal:27017/leadpylot';
const ObjectId  = mongoose.Types.ObjectId;

// ─── helpers ────────────────────────────────────────────────────────────────

function toObjectId(value) {
  if (value instanceof ObjectId) return value;          // already cast
  if (ObjectId.isValid(value)) return new ObjectId(value);
  return value;                                          // leave unrecognised values untouched
}

function isString(v) {
  return typeof v === 'string';
}

// ─── main ────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  });
  console.log(`Connected to ${MONGO_URI}`);

  const collection = mongoose.connection.collection('settings');

  const mailservers = await collection
    .find({ type: 'mailservers' })
    .toArray();

  console.log(`Found ${mailservers.length} mailserver document(s).`);

  let updated = 0;
  let skipped = 0;

  for (const doc of mailservers) {
    const projects = doc.info?.projects;

    if (!Array.isArray(projects) || projects.length === 0) {
      skipped++;
      continue;
    }

    // Check whether any entry still holds a plain string
    const needsFix = projects.some(
      entry =>
        isString(entry.project_id) ||
        (entry.assigned || []).some(isString)
    );

    if (!needsFix) {
      skipped++;
      continue;
    }

    const fixedProjects = projects.map(entry => ({
      ...entry,
      project_id: toObjectId(entry.project_id),
      assigned:   (entry.assigned || []).map(toObjectId),
    }));

    await collection.updateOne(
      { _id: doc._id },
      { $set: { 'info.projects': fixedProjects } }
    );

    console.log(
      `  ✓ Fixed "${doc.name}" (${doc._id}) — ${fixedProjects.length} project entry(ies)`
    );
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}  |  Already clean / skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
