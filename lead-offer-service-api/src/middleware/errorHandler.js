const logger = require('../utils/logger');

// Error codes for consistent error handling
const ErrorCodes = {
  // Authentication errors (1000-1099)
  UNAUTHORIZED: 1000,
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  TOKEN_INVALID: 1003,
  
  // Resource errors (1100-1199)
  RESOURCE_NOT_FOUND: 1100,
  RESOURCE_ALREADY_EXISTS: 1101,
  RESOURCE_CONFLICT: 1102,
  
  // Validation errors (1200-1299)
  VALIDATION_ERROR: 1200,
  INVALID_INPUT: 1201,
  
  // Database errors (1300-1399)
  DATABASE_ERROR: 1300,
  
  // Server errors (1400-1499)
  INTERNAL_SERVER_ERROR: 1400,
};

/**
 * Generate a unique trace ID for error tracking
 */
const generateTraceId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
};

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Helper: error payload with message for frontend display (same as error for consistency)
  const errorPayload = (error, code, details = undefined) => ({
    error,
    message: error,
    code,
    ...(details !== undefined && { details }),
    trace_id: generateTraceId(),
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(
      errorPayload('Validation Error', ErrorCodes.VALIDATION_ERROR, errors)
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const msg = `${field} already exists`;
    return res.status(400).json(
      errorPayload(msg, ErrorCodes.RESOURCE_ALREADY_EXISTS)
    );
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json(
      errorPayload('Invalid ID format', ErrorCodes.INVALID_INPUT)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      errorPayload('Invalid token', ErrorCodes.TOKEN_INVALID)
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorPayload('Token expired', ErrorCodes.TOKEN_EXPIRED)
    );
  }

  // Custom errors with errorCode property (e.g. ConflictError, ValidationError from services)
  if (err.errorCode) {
    const msg = err.message || 'Request failed';
    return res.status(err.statusCode || err.status || 500).json({
      error: msg,
      message: msg,
      code: err.errorCode,
      ...(err.details !== undefined && { details: err.details }),
      trace_id: generateTraceId(),
    });
  }

  // Default error
  const defaultMsg = err.message || 'Internal Server Error';
  res.status(err.statusCode || err.status || 500).json({
    error: defaultMsg,
    message: defaultMsg,
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    trace_id: generateTraceId(),
  });
};

module.exports = { errorHandler };

