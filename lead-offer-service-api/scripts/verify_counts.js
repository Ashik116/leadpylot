/**
 * Verify Offer Stage Counts
 * 
 * Quick script to check the count of offers in each stage
 * 
 * Usage:
 * MONGO_URL=mongodb://localhost:27017/leadpylot node backend/microservices/lead-offers-service/scripts/verify_counts.js
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/leadpylot';

// Define schema inline
const OfferSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Offer = mongoose.model('Offer', OfferSchema);

async function verifyCounts() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGO_URL);
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Offer Stage Counts:\n');
    
    // Get counts for each stage
    const stages = ['offer', 'opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    
    console.log('   Stage          | Count');
    console.log('   ---------------------------');
    
    let total = 0;
    for (const stage of stages) {
      const count = await Offer.countDocuments({ 
        active: true, 
        current_stage: stage 
      });
      total += count;
      console.log(`   ${stage.padEnd(14)} | ${count}`);
    }
    
    console.log('   ---------------------------');
    console.log(`   ${'TOTAL'.padEnd(14)} | ${total}`);
    
    // Also check total active offers
    const totalActive = await Offer.countDocuments({ active: true });
    console.log(`\n   Total active offers in DB: ${totalActive}`);
    
    if (total !== totalActive) {
      console.log(`   ⚠️  WARNING: Mismatch detected! (${totalActive - total} offers unaccounted for)`);
    } else {
      console.log(`   ✅ All active offers accounted for!`);
    }

    // Show offers without current_stage
    const withoutStage = await Offer.countDocuments({ 
      active: true, 
      current_stage: { $exists: false } 
    });
    
    if (withoutStage > 0) {
      console.log(`\n   ⚠️  ${withoutStage} offers missing current_stage field`);
    }

    // Show progression status
    console.log('\n📊 Progression Status:\n');
    console.log('   Stage          | Active Progression');
    console.log('   ------------------------------------');
    
    const progressionStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    
    for (const stage of progressionStages) {
      const count = await Offer.countDocuments({ 
        active: true, 
        [`progression.${stage}.active`]: true 
      });
      console.log(`   ${stage.padEnd(14)} | ${count}`);
    }

  } catch (error) {
    console.error('❌ Count verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run verification
verifyCounts()
  .then(() => {
    console.log('\n✅ Count verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Count verification failed:', error);
    process.exit(1);
  });

