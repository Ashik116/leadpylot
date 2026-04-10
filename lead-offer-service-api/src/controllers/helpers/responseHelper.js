/**
 * Send JSON response with data
 * @param {Object} res - Express response object
 * @param {Object} data - Data to send
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendJsonResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json(data);
};

/**
 * Send success response with message
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Object} data - Data to include
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  const response = { message };
  if (data !== null) {
    response.data = data;
  }
  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {String} error - Error message
 * @param {Number} statusCode - HTTP status code (default: 400)
 * @param {Object} additionalInfo - Additional error information
 */
const sendErrorResponse = (res, error, statusCode = 400, additionalInfo = {}) => {
  res.status(statusCode).json({
    success: false,
    error,
    ...additionalInfo,
  });
};

/**
 * Send deprecated endpoint response
 * @param {Object} res - Express response object
 * @param {String} message - Deprecation message
 * @param {Object} alternatives - Alternative endpoints
 */
const sendDeprecatedResponse = (res, message, alternatives = {}) => {
  res.status(410).json({
    success: false,
    error: message,
    code: 'ENDPOINT_DEPRECATED',
    alternatives,
  });
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 */
const sendCreatedResponse = (res, data) => {
  res.status(201).json(data);
};

module.exports = {
  sendJsonResponse,
  sendSuccessResponse,
  sendErrorResponse,
  sendDeprecatedResponse,
  sendCreatedResponse,
};

