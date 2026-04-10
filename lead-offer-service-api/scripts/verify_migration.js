/**
 * Verify Offer Progress Migration
 * 
 * This script verifies that the migration was successful by:
 * 1. Checking a sample of migrated offers
 * 2. Comparing data between old collections and new structure
 * 3. Validating data integrity
 * 
 * Usage:
 * MONGO_URL=mongodb://localhost:27017/leadpylot node backend/microservices/lead-offers-service/scripts/verify_migration.js
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/leadpylot';

// Define schemas inline
const OfferSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const OpeningSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const ConfirmationSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const PaymentVoucherSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Netto1Schema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Netto2Schema = new mongoose.Schema({}, { strict: false, timestamps: true });
const LostSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const Offer = mongoose.model('Offer', OfferSchema);
const Opening = mongoose.model('Opening', OpeningSchema);
const Confirmation = mongoose.model('Confirmation', ConfirmationSchema);
const PaymentVoucher = mongoose.model('PaymentVoucher', PaymentVoucherSchema);
const Netto1 = mongoose.model('Netto1', Netto1Schema);
const Netto2 = mongoose.model('Netto2', Netto2Schema);
const Lost = mongoose.model('Lost', LostSchema);

async function verifyMigration() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGO_URL);
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check total counts
    console.log('📊 Checking total counts...\n');
    
    const totalOffers = await Offer.countDocuments({ active: true });
    const offersWithStage = await Offer.countDocuments({ active: true, current_stage: { $exists: true } });
    const offersWithProgression = await Offer.countDocuments({ active: true, progression: { $exists: true } });
    const offersWithTimeline = await Offer.countDocuments({ active: true, timeline: { $exists: true } });
    
    console.log(`   Total active offers: ${totalOffers}`);
    console.log(`   Offers with current_stage: ${offersWithStage} (${((offersWithStage/totalOffers)*100).toFixed(1)}%)`);
    console.log(`   Offers with progression: ${offersWithProgression} (${((offersWithProgression/totalOffers)*100).toFixed(1)}%)`);
    console.log(`   Offers with timeline: ${offersWithTimeline} (${((offersWithTimeline/totalOffers)*100).toFixed(1)}%)`);

    // 2. Check stage distribution
    console.log('\n📊 Stage Distribution:');
    const stageCounts = await Offer.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$current_stage', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    for (const stage of stageCounts) {
      console.log(`   ${stage._id}: ${stage.count}`);
    }

    // 3. Compare with old collections
    console.log('\n📊 Comparing with old collections:');
    
    const oldCounts = {
      openings: await Opening.countDocuments({ active: true }),
      confirmations: await Confirmation.countDocuments({ active: true }),
      payments: await PaymentVoucher.countDocuments({ active: true }),
      netto1: await Netto1.countDocuments({ active: true }),
      netto2: await Netto2.countDocuments({ active: true }),
      losts: await Lost.countDocuments({ active: true })
    };

    const newCounts = {
      openings: await Offer.countDocuments({ active: true, 'progression.opening.active': true }),
      confirmations: await Offer.countDocuments({ active: true, 'progression.confirmation.active': true }),
      payments: await Offer.countDocuments({ active: true, 'progression.payment.active': true }),
      netto1: await Offer.countDocuments({ active: true, 'progression.netto1.active': true }),
      netto2: await Offer.countDocuments({ active: true, 'progression.netto2.active': true }),
      losts: await Offer.countDocuments({ active: true, 'progression.lost.active': true })
    };

    console.log('\n   Stage          | Old Collection | New Structure | Match');
    console.log('   --------------------------------------------------------');
    for (const stage in oldCounts) {
      const match = oldCounts[stage] === newCounts[stage] ? '✅' : '❌';
      console.log(`   ${stage.padEnd(14)} | ${String(oldCounts[stage]).padEnd(14)} | ${String(newCounts[stage]).padEnd(13)} | ${match}`);
    }

    // 4. Sample verification - check specific offers
    console.log('\n📊 Verifying sample offers...\n');

    // Find offers with different stages
    const sampleStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    
    for (const stage of sampleStages) {
      const offer = await Offer.findOne({ active: true, current_stage: stage }).lean();
      
      if (offer) {
        console.log(`   ✅ ${stage.toUpperCase()} Sample (${offer._id}):`);
        console.log(`      - current_stage: ${offer.current_stage}`);
        console.log(`      - progression.${stage}.active: ${offer.progression?.[stage]?.active}`);
        console.log(`      - timeline entries: ${offer.timeline?.length || 0}`);
        
        // Verify against old collection
        let oldRecord = null;
        switch(stage) {
          case 'opening':
            oldRecord = await Opening.findOne({ offer_id: offer._id, active: true });
            break;
          case 'confirmation':
            oldRecord = await Confirmation.findOne({ offer_id: offer._id, active: true });
            break;
          case 'payment':
            oldRecord = await PaymentVoucher.findOne({ offer_id: offer._id, active: true });
            break;
          case 'netto1':
            oldRecord = await Netto1.findOne({ offer_id: offer._id, active: true });
            break;
          case 'netto2':
            oldRecord = await Netto2.findOne({ offer_id: offer._id, active: true });
            break;
          case 'lost':
            oldRecord = await Lost.findOne({ offer_id: offer._id, active: true });
            break;
        }
        
        if (oldRecord) {
          console.log(`      - Old record exists: ✅`);
          console.log(`      - Source ID matches: ${offer.progression?.[stage]?.source_id?.toString() === oldRecord._id.toString() ? '✅' : '❌'}`);
        } else {
          console.log(`      - Old record exists: ❌ WARNING!`);
        }
        console.log('');
      }
    }

    // 5. Check for data integrity issues
    console.log('📊 Checking data integrity...\n');
    
    const issues = [];
    
    // Check for offers with current_stage but no progression data
    const invalidStageOffers = await Offer.find({
      active: true,
      current_stage: { $ne: 'offer' },
      $or: [
        { 'progression.opening.active': { $ne: true }, current_stage: 'opening' },
        { 'progression.confirmation.active': { $ne: true }, current_stage: 'confirmation' },
        { 'progression.payment.active': { $ne: true }, current_stage: 'payment' },
        { 'progression.netto1.active': { $ne: true }, current_stage: 'netto1' },
        { 'progression.netto2.active': { $ne: true }, current_stage: 'netto2' },
        { 'progression.lost.active': { $ne: true }, current_stage: 'lost' }
      ]
    }).select('_id current_stage').lean();

    if (invalidStageOffers.length > 0) {
      issues.push(`Found ${invalidStageOffers.length} offers with current_stage mismatch`);
      console.log(`   ⚠️  ${invalidStageOffers.length} offers have current_stage but no matching progression data`);
    } else {
      console.log(`   ✅ All offers have consistent current_stage and progression data`);
    }

    // Check for offers with empty timeline
    const emptyTimeline = await Offer.countDocuments({
      active: true,
      $or: [
        { timeline: { $exists: false } },
        { timeline: { $size: 0 } }
      ]
    });

    if (emptyTimeline > 0) {
      issues.push(`Found ${emptyTimeline} offers with empty timeline`);
      console.log(`   ⚠️  ${emptyTimeline} offers have empty or missing timeline`);
    } else {
      console.log(`   ✅ All offers have timeline data`);
    }

    // 6. Final summary
    console.log('\n' + '='.repeat(60));
    if (issues.length === 0) {
      console.log('✅ MIGRATION VERIFICATION PASSED!');
      console.log('   All data has been migrated correctly.');
    } else {
      console.log('⚠️  MIGRATION VERIFICATION COMPLETED WITH WARNINGS:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run verification
verifyMigration()
  .then(() => {
    console.log('✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

