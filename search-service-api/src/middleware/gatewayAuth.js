/**
 * Gateway Authentication Middleware
 * 
 * SECURITY: This middleware ensures requests only come from the Gateway.
 * Direct access to Core Backend is blocked.
 * 
 * In production, this middleware should be applied to all routes.
 */

const GATEWAY_SECRET = process.env.GATEWAY_SECRET;
const GATEWAY_AUTH_ENABLED = process.env.GATEWAY_AUTH_ENABLED !== 'false';

// Signature verification (optional, for extra security)
const crypto = require('crypto');

/**
 * Verify that the request signature is valid
 * This prevents replay attacks and ensures request integrity
 */
const verifySignature = (req) => {
  const signature = req.headers['x-gateway-signature'];
  const timestamp = req.headers['x-gateway-timestamp'];
  
  if (!signature || !timestamp) return false;
  
  // Check timestamp is recent (within 5 minutes)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }
  
  // Recreate signature
  const tenantId = req.headers['x-tenant-id'] || 'none';
  const signatureData = `${req.method}:${req.path}:${tenantId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.GATEWAY_ENCRYPTION_KEY || GATEWAY_SECRET)
    .update(signatureData)
    .digest('hex');
  
  return signature === expectedSignature;
};

/**
 * Main gateway authentication middleware
 * Validates that requests come from the Gateway
 */
const validateGatewayRequest = (req, res, next) => {
  // Skip validation if disabled (development only)
  if (!GATEWAY_AUTH_ENABLED) {
    console.warn('⚠️ Gateway authentication is DISABLED. Enable in production!');
    return next();
  }

  // Check for gateway secret
  const gatewaySecret = req.headers['x-gateway-secret'];
  
  if (!gatewaySecret) {
    console.warn('🚫 Direct access attempt blocked:', {
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Direct access to this service is not allowed',
    });
  }

  if (gatewaySecret !== GATEWAY_SECRET) {
    console.warn('🚫 Invalid gateway secret:', {
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid gateway credentials',
    });
  }

  // Optional: Verify request signature
  if (process.env.VERIFY_GATEWAY_SIGNATURE === 'true') {
    if (!verifySignature(req)) {
      console.warn('🚫 Invalid request signature:', {
        path: req.path,
        ip: req.ip,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid request signature',
      });
    }
  }

  // Extract tenant context from headers (set by Gateway)
  req.tenantId = req.headers['x-tenant-id'];
  req.tenantType = req.headers['x-tenant-type'];
  req.tenantDomain = req.headers['x-tenant-domain'];
  req.requestId = req.headers['x-request-id'];

  // Log successful gateway auth (development only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Gateway auth passed:', {
      tenantId: req.tenantId,
      path: req.path,
    });
  }

  next();
};

/**
 * Middleware to inject tenantId into database queries
 * Use with mongoose middleware
 */
const injectTenantFilter = (req, res, next) => {
  if (req.tenantId) {
    // Store tenant filter for use in queries
    req.tenantFilter = { tenantId: req.tenantId };
  } else {
    req.tenantFilter = {};
  }
  next();
};

/**
 * Middleware to validate tenant has access to specific resource
 * Use after fetching a resource to verify tenant ownership
 */
const validateTenantOwnership = (resource) => {
  return (req, res, next) => {
    if (!req.tenantId) {
      // No tenant context, allow (for admin/system requests)
      return next();
    }

    if (resource && resource.tenantId && resource.tenantId !== req.tenantId) {
      console.warn('🚫 Tenant access violation:', {
        requestTenantId: req.tenantId,
        resourceTenantId: resource.tenantId,
        resourceType: resource.constructor?.modelName,
        path: req.path,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this resource',
      });
    }

    next();
  };
};

/**
 * Skip gateway auth for specific paths (health checks, etc.)
 */
const skipGatewayAuth = (paths = []) => {
  return (req, res, next) => {
    const shouldSkip = paths.some(path => {
      if (typeof path === 'string') {
        return req.path === path || req.path.startsWith(path);
      }
      if (path instanceof RegExp) {
        return path.test(req.path);
      }
      return false;
    });

    if (shouldSkip) {
      return next();
    }

    return validateGatewayRequest(req, res, next);
  };
};

module.exports = {
  validateGatewayRequest,
  injectTenantFilter,
  validateTenantOwnership,
  skipGatewayAuth,
};
