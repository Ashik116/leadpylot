/**
 * Error Handling System
 * Provides standardized error handling for the application with custom error classes
 * and application-wide error codes.
 */

// Application-wide error codes
const ErrorCodes = {
    // Authentication errors (1000-1099)
    UNAUTHORIZED: 1000,
    INVALID_CREDENTIALS: 1001,
    TOKEN_EXPIRED: 1002,
    TOKEN_INVALID: 1003,
    INSUFFICIENT_PERMISSIONS: 1004,
  
    // Resource errors (1100-1199)
    RESOURCE_NOT_FOUND: 1100,
    RESOURCE_ALREADY_EXISTS: 1101,
    RESOURCE_CONFLICT: 1102,
  
    // Validation errors (1200-1299)
    VALIDATION_ERROR: 1200,
    INVALID_INPUT: 1201,
    MISSING_REQUIRED_FIELD: 1202,
  
    // Database errors (1300-1399)
    DATABASE_ERROR: 1300,
    QUERY_FAILED: 1301,
    CONNECTION_ERROR: 1302,
  
    // Server errors (1400-1499)
    INTERNAL_SERVER_ERROR: 1400,
    SERVICE_UNAVAILABLE: 1401,
  
    // Business logic errors (1500-1599)
    BUSINESS_RULE_VIOLATION: 1500,
    OPERATION_FAILED: 1501,
  };
  
  // Import our new logger
  const logger = require('./logger');
  
  /**
   * Base Application Error class
   * All custom errors should extend this class
   */
  class AppError extends Error {
    constructor(message, statusCode, errorCode, operation = null) {
      super(message);
      this.name = this.constructor.name;
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      this.operation = operation;
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Not Found Error
   * Used when a requested resource is not found
   */
  class NotFoundError extends AppError {
    constructor(resource, operation = null) {
      super(`${resource} not found`, 404, ErrorCodes.RESOURCE_NOT_FOUND, operation);
    }
  }
  
  /**
   * Validation Error
   * Used for input validation errors
   */
  class ValidationError extends AppError {
    constructor(message, details = null, operation = null) {
      super(message, 400, ErrorCodes.VALIDATION_ERROR, operation);
      this.details = details;
    }
  }
  
  /**
   * Conflict Error
   * Used for resource conflicts (e.g., duplicate resources)
   */
  class ConflictError extends AppError {
    constructor(message, operation = null) {
      super(message, 409, ErrorCodes.RESOURCE_CONFLICT, operation);
    }
  }
  
  /**
   * Authentication Error
   * Used for authentication failures
   */
  class AuthenticationError extends AppError {
    constructor(message, errorCode = ErrorCodes.UNAUTHORIZED, operation = null) {
      super(message, 401, errorCode, operation);
    }
  }
  
  /**
   * Authorization Error
   * Used for authorization failures
   */
  class AuthorizationError extends AppError {
    constructor(message, operation = null) {
      super(message, 403, ErrorCodes.INSUFFICIENT_PERMISSIONS, operation);
    }
  }
  
  /**
   * Database Error
   * Used for database-related errors
   */
  class DatabaseError extends AppError {
    constructor(message, errorCode = ErrorCodes.DATABASE_ERROR, operation = null) {
      super(message, 500, errorCode, operation);
    }
  }
  
  /**
   * Business Logic Error
   * Used for domain-specific business rule violations
   */
  class BusinessError extends AppError {
    constructor(message, errorCode = ErrorCodes.BUSINESS_RULE_VIOLATION, operation = null) {
      super(message, 422, errorCode, operation);
    }
  }
  
  /**
   * Handles errors and formats them for API responses
   */
  const handleError = (error, operation, req = null) => {
    const operationContext =
      operation || (req ? `${req.method} ${req.originalUrl}` : 'Unknown operation');
  
    if (error instanceof AppError) {
      error.operation = error.operation || operationContext;
  
      logger.error(`${error.name} in ${error.operation}`, {
        statusCode: error.statusCode,
        message: error.message,
        errorCode: error.errorCode,
      });
  
      return {
        status: error.statusCode,
        response: {
          error: error.message,
          code: error.errorCode,
          details: error.details,
          trace_id: generateTraceId(),
        },
      };
    }
  
    logger.error(`Unhandled error in ${operationContext}`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  
    if (error.name === 'ValidationError' && error.errors) {
      return {
        status: 400,
        response: {
          error: 'Validation failed',
          code: ErrorCodes.VALIDATION_ERROR,
          details: formatValidationErrors(error),
          trace_id: generateTraceId(),
        },
      };
    }
  
    return {
      status: error.statusCode || 500,
      response: {
        error: error.message || `An error occurred during ${operationContext}`,
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        trace_id: generateTraceId(),
        details:
          process.env.NODE_ENV === 'development'
            ? {
                stack: error.stack,
                message: error.message,
              }
            : undefined,
      },
    };
  };
  
  /**
   * Format validation errors from Mongoose/other validators
   */
  const formatValidationErrors = (error) => {
    if (error.errors) {
      const formattedErrors = {};
  
      Object.keys(error.errors).forEach((key) => {
        formattedErrors[key] = error.errors[key].message;
      });
  
      return formattedErrors;
    }
  
    return error.message;
  };
  
  /**
   * Generate a unique trace ID for error tracking
   */
  const generateTraceId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
  };
  
  /**
   * Async handler to wrap route handlers and catch errors
   */
  const asyncHandler = (routeHandler) => {
    return async (req, res, next) => {
      try {
        await routeHandler(req, res, next);
      } catch (error) {
        const errorResponse = handleError(error, null, req);
        res.status(errorResponse.status).json(errorResponse.response);
      }
    };
  };
  
  /**
   * Global error handling middleware
   */
  const errorMiddleware = (err, req, res, next) => {
    const errorResponse = handleError(err, null, req);
    res.status(errorResponse.status).json(errorResponse.response);
  };
  
  module.exports = {
    ErrorCodes,
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    AuthenticationError,
    AuthorizationError,
    DatabaseError,
    BusinessError,
    handleError,
    asyncHandler,
    errorMiddleware,
  };
  