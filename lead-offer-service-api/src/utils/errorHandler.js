/**
 * Error Handler Utilities
 * Custom error classes and error handling middleware
 */

/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(400, message);
    this.details = details;
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends ApiError {
  constructor(message = 'Access denied') {
    super(403, message);
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(401, message);
  }
}

/**
 * Conflict Error (409)
 * Uses errorCode 1102 (RESOURCE_CONFLICT) so middleware returns consistent code with other APIs
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(409, message);
    this.errorCode = 1102;
  }
}

/**
 * Bad Request Error (400)
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message);
  }
}

/**
 * Database Error (500)
 * Used for database operation failures
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database error occurred', code = null) {
    super(500, message);
    this.code = code;
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generate a unique trace ID for error tracking
 */
const generateTraceId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
};

/**
 * Global error handler middleware
 */
const errorMiddleware = (err, req, res, next) => {
  const logger = require('./logger');
  
  let { statusCode, message } = err;
  
  // Default to 500 if no status code
  statusCode = statusCode || 500;
  
  // Log the error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      error: message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn('Client Error:', {
      error: message,
      statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }
  
  // Send error response in monolith-compatible format
  const response = {
    error: message,
    code: err.errorCode || (statusCode === 400 ? 1400 : statusCode), // Use errorCode if present, otherwise use 1400 for validation errors to match monolith
    trace_id: generateTraceId(),
  };

  // Add validation details if present
  if (err.details) {
    response.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  ApiError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
  AuthenticationError,
  ConflictError,
  BadRequestError,
  InternalServerError,
  DatabaseError,
  asyncHandler,
  errorMiddleware,
  notFoundHandler,
};

