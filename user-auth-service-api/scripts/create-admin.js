#!/usr/bin/env node
/**
 * CLI Script to Create Admin User
 * Usage:
 *   node scripts/create-admin.js <username> <password>
 *   node scripts/create-admin.js (will use default: itadmin/itadmin)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createAdminUser, adminExists } = require('../src/utils/dbInitializer');
const logger = require('../src/utils/logger');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadpylot';

/**
 * Connect to MongoDB
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    const username = args[0] || 'itadmin';
    const password = args[1] || 'itadmin';

    console.log('\n================================================');
    console.log('         Admin User Creation Script');
    console.log('================================================\n');

    // Connect to database
    await connectDatabase();

    // Check if any admin exists
    const hasAdmin = await adminExists();
    if (hasAdmin) {
      console.log('ℹ️  Note: Admin users already exist in the system\n');
    }

    // Create admin user
    const result = await createAdminUser(username, password);

    if (result.success) {
      console.log('\n✅ SUCCESS!\n');
      console.log('📋 Admin User Credentials:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: Admin`);
      console.log('\n⚠️  IMPORTANT: Please change the password after first login!\n');
    } else {
      console.log(`\n❌ ${result.message}\n`);
    }

    console.log('================================================\n');

    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the script
main();
