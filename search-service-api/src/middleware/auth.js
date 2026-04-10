/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            logger.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded; // Attach user payload (should contain _id, role, etc.)
        
        next();
    } catch (error) {
        logger.warn(`Authentication failed: ${error.message}`);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { authenticate };

