#!/usr/bin/env node
/**
 * One-off: add status _id 68786a221d0479757003af93 "New" to Settings if missing.
 * Run on server so metadata options include this ID (stops "Unknown" for leads using it).
 * Usage: node scripts/add-missing-status-to-settings.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const TARGET_ID = '68786a221d0479757003af93';
const TARGET_NAME = 'New';

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const coll = mongoose.connection.db.collection('settings');
  const stages = await coll.find({ type: 'stage' }).toArray();
  const oid = new mongoose.Types.ObjectId(TARGET_ID);
  let already = false;
  for (const stage of stages) {
    const statuses = (stage.info && stage.info.statuses) || [];
    if (statuses.some((s) => s._id && s._id.toString() === TARGET_ID)) {
      already = true;
      break;
    }
  }
  if (already) {
    console.log('Status', TARGET_ID, 'already in Settings. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
    return;
  }
  const first = stages[0];
  if (!first || !first.info) {
    console.error('No stage document or info');
    process.exit(1);
  }
  if (!Array.isArray(first.info.statuses)) first.info.statuses = [];
  first.info.statuses.push({
    _id: oid,
    name: TARGET_NAME,
    allowed: true,
  });
  await coll.updateOne(
    { _id: first._id, type: 'stage' },
    { $set: { 'info.statuses': first.info.statuses } }
  );
  console.log('Added status', TARGET_ID, '("' + TARGET_NAME + '") to stage', first.name || first._id);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
