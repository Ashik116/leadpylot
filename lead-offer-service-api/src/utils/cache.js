/**
 * Cache Utility
 * Provides in-memory caching functionality
 */

const logger = require('./logger');

class CacheService {
  constructor() {
    this.inMemoryCache = new Map();
    this.defaultTTL = 3600; // 1 hour in seconds
    logger.info('In-memory cache initialized');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      const cached = this.inMemoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      // Remove expired entry
      if (cached) {
        this.inMemoryCache.delete(key);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      this.inMemoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000),
      });
      // Clean up expired entries periodically
      this.cleanupExpiredEntries();
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      this.inMemoryCache.delete(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      this.inMemoryCache.clear();
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Clean up expired in-memory cache entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (cached.expires <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      type: 'memory',
      memorySize: this.inMemoryCache.size,
    };
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
