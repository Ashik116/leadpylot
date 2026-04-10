/**
 * Safe Database Migration Script - Add Dynamic Filtering Indexes
 * 
 * PRODUCTION SAFE:
 * - Creates indexes in BACKGROUND (non-blocking)
 * - Can be run on live production database
 * - Provides progress updates
 * - Supports rollback
 * - No data modification
 * - No downtime required
 * 
 * Run this script:
 * node scripts/migrate-dynamic-indexes.js
 * 
 * Options:
 * - --dry-run: Preview changes without applying
 * - --rollback: Remove added indexes
 * - --force: Skip confirmations (use with caution)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  success: (...args) => console.log('✅', ...args),
  warn: (...args) => console.warn('⚠️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  progress: (...args) => console.log('🔄', ...args)
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');
const isForce = args.includes('--force');

// Indexes to create (background mode)
const INDEXES_TO_CREATE = [
  // Single field indexes
  { fields: { active: 1 }, options: { name: 'idx_active', background: true } },
  
  // Compound indexes for dynamic filtering
  {
    fields: { active: 1, status: 1, createdAt: -1 },
    options: { name: 'idx_active_status_created', background: true }
  },
  {
    fields: { active: 1, project_id: 1, status: 1 },
    options: { name: 'idx_active_project_status', background: true }
  },
  {
    fields: { active: 1, agent_id: 1, status: 1 },
    options: { name: 'idx_active_agent_status', background: true }
  },
  {
    fields: { active: 1, bank_id: 1 },
    options: { name: 'idx_active_bank', background: true }
  },
  {
    fields: { active: 1, created_by: 1 },
    options: { name: 'idx_active_created_by', background: true }
  },
  
  // Numeric range query indexes
  {
    fields: { active: 1, investment_volume: 1 },
    options: { name: 'idx_active_investment', background: true }
  },
  {
    fields: { active: 1, interest_rate: 1 },
    options: { name: 'idx_active_interest', background: true }
  },
  
  // Date grouping indexes
  {
    fields: { active: 1, scheduled_date: 1, scheduled_time: 1 },
    options: { name: 'idx_active_scheduled', background: true }
  },
  {
    fields: { active: 1, created_at: 1 },
    options: { name: 'idx_active_created_asc', background: true }
  },
  
  // Type and option indexes
  {
    fields: { active: 1, offerType: 1 },
    options: { name: 'idx_active_type', background: true }
  },
  {
    fields: { active: 1, flex_option: 1 },
    options: { name: 'idx_active_flex', background: true }
  },
  
  // Text search index (if not exists)
  {
    fields: { title: 'text', reference_no: 'text' },
    options: {
      name: 'idx_text_search',
      default_language: 'german',
      weights: { title: 10, reference_no: 5 },
      background: true
    }
  }
];

/**
 * Ask for user confirmation
 */
async function confirm(question) {
  if (isForce) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(uri);
    logger.success('Connected to MongoDB');
    
    const dbName = mongoose.connection.db.databaseName;
    logger.info(`Database: ${dbName}`);
    
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Get existing indexes on Offer collection
 */
async function getExistingIndexes() {
  try {
    const collection = mongoose.connection.collection('offers');
    const indexes = await collection.indexes();
    return indexes;
  } catch (error) {
    logger.error('Failed to fetch existing indexes:', error.message);
    throw error;
  }
}

/**
 * Check if an index already exists
 */
function indexExists(existingIndexes, indexName) {
  return existingIndexes.some(idx => idx.name === indexName);
}

/**
 * Create indexes (with progress)
 */
async function createIndexes() {
  try {
    const collection = mongoose.connection.collection('offers');
    const existingIndexes = await getExistingIndexes();
    
    logger.info('\\n📊 Current indexes:', existingIndexes.length);
    existingIndexes.forEach(idx => {
      logger.info(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    logger.info('\\n📝 Indexes to create:', INDEXES_TO_CREATE.length);
    
    // Filter out indexes that already exist
    const indexesToCreate = INDEXES_TO_CREATE.filter(index => {
      const exists = indexExists(existingIndexes, index.options.name);
      if (exists) {
        logger.warn(`Index "${index.options.name}" already exists, skipping`);
      }
      return !exists;
    });

    if (indexesToCreate.length === 0) {
      logger.success('All indexes already exist! Nothing to do.');
      return {
        created: 0,
        skipped: INDEXES_TO_CREATE.length,
        failed: 0
      };
    }

    logger.info(`\\n🔨 Will create ${indexesToCreate.length} new indexes`);
    indexesToCreate.forEach(index => {
      logger.info(`  - ${index.options.name}: ${JSON.stringify(index.fields)}`);
    });

    if (isDryRun) {
      logger.warn('\\n⚠️  DRY RUN MODE - No changes will be made');
      return {
        created: 0,
        skipped: indexesToCreate.length,
        failed: 0
      };
    }

    // Confirm with user
    logger.warn('\\n⚠️  IMPORTANT:');
    logger.warn('  - Indexes will be created in BACKGROUND mode (non-blocking)');
    logger.warn('  - This is safe for production with millions of records');
    logger.warn('  - Index creation may take several minutes');
    logger.warn('  - Database will remain operational during creation');
    
    const shouldContinue = await confirm('\\nProceed with index creation?');
    if (!shouldContinue) {
      logger.warn('Migration cancelled by user');
      process.exit(0);
    }

    // Create indexes one by one with progress
    const results = {
      created: 0,
      skipped: INDEXES_TO_CREATE.length - indexesToCreate.length,
      failed: 0,
      errors: []
    };

    logger.info('\\n🚀 Starting index creation...\\n');
    
    for (let i = 0; i < indexesToCreate.length; i++) {
      const index = indexesToCreate[i];
      const progress = `[${i + 1}/${indexesToCreate.length}]`;
      
      try {
        logger.progress(`${progress} Creating index "${index.options.name}"...`);
        
        const startTime = Date.now();
        await collection.createIndex(index.fields, index.options);
        const duration = Date.now() - startTime;
        
        logger.success(`${progress} Created "${index.options.name}" in ${duration}ms`);
        results.created++;
      } catch (error) {
        logger.error(`${progress} Failed to create "${index.options.name}":`, error.message);
        results.failed++;
        results.errors.push({
          index: index.options.name,
          error: error.message
        });
      }
    }

    // Summary
    logger.info('\\n' + '='.repeat(60));
    logger.info('📊 MIGRATION SUMMARY');
    logger.info('='.repeat(60));
    logger.success(`Created:  ${results.created} indexes`);
    logger.info(`Skipped:  ${results.skipped} indexes (already existed)`);
    if (results.failed > 0) {
      logger.error(`Failed:   ${results.failed} indexes`);
      results.errors.forEach(err => {
        logger.error(`  - ${err.index}: ${err.error}`);
      });
    }
    logger.info('='.repeat(60));

    return results;
  } catch (error) {
    logger.error('Migration failed:', error.message);
    throw error;
  }
}

/**
 * Rollback - Remove created indexes
 */
async function rollbackIndexes() {
  try {
    const collection = mongoose.connection.collection('offers');
    const existingIndexes = await getExistingIndexes();
    
    logger.warn('\\n🔙 ROLLBACK MODE');
    logger.warn('This will remove indexes created by the migration');
    
    // Find indexes that match our migration
    const indexesToRemove = existingIndexes.filter(idx => {
      return INDEXES_TO_CREATE.some(created => created.options.name === idx.name);
    });

    if (indexesToRemove.length === 0) {
      logger.info('No migration indexes found to remove');
      return { removed: 0 };
    }

    logger.info('\\nIndexes to remove:');
    indexesToRemove.forEach(idx => {
      logger.info(`  - ${idx.name}`);
    });

    if (isDryRun) {
      logger.warn('\\n⚠️  DRY RUN MODE - No changes will be made');
      return { removed: 0 };
    }

    const shouldContinue = await confirm('\\nProceed with rollback?');
    if (!shouldContinue) {
      logger.warn('Rollback cancelled by user');
      process.exit(0);
    }

    const results = {
      removed: 0,
      failed: 0,
      errors: []
    };

    logger.info('\\n🚀 Starting rollback...\\n');

    for (const index of indexesToRemove) {
      try {
        logger.progress(`Removing index "${index.name}"...`);
        await collection.dropIndex(index.name);
        logger.success(`Removed "${index.name}"`);
        results.removed++;
      } catch (error) {
        logger.error(`Failed to remove "${index.name}":`, error.message);
        results.failed++;
        results.errors.push({
          index: index.name,
          error: error.message
        });
      }
    }

    // Summary
    logger.info('\\n' + '='.repeat(60));
    logger.info('📊 ROLLBACK SUMMARY');
    logger.info('='.repeat(60));
    logger.success(`Removed:  ${results.removed} indexes`);
    if (results.failed > 0) {
      logger.error(`Failed:   ${results.failed} indexes`);
    }
    logger.info('='.repeat(60));

    return results;
  } catch (error) {
    logger.error('Rollback failed:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('🚀 Dynamic Filtering Index Migration Tool');
    logger.info('==========================================');
    
    if (isDryRun) {
      logger.warn('Running in DRY RUN mode - no changes will be made');
    }
    
    if (isRollback) {
      logger.warn('Running in ROLLBACK mode');
    }

    // Connect to database
    await connectDatabase();

    // Count documents
    const collection = mongoose.connection.collection('offers');
    const count = await collection.countDocuments();
    logger.info(`Total offers in database: ${count.toLocaleString()}`);

    if (count > 100000) {
      logger.warn(`\\n⚠️  Large dataset detected (${count.toLocaleString()} records)`);
      logger.warn('Index creation may take 10-30 minutes');
      logger.warn('Background mode ensures database remains operational');
    }

    // Execute migration or rollback
    let results;
    if (isRollback) {
      results = await rollbackIndexes();
    } else {
      results = await createIndexes();
    }

    // Success
    logger.success('\\n✅ Operation completed successfully!');
    
    if (!isDryRun && !isRollback && results.created > 0) {
      logger.info('\\nNext steps:');
      logger.info('1. Monitor index creation progress:');
      logger.info('   db.currentOp({ "msg": /Index Build/ })');
      logger.info('2. Check index sizes:');
      logger.info('   db.offers.stats().indexSizes');
      logger.info('3. Test the new dynamic filtering endpoints');
      logger.info('4. Monitor query performance');
    }

    process.exit(0);
  } catch (error) {
    logger.error('\\n❌ Migration failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
  }
}

// Run migration
main();

