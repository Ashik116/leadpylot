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
  constructor(message = 'Validation failed') {
    super(400, message);
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
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(409, message);
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
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
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

