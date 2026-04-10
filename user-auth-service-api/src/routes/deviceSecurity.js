/**
 * Device Security Routes
 * API endpoints for device-based security management
 */
const express = require('express');
const { authenticate } = require('../auth/middleware/authenticate');
const {
  getDeviceSecurityStats,
  manualBlockDevice,
  unblockDevice
} = require('../services/deviceSecurityService');
const { DeviceBlocklist, DEVICE_BLOCK_TYPES, DEVICE_BLOCK_REASONS } = require('../models');
const router = express.Router();
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

/**
 * @route GET /device-security/stats
 * @desc Get device security statistics for dashboard
 * @access Admin only
 */
router.get('/stats', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_STATS), async (req, res) => {
  try {
    const stats = await getDeviceSecurityStats();
    res.json(stats);
  } catch (error) {
    console.error('Device security stats error:', error);
    res.status(500).json({ error: 'Failed to fetch device security statistics' });
  }
});

/**
 * @route GET /device-security/blocks
 * @desc Get list of blocked devices with pagination
 * @access Admin only
 */
router.get('/blocks', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_BLOCK_READ), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;
    
    const filter = { isActive: true };
    
    // Filter by block type if specified
    if (req.query.blockType && Object.values(DEVICE_BLOCK_TYPES).includes(req.query.blockType)) {
      filter.blockType = req.query.blockType;
    }
    
    // Filter by block reason if specified
    if (req.query.blockReason && Object.values(DEVICE_BLOCK_REASONS).includes(req.query.blockReason)) {
      filter.blockReason = req.query.blockReason;
    }

    const [blocks, totalCount] = await Promise.all([
      DeviceBlocklist.find(filter)
        .populate('blockedBy', 'login role')
        .sort({ blockedAt: -1 })
        .limit(limit)
        .skip(skip),
      DeviceBlocklist.countDocuments(filter)
    ]);

    // Mask device fingerprints for security (show only first 8 characters)
    const maskedBlocks = blocks.map(block => ({
      ...block.toObject(),
      deviceFingerprint: block.deviceFingerprint.substring(0, 8) + '...',
      _originalFingerprint: block.deviceFingerprint, // Keep original for actions
    }));

    res.json({
      blocks: maskedBlocks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get device blocks error:', error);
    res.status(500).json({ error: 'Failed to fetch device blocks' });
  }
});

/**
 * @route POST /device-security/block
 * @desc Manually block a device
 * @access Admin only
 * @body {string} deviceFingerprint - Device fingerprint to block
 * @body {string} reason - Block reason
 * @body {string} blockType - Block type (temporary/permanent)
 * @body {number} expirationHours - Hours until expiration (for temporary blocks)
 */
router.post('/block', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_BLOCK_CREATE), async (req, res) => {
  try {
    const { deviceFingerprint, reason, blockType, expirationHours } = req.body;

    if (!deviceFingerprint || !reason) {
      return res.status(400).json({ error: 'Device fingerprint and reason are required' });
    }

    if (!Object.values(DEVICE_BLOCK_REASONS).includes(reason)) {
      return res.status(400).json({ error: 'Invalid block reason' });
    }

    if (blockType && !Object.values(DEVICE_BLOCK_TYPES).includes(blockType)) {
      return res.status(400).json({ error: 'Invalid block type' });
    }

    const result = await manualBlockDevice(
      deviceFingerprint,
      reason,
      req.user,
      blockType || DEVICE_BLOCK_TYPES.MANUAL,
      expirationHours
    );

    if (result.success) {
      res.json({ message: result.message, block: result.block });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Manual device block error:', error);
    res.status(500).json({ error: 'Failed to block device' });
  }
});

/**
 * @route POST /device-security/unblock
 * @desc Unblock a device
 * @access Admin only
 * @body {string} deviceFingerprint - Device fingerprint to unblock
 */
router.post('/unblock', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_UNBLOCK_CREATE), async (req, res) => {
  try {
    const { deviceFingerprint } = req.body;

    if (!deviceFingerprint) {
      return res.status(400).json({ error: 'Device fingerprint is required' });
    }

    const result = await unblockDevice(deviceFingerprint, req.user);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Device unblock error:', error);
    res.status(500).json({ error: 'Failed to unblock device' });
  }
});

/**
 * @route GET /device-security/constants
 * @desc Get device security constants for frontend
 * @access Admin only
 */
router.get('/constants', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_CONSTANTS), (req, res) => {
  res.json({
    DEVICE_BLOCK_TYPES,
    DEVICE_BLOCK_REASONS,
  });
});

/**
 * @route DELETE /device-security/cleanup
 * @desc Clean up expired device blocks
 * @access Admin only
 */
router.delete('/cleanup', authenticate, authorize(PERMISSIONS.DEVICE_SECURITY_BLOCK_DELETE), async (req, res) => {
  try {
    const result = await DeviceBlocklist.cleanupExpiredBlocks();
    res.json({ 
      message: 'Cleanup completed successfully', 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Device block cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired blocks' });
  }
});

module.exports = router;
