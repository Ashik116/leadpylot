const { ValidationError } = require('../utils/errorHandler');
const { validationResult } = require('express-validator');

/**
 * Validates request data using express-validator
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Function} Express middleware function
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    try {
      // If it's an array of express-validator validations
      if (Array.isArray(validations)) {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const validationErrors = {};
          errors.array().forEach((error) => {
            validationErrors[error.param] = error.msg;
          });
          
          // Log validation errors for debugging
          const errorDetails = errors.array().map(err => ({
            param: err.param,
            msg: err.msg,
            value: err.value,
            location: err.location
          }));
          console.log('Validation errors:', {
            url: req.originalUrl,
            method: req.method,
            body: req.body,
            query: req.query,
            params: req.params,
            errors: validationErrors,
            errorDetails: errorDetails
          });
          
          return next(new ValidationError('Validation failed', validationErrors));
        }

        return next();
      }

      // If it's a Joi schema
      if (validations && typeof validations.validate === 'function') {
        const data = req.body;

        const { error, value } = validations.validate(data, {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const validationErrors = error.details.reduce((acc, err) => {
            acc[err.path[0]] = err.message.replace(/['"]/g, '');
            return acc;
          }, {});

          return next(new ValidationError('Validation failed', validationErrors));
        }

        // Replace request data with validated data
        req.body = value;
        return next();
      }

      // No validations to run, continue
      return next();
    } catch (error) {
      console.error('Validation error:', error);
      return next(error);
    }
  };
};

/**
 * Validates project creation requests
 * Example of how to use the validation middleware with custom schema
 */
const validateProjectCreate = (req, res, next) => {
  // Without using Joi directly (since it might not be installed)
  const { name, description } = req.body;

  const errors = {};

  if (!name) {
    errors.name = 'Project name is required';
  } else if (name.length < 3) {
    errors.name = 'Project name must be at least 3 characters';
  }

  if (description && description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Project validation failed', errors);
  }

  next();
};

/**
 * Validate object access permissions
 */
const validateOfferAccess = async (req, res, next) => {
  try {
    // This will be implemented based on your specific access control logic
    // For now, just pass through
    next();
  } catch (error) {
    console.error('Access validation error:', error);
    next(error);
  }
};

module.exports = {
  validateRequest,
  validateProjectCreate,
  validateOfferAccess,
};