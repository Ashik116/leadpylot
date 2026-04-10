/**
 * Offer Progress Consolidation Migration Script
 * 
 * This script migrates offer progress data from separate collections
 * (openings, confirmations, paymentvouchers, netto1, netto2, losts)
 * into the consolidated Offer document structure.
 * 
 * Usage:
 * MONGO_URL=mongodb://localhost:27017/leadpylot node backend/microservices/lead-offers-service/scripts/migrate_offers_consolidation.js
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/leadpylot';

// Define schemas inline to avoid dependencies
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

// Stage hierarchy (highest priority first)
const STAGE_HIERARCHY = {
  lost: 7,
  netto2: 6,
  netto1: 5,
  payment: 4,
  confirmation: 3,
  opening: 2,
  offer: 1
};

async function migrateOffers() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGO_URL);
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB\n');

    // Get all offers
    const offers = await Offer.find({ active: true }).lean();
    console.log(`📊 Found ${offers.length} active offers to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const offer of offers) {
      try {
        const offerId = offer._id;
        
        // Fetch all related progress records
        const [opening, confirmation, paymentVoucher, netto1, netto2, lost] = await Promise.all([
          Opening.findOne({ offer_id: offerId, active: true }).lean(),
          Confirmation.findOne({ offer_id: offerId, active: true }).lean(),
          PaymentVoucher.findOne({ offer_id: offerId, active: true }).lean(),
          Netto1.findOne({ offer_id: offerId, active: true }).lean(),
          Netto2.findOne({ offer_id: offerId, active: true }).lean(),
          Lost.findOne({ offer_id: offerId, active: true }).lean()
        ]);

        // Determine current_stage based on hierarchy
        let currentStage = 'offer';
        let highestPriority = STAGE_HIERARCHY.offer;

        const stageChecks = [
          { stage: 'opening', record: opening, priority: STAGE_HIERARCHY.opening },
          { stage: 'confirmation', record: confirmation, priority: STAGE_HIERARCHY.confirmation },
          { stage: 'payment', record: paymentVoucher, priority: STAGE_HIERARCHY.payment },
          { stage: 'netto1', record: netto1, priority: STAGE_HIERARCHY.netto1 },
          { stage: 'netto2', record: netto2, priority: STAGE_HIERARCHY.netto2 },
          { stage: 'lost', record: lost, priority: STAGE_HIERARCHY.lost }
        ];

        for (const check of stageChecks) {
          if (check.record && check.priority > highestPriority) {
            currentStage = check.stage;
            highestPriority = check.priority;
          }
        }

        // Build progression object
        const progression = {
          opening: opening ? {
            active: true,
            source_id: opening._id,
            completed_at: opening.createdAt,
            completed_by: opening.creator_id,
            files: opening.files || [],
            metadata: { migrated_from: 'openings_collection' }
          } : { active: false },
          
          confirmation: confirmation ? {
            active: true,
            source_id: confirmation._id,
            completed_at: confirmation.createdAt,
            completed_by: confirmation.creator_id,
            files: confirmation.files || [],
            metadata: { migrated_from: 'confirmations_collection' }
          } : { active: false },
          
          payment: paymentVoucher ? {
            active: true,
            source_id: paymentVoucher._id,
            completed_at: paymentVoucher.createdAt,
            completed_by: paymentVoucher.creator_id,
            files: paymentVoucher.files || [],
            amount: paymentVoucher.amount,
            metadata: { migrated_from: 'paymentvouchers_collection' }
          } : { active: false },
          
          netto1: netto1 ? {
            active: true,
            source_id: netto1._id,
            completed_at: netto1.createdAt,
            completed_by: netto1.creator_id,
            files: netto1.files || [],
            amount: netto1.amount,
            bankerRate: netto1.bankerRate,
            agentRate: netto1.agentRate,
            metadata: { migrated_from: 'netto1_collection' }
          } : { active: false },
          
          netto2: netto2 ? {
            active: true,
            source_id: netto2._id,
            completed_at: netto2.createdAt,
            completed_by: netto2.creator_id,
            files: netto2.files || [],
            amount: netto2.amount,
            bankerRate: netto2.bankerRate,
            agentRate: netto2.agentRate,
            metadata: { migrated_from: 'netto2_collection' }
          } : { active: false },
          
          lost: lost ? {
            active: true,
            reason: lost.reason,
            marked_at: lost.createdAt,
            marked_by: lost.creator_id,
            metadata: { migrated_from: 'losts_collection' }
          } : { active: false }
        };

        // Build timeline from all events
        const timeline = [];
        
        // Add creation event
        timeline.push({
          action: 'create',
          from_stage: null,
          to_stage: 'offer',
          timestamp: offer.createdAt,
          user_id: offer.created_by || offer.agent_id,
          metadata: { source: 'migration' }
        });

        // Add progression events in chronological order
        const progressionEvents = [
          { stage: 'opening', record: opening, from: 'offer', to: 'opening' },
          { stage: 'confirmation', record: confirmation, from: 'opening', to: 'confirmation' },
          { stage: 'payment', record: paymentVoucher, from: 'confirmation', to: 'payment' },
          { stage: 'netto1', record: netto1, from: 'payment', to: 'netto1' },
          { stage: 'netto2', record: netto2, from: 'netto1', to: 'netto2' },
          { stage: 'lost', record: lost, from: currentStage, to: 'lost' }
        ];

        for (const event of progressionEvents) {
          if (event.record) {
            timeline.push({
              action: 'progress',
              from_stage: event.from,
              to_stage: event.to,
              timestamp: event.record.createdAt,
              user_id: event.record.creator_id,
              metadata: { source: 'migration' }
            });
          }
        }

        // Sort timeline by timestamp
        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Update the offer
        await Offer.updateOne(
          { _id: offerId },
          {
            $set: {
              current_stage: currentStage,
              progression: progression,
              timeline: timeline
            }
          }
        );

        migrated++;
        
        // Progress indicator
        if (migrated % 100 === 0) {
          console.log(`✅ Migrated ${migrated}/${offers.length} offers...`);
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error migrating offer ${offer._id}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📈 Total: ${offers.length}`);

    // Show stage distribution
    console.log('\n📊 Stage Distribution:');
    const stageCounts = await Offer.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$current_stage', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    for (const stage of stageCounts) {
      console.log(`   ${stage._id}: ${stage.count}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateOffers()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

