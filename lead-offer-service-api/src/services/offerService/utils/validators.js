/**
 * Offer Service Validators
 * Contains validation utility functions for offer services
 */

const { mongoose } = require('../config/dependencies');

/**
 * Sanitize regex input to prevent ReDoS attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeRegexInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  sanitizeRegexInput,
  validateObjectId,
}; 