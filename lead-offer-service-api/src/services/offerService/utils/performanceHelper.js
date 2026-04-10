/**
 * Performance Monitoring Helper
 * Utilities for tracking and optimizing query performance
 */

const logger = require('../../../utils/logger');

/**
 * Performance timer class for tracking operation duration
 */
class PerformanceTimer {
  constructor(operationName) {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.checkpoints = [];
  }

  /**
   * Add a checkpoint to track intermediate steps
   * @param {String} name - Checkpoint name
   */
  checkpoint(name) {
    const now = Date.now();
    const duration = now - this.startTime;
    const lastCheckpoint = this.checkpoints.length > 0
      ? this.checkpoints[this.checkpoints.length - 1]
      : { time: this.startTime };
    const stepDuration = now - lastCheckpoint.time;

    this.checkpoints.push({
      name,
      time: now,
      duration,
      stepDuration,
    });

    logger.debug(`[${this.operationName}] ${name}: ${stepDuration}ms (total: ${duration}ms)`);
  }

  /**
   * End the timer and log results
   * @param {Number} resultCount - Number of results returned
   * @returns {Number} - Total duration in ms
   */
  end(resultCount = null) {
    const duration = Date.now() - this.startTime;

    if (this.checkpoints.length > 0) {
      const summary = this.checkpoints
        .map((cp) => `${cp.name}=${cp.stepDuration}ms`)
        .join(', ');

      logger.info(
        `[${this.operationName}] Completed in ${duration}ms${resultCount !== null ? ` (${resultCount} results)` : ''} [${summary}]`
      );
    } else {
      logger.info(
        `[${this.operationName}] Completed in ${duration}ms${resultCount !== null ? ` (${resultCount} results)` : ''}`
      );
    }

    return duration;
  }

  /**
   * Log a warning if duration exceeds threshold
   * @param {Number} threshold - Threshold in ms
   * @param {String} message - Warning message
   */
  warnIfSlow(threshold = 1000, message = 'Operation taking longer than expected') {
    const duration = Date.now() - this.startTime;
    if (duration > threshold) {
      logger.warn(`[${this.operationName}] ${message}: ${duration}ms (threshold: ${threshold}ms)`);
    }
  }
}

/**
 * Create a performance timer
 * @param {String} operationName - Name of the operation being tracked
 * @returns {PerformanceTimer} - Timer instance
 */
const createTimer = (operationName) => {
  return new PerformanceTimer(operationName);
};

/**
 * Measure async operation performance
 * @param {String} name - Operation name
 * @param {Function} operation - Async operation to measure
 * @returns {Promise<Object>} - { result, duration }
 */
const measureAsync = async (name, operation) => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    logger.debug(`[Performance] ${name}: ${duration}ms`);

    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Performance] ${name} failed after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Track query performance statistics
 */
class QueryStats {
  constructor() {
    this.stats = new Map();
  }

  /**
   * Record a query execution
   * @param {String} queryName - Name of the query
   * @param {Number} duration - Duration in ms
   * @param {Number} resultCount - Number of results
   */
  record(queryName, duration, resultCount = 0) {
    if (!this.stats.has(queryName)) {
      this.stats.set(queryName, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        totalResults: 0,
      });
    }

    const stat = this.stats.get(queryName);
    stat.count++;
    stat.totalDuration += duration;
    stat.minDuration = Math.min(stat.minDuration, duration);
    stat.maxDuration = Math.max(stat.maxDuration, duration);
    stat.totalResults += resultCount;

    this.stats.set(queryName, stat);
  }

  /**
   * Get statistics for a query
   * @param {String} queryName - Name of the query
   * @returns {Object} - Statistics object
   */
  get(queryName) {
    const stat = this.stats.get(queryName);
    if (!stat) return null;

    return {
      ...stat,
      avgDuration: stat.count > 0 ? stat.totalDuration / stat.count : 0,
      avgResults: stat.count > 0 ? stat.totalResults / stat.count : 0,
    };
  }

  /**
   * Get all statistics
   * @returns {Object} - Map of all statistics
   */
  getAll() {
    const result = {};
    for (const [queryName, stat] of this.stats.entries()) {
      result[queryName] = {
        ...stat,
        avgDuration: stat.count > 0 ? stat.totalDuration / stat.count : 0,
        avgResults: stat.count > 0 ? stat.totalResults / stat.count : 0,
      };
    }
    return result;
  }

  /**
   * Log statistics summary
   */
  logSummary() {
    logger.info('=== Query Performance Summary ===');
    for (const [queryName, stat] of this.stats.entries()) {
      const avg = stat.count > 0 ? (stat.totalDuration / stat.count).toFixed(2) : 0;
      logger.info(
        `${queryName}: ${stat.count} calls, avg ${avg}ms (min: ${stat.minDuration}ms, max: ${stat.maxDuration}ms)`
      );
    }
  }

  /**
   * Reset statistics
   */
  reset() {
    this.stats.clear();
  }
}

// Global query stats instance
const globalQueryStats = new QueryStats();

/**
 * Decorator to automatically track function performance
 * @param {String} name - Operation name
 * @param {Function} fn - Function to wrap
 * @returns {Function} - Wrapped function
 */
const trackPerformance = (name, fn) => {
  return async (...args) => {
    const timer = createTimer(name);

    try {
      const result = await fn(...args);
      const resultCount = Array.isArray(result?.data) ? result.data.length : null;
      const duration = timer.end(resultCount);

      // Record in global stats
      globalQueryStats.record(name, duration, resultCount || 0);

      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  };
};

/**
 * Get performance recommendations based on query duration
 * @param {Number} duration - Query duration in ms
 * @param {Number} resultCount - Number of results
 * @returns {Array<String>} - Array of recommendations
 */
const getPerformanceRecommendations = (duration, resultCount = 0) => {
  const recommendations = [];

  if (duration > 5000) {
    recommendations.push('Query is very slow (>5s). Consider adding indexes or reducing result set.');
  } else if (duration > 2000) {
    recommendations.push('Query is slow (>2s). Consider optimization.');
  }

  if (resultCount > 1000) {
    recommendations.push('Large result set (>1000 items). Consider pagination or filtering.');
  }

  if (resultCount === 0 && duration > 1000) {
    recommendations.push('Slow query with no results. Check if indexes are being used.');
  }

  return recommendations;
};

module.exports = {
  PerformanceTimer,
  createTimer,
  measureAsync,
  QueryStats,
  globalQueryStats,
  trackPerformance,
  getPerformanceRecommendations,
};

