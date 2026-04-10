/**
 * Error Handling System
 */

const logger = require('./logger');

// Application-wide error codes
const ErrorCodes = {
  UNAUTHORIZED: 1000,
  INVALID_CREDENTIALS: 1001,
  TOKEN_EXPIRED: 1002,
  VALIDATION_ERROR: 1200,
  DATABASE_ERROR: 1300,
  INTERNAL_SERVER_ERROR: 1400,
};

/**
 * Base Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR);
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403, ErrorCodes.UNAUTHORIZED);
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, ErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Async handler to wrap route handlers and catch errors
 */
const asyncHandler = (routeHandler) => {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.error(`${err.name}: ${err.message}`, { statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.errorCode,
      details: err.details,
    });
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
  });
};

module.exports = {
  ErrorCodes,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  asyncHandler,
  errorMiddleware,
};

