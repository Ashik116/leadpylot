const fs = require('fs');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/** True when this process should use the Compose MongoDB hostname (mongodb) instead of localhost. */
function isRunningInDocker() {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.DOCKER_CONTAINER === 'true') return true;
  if (fs.existsSync('/.dockerenv')) return true;
  try {
    const cg = fs.readFileSync('/proc/self/cgroup', 'utf8');
    if (cg.includes('docker') || cg.includes('containerd') || cg.includes('kubepods')) return true;
  } catch (_) {
    /* not Linux or no cgroup */
  }
  return false;
}

const connectDatabase = async () => {
  try {
    const inDocker = isRunningInDocker();

    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadpylot';

    if (inDocker) {
      try {
        const schemeMatch = mongoUri.match(/^mongodb(\+srv)?:\/\//);
        if (schemeMatch) {
          const normalized = mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
          const u = new URL(normalized);
          if (
            u.hostname === 'localhost' ||
            u.hostname === '127.0.0.1' ||
            u.hostname === 'host.docker.internal'
          ) {
            const original = mongoUri;
            u.hostname = 'mongodb';
            mongoUri = u.toString().replace(/^http:\/\//, schemeMatch[0]);
            logger.info('Adjusted MongoDB URI for Docker (loopback/host.docker.internal → mongodb service)', {
              original,
              adjusted: mongoUri,
            });
          }
        }
      } catch (_) {
        // fall through to mongoose.connect
      }
    }

    if (!inDocker && mongoUri.includes('host.docker.internal')) {
      mongoUri = mongoUri.replace('host.docker.internal', 'localhost');
      logger.info('Adjusted MongoDB URI for local development', {
        original: process.env.MONGODB_URI,
        adjusted: mongoUri,
      });
    }

    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    };

    await mongoose.connect(mongoUri, options);

    logger.info('Search Service connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;
