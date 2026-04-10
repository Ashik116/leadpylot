/**
 * Database Configuration
 * MongoDB connection setup
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    // Check if we're running inside Docker
    const isRunningInDocker =
      process.env.NODE_ENV === 'production' ||
      require('fs').existsSync('/.dockerenv') ||
      process.env.DOCKER_CONTAINER === 'true';

    // Get MongoDB URI and adjust for local development if needed
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadpylot';
    
    // Adjust URI for local development if needed
    if (!isRunningInDocker && mongoUri.includes('host.docker.internal')) {
      mongoUri = mongoUri.replace('host.docker.internal', 'localhost');
      logger.info('Adjusted MongoDB URI for local development', { 
        original: process.env.MONGODB_URI,
        adjusted: mongoUri 
      });
    }
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    };
    
    await mongoose.connect(mongoUri, options);
    
    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;
