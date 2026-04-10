/**
 * Redis Configuration
 * Handles Redis connection for RBAC caching
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

/**
 * Redis key prefixes for RBAC
 */
const REDIS_KEYS = {
  ROLE: 'rbac:role:',
  ROLE_PERMISSIONS: 'rbac:role-permissions:',
  ALL_PERMISSIONS: 'rbac:permissions:all',
  ALL_ROLES: 'rbac:roles:all',
  PERMISSION_GROUPS: 'rbac:permission-groups',
  ROLE_BY_NAME: 'rbac:role-name:',
};

/**
 * Cache TTL in seconds (5 minutes)
 */
const CACHE_TTL = 300;

/**
 * Initialize Redis connection
 */
const initRedis = async () => {
  try {
    // Check for REDIS_URL or build from parts
    let redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = process.env.REDIS_PORT || 6379;
      redisUrl = `redis://${host}:${port}`;
      logger.warn(`⚠️ REDIS_URL not found, falling back to ${redisUrl}`);
    } else {
      // Mask checking for security in logs
      const logUrl = redisUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
      logger.info(`🔌 Connecting to Redis at ${logUrl}`);
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️ Redis reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('⚠️ Redis connection closed');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    // Don't throw - allow app to work without Redis (fallback to DB)
    return null;
  }
};

/**
 * Get Redis client
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return isConnected && redisClient?.isOpen;
};

/**
 * Set a value in Redis with TTL
 */
const setCache = async (key, value, ttl = CACHE_TTL) => {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from Redis
 */
const getCache = async (key) => {
  if (!isRedisConnected()) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a key from Redis
 */
const deleteCache = async (key) => {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis DEL error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 */
const deleteCachePattern = async (pattern) => {
  if (!isRedisConnected()) return false;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error(`Redis DEL pattern error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Clear all RBAC cache
 */
const clearRbacCache = async () => {
  if (!isRedisConnected()) return false;

  try {
    await deleteCachePattern('rbac:*');
    logger.info('🧹 RBAC cache cleared');
    return true;
  } catch (error) {
    logger.error('Failed to clear RBAC cache:', error);
    return false;
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis connection closed');
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisConnected,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  clearRbacCache,
  closeRedis,
  REDIS_KEYS,
  CACHE_TTL,
};
