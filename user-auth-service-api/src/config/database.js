/**
 * Database Configuration
 * MongoDB connection setup
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://host.docker.internal:27017/leadpylot';

    // Use the provided MONGODB_URI as-is (Docker or local)
    const finalUri = MONGODB_URI;

    logger.info(`🔗 Connecting to MongoDB: ${finalUri}`);

    await mongoose.connect(finalUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('✅ MongoDB connected successfully');
    logger.info(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB error:', err);
});

module.exports = connectDatabase;
