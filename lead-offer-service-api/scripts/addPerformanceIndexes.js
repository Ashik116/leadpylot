/**
 * Database Performance Indexes Migration
 * Adds critical indexes for optimal query performance
 * 
 * Run with: node scripts/addPerformanceIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
};

const connectDatabase = async () => {
  // Support both Docker and local environments
  // Docker: mongodb://host.docker.internal:27017/leadpylot or mongodb://mongo:27017/leadpylot
  // Local: mongodb://localhost:27017/leadpylot
  const mongoUri = process.env.MONGODB_URI || 
    (process.env.DOCKER === 'true' ? 'mongodb://host.docker.internal:27017/leadpylot' : 'mongodb://localhost:27017/leadpylot');
  
  logger.info(`Connecting to MongoDB at: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Mask credentials in log
  
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    socketTimeoutMS: 45000,
  };
  
  try {
    await mongoose.connect(mongoUri, options);
    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

const addIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    logger.info('Starting index creation...');
    logger.info('Note: Existing indexes will be skipped (safe to run multiple times)');
    
    // Helper to create index safely (skip if exists)
    const createIndexSafe = async (collection, index, options) => {
      try {
        const indexName = options.name || JSON.stringify(index);
        // Check if index already exists
        const indexes = await collection.indexes();
        const exists = indexes.some(idx => idx.name === indexName);
        
        if (exists) {
          logger.info(`  ⏭  Index ${indexName} already exists, skipping...`);
          return;
        }
        
        await collection.createIndex(index, options);
        logger.info(`  ✓ Created index: ${indexName}`);
      } catch (error) {
        // If index creation fails due to duplicate, that's ok
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          logger.info(`  ⏭  Index already exists (conflict), skipping...`);
        } else {
          throw error;
        }
      }
    };

    // Lead Collection Indexes
    logger.info('Creating indexes for leads collection...');
    const leadsCollection = db.collection('leads');
    await createIndexSafe(leadsCollection, { active: 1, use_status: 1, createdAt: -1 }, { name: 'active_usestatus_created_idx' });
    await createIndexSafe(leadsCollection, { active: 1, status: 1, createdAt: -1 }, { name: 'active_status_created_idx' });
    await createIndexSafe(leadsCollection, { active: 1, source_id: 1 }, { name: 'active_source_idx' });
    await createIndexSafe(leadsCollection, { active: 1, duplicate_status: 1 }, { name: 'active_duplicate_idx' });
    await createIndexSafe(leadsCollection, { createdAt: -1 }, { name: 'created_desc_idx' });
    await createIndexSafe(leadsCollection, { updatedAt: -1 }, { name: 'updated_desc_idx' });
    await createIndexSafe(leadsCollection, { lead_source_no: 1 }, { name: 'lead_source_no_idx' });
    // Text search index
    try {
      await createIndexSafe(leadsCollection, { contact_name: 'text', email_from: 'text', phone: 'text' }, { name: 'text_search_idx' });
    } catch (error) {
      logger.warn('Text search index creation skipped (may require language-specific configuration):', error.message);
    }
    logger.info('✓ Lead indexes created');

    // AssignLeads Collection Indexes
    logger.info('Creating indexes for assignleads collection...');
    const assignLeadsCollection = db.collection('assignleads');
    await createIndexSafe(assignLeadsCollection, { lead_id: 1, status: 1 }, { name: 'lead_status_idx' });
    await createIndexSafe(assignLeadsCollection, { agent_id: 1, status: 1 }, { name: 'agent_status_idx' });
    await createIndexSafe(assignLeadsCollection, { project_id: 1, status: 1 }, { name: 'project_status_idx' });
    await createIndexSafe(assignLeadsCollection, { lead_id: 1, agent_id: 1, status: 1 }, { name: 'lead_agent_status_idx' });
    await createIndexSafe(assignLeadsCollection, { agent_id: 1, project_id: 1, status: 1, assigned_at: -1 }, { name: 'agent_project_status_date_idx' });
    await createIndexSafe(assignLeadsCollection, { assigned_at: -1 }, { name: 'assigned_at_desc_idx' });
    logger.info('✓ AssignLeads indexes created');

    // Offer Collection Indexes
    logger.info('Creating indexes for offers collection...');
    const offersCollection = db.collection('offers');
    await createIndexSafe(offersCollection, { lead_id: 1, active: 1 }, { name: 'lead_active_idx' });
    await createIndexSafe(offersCollection, { project_id: 1, active: 1 }, { name: 'project_active_idx' });
    await createIndexSafe(offersCollection, { agent_id: 1, active: 1 }, { name: 'agent_active_idx' });
    await createIndexSafe(offersCollection, { lead_id: 1, active: 1, investment_volume: -1 }, { name: 'lead_active_volume_idx' });
    await createIndexSafe(offersCollection, { createdAt: -1 }, { name: 'offer_created_desc_idx' });
    logger.info('✓ Offer indexes created');

    // Opening Collection Indexes
    logger.info('Creating indexes for openings collection...');
    const openingsCollection = db.collection('openings');
    await createIndexSafe(openingsCollection, { offer_id: 1, active: 1 }, { name: 'offer_active_idx' });
    await createIndexSafe(openingsCollection, { createdAt: -1 }, { name: 'opening_created_desc_idx' });
    logger.info('✓ Opening indexes created');

    // Confirmation Collection Indexes
    logger.info('Creating indexes for confirmations collection...');
    const confirmationsCollection = db.collection('confirmations');
    await createIndexSafe(confirmationsCollection, { opening_id: 1, active: 1 }, { name: 'opening_active_idx' });
    await createIndexSafe(confirmationsCollection, { offer_id: 1, active: 1 }, { name: 'conf_offer_active_idx' });
    await createIndexSafe(confirmationsCollection, { createdAt: -1 }, { name: 'conf_created_desc_idx' });
    logger.info('✓ Confirmation indexes created');

    // PaymentVoucher Collection Indexes
    logger.info('Creating indexes for paymentvouchers collection...');
    const paymentVouchersCollection = db.collection('paymentvouchers');
    await createIndexSafe(paymentVouchersCollection, { confirmation_id: 1, active: 1 }, { name: 'conf_active_idx' });
    await createIndexSafe(paymentVouchersCollection, { offer_id: 1, active: 1 }, { name: 'pv_offer_active_idx' });
    await createIndexSafe(paymentVouchersCollection, { createdAt: -1 }, { name: 'pv_created_desc_idx' });
    logger.info('✓ PaymentVoucher indexes created');

    // Todo Collection Indexes
    logger.info('Creating indexes for todos collection...');
    const todosCollection = db.collection('todos');
    await createIndexSafe(todosCollection, { lead_id: 1, active: 1 }, { name: 'todo_lead_active_idx' });
    await createIndexSafe(todosCollection, { assigned_to: 1, active: 1 }, { name: 'todo_assigned_active_idx' });
    await createIndexSafe(todosCollection, { creator_id: 1, active: 1 }, { name: 'todo_creator_active_idx' });
    await createIndexSafe(todosCollection, { lead_id: 1, assigned_to: 1, active: 1 }, { name: 'todo_lead_assigned_active_idx' });
    await createIndexSafe(todosCollection, { createdAt: -1 }, { name: 'todo_created_desc_idx' });
    await createIndexSafe(todosCollection, { status: 1, active: 1 }, { name: 'todo_status_active_idx' });
    await createIndexSafe(todosCollection, { isDone: 1, active: 1 }, { name: 'todo_done_active_idx' });
    logger.info('✓ Todo indexes created');

    // Appointment Collection Indexes
    logger.info('Creating indexes for appointments collection...');
    const appointmentsCollection = db.collection('appointments');
    await createIndexSafe(appointmentsCollection, { lead_id: 1, active: 1 }, { name: 'appt_lead_active_idx' });
    await createIndexSafe(appointmentsCollection, { appointment_date: 1, active: 1 }, { name: 'appt_date_active_idx' });
    await createIndexSafe(appointmentsCollection, { createdAt: -1 }, { name: 'appt_created_desc_idx' });
    logger.info('✓ Appointment indexes created');

    logger.info('✓ All indexes created successfully!');
    
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
};

const run = async () => {
  try {
    await connectDatabase();
    await addIndexes();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Run if executed directly
if (require.main === module) {
  run();
}

module.exports = { addIndexes, connectDatabase };

