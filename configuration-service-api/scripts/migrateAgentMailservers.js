/**
 * Migration: Move mailserver assignments into per-agent mailservers[]
 *
 * Reads every mailserver's info.projects[].assigned[] and writes the
 * mailserver ObjectId into the matching agent's mailservers[] array
 * inside the teams collection.
 *
 * Safe to run multiple times (idempotent — uses $addToSet).
 *
 * Usage (from configuration-service-api/):
 *   MONGODB_URI=mongodb://localhost:27017/leadpylot node scripts/migrateAgentMailservers.js
 */

'use strict';

try { require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); } catch {}

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://host.docker.internal:27017/leadpylot';
const ObjectId  = mongoose.Types.ObjectId;

function toOid(v) {
  if (v instanceof ObjectId) return v;
  if (ObjectId.isValid(v))   return new ObjectId(v);
  return null;
}

async function run() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  });
  console.log(`Connected to ${MONGO_URI}\n`);

  const settingsCol = mongoose.connection.collection('settings');
  const teamsCol    = mongoose.connection.collection('teams');

  const mailservers = await settingsCol
    .find({ type: 'mailservers' })
    .toArray();

  console.log(`Found ${mailservers.length} mailserver(s).\n`);

  let totalUpdated = 0;

  for (const ms of mailservers) {
    const msOid     = ms._id;
    const projects  = ms.info?.projects || [];

    if (projects.length === 0) {
      console.log(`  [skip] "${ms.name}" — no info.projects entries`);
      continue;
    }

    console.log(`  Processing "${ms.name}" (${msOid}) — ${projects.length} project(s)`);

    for (const entry of projects) {
      const projectOid = toOid(entry.project_id);
      if (!projectOid) {
        console.log(`    [warn] invalid project_id "${entry.project_id}", skipping`);
        continue;
      }

      const assigned = (entry.assigned || [])
        .map(toOid)
        .filter(Boolean);

      if (assigned.length === 0) {
        console.log(`    [skip] project ${projectOid} — no assigned agents`);
        continue;
      }

      // For each assigned user, $addToSet mailserverId into their agent subdoc's mailservers[]
      for (const userOid of assigned) {
        const result = await teamsCol.updateOne(
          {
            _id: projectOid,
            'agents.user': userOid,
          },
          {
            $addToSet: { 'agents.$.mailservers': msOid },
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`    ✓ Added to agent ${userOid} in project ${projectOid}`);
          totalUpdated++;
        } else if (result.matchedCount > 0) {
          console.log(`    · Already set for agent ${userOid} in project ${projectOid}`);
        } else {
          console.log(`    [warn] agent ${userOid} not found in project ${projectOid}`);
        }
      }
    }
  }

  console.log(`\nDone. Agent mailserver entries written/confirmed: ${totalUpdated}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
