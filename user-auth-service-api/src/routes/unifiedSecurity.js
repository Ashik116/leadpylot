/**
 * Unified Security Routes
 * Combined IP and Device security management for comprehensive admin control
 */
const express = require('express');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

// IP Security Services
const { IpBlocklist, BLOCK_REASONS, BLOCK_TYPES, DeviceBlocklist, DEVICE_BLOCK_TYPES, DEVICE_BLOCK_REASONS } = require('../models');

// Device Security Services  
const {
  getDeviceSecurityStats,
  manualBlockDevice,
  unblockDevice
} = require('../services/deviceSecurityService');

// Security Dashboard Service
const { getSecurityDashboardData } = require('../services/securityService');

const router = express.Router();

/**
 * @route GET /unified-security/dashboard
 * @desc Get comprehensive security dashboard with both IP and device statistics
 * @access Admin only
 */
router.get('/dashboard', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_DASHBOARD_READ), async (req, res) => {
  try {
    const [ipStats, deviceStats] = await Promise.all([
      getSecurityDashboardData(),
      getDeviceSecurityStats()
    ]);

    const dashboard = {
      overview: {
        totalIPBlocks: ipStats.blockedIPs?.length || 0,
        totalDeviceBlocks: deviceStats.totalBlockedDevices || 0,
        activeIPBlocks: ipStats.activeIPBlocks || 0,
        activeDeviceBlocks: deviceStats.activeBlocks || 0,
        recentIPBlocks: ipStats.recentBlocks || 0,
        recentDeviceBlocks: deviceStats.recentBlocks || 0,
      },
      ipSecurity: {
        ...ipStats,
        type: 'IP_BASED'
      },
      deviceSecurity: {
        ...deviceStats,
        type: 'DEVICE_BASED'  
      },
      combinedThreatLevel: calculateThreatLevel(ipStats, deviceStats)
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Unified security dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch security dashboard' });
  }
});

/**
 * @route GET /unified-security/blocks
 * @desc Get combined list of IP and device blocks
 * @access Admin only
 */
router.get('/blocks', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_BLOCK_READ), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const blockType = req.query.blockType; // 'ip', 'device', or 'all'

    let blocks = [];

    if (!blockType || blockType === 'all' || blockType === 'ip') {
      // Get IP blocks
      const ipBlocks = await IpBlocklist.getActiveBlocks(limit, 0);
      blocks.push(...ipBlocks.map(block => ({
        ...block.toObject(),
        blockCategory: 'IP',
        identifier: block.ipAddress,
        displayName: `IP: ${block.ipAddress}`,
        icon: '🌐'
      })));
    }

    if (!blockType || blockType === 'all' || blockType === 'device') {
      // Get Device blocks  
      const deviceBlocks = await DeviceBlocklist.getActiveBlocks(limit, 0);
      blocks.push(...deviceBlocks.map(block => ({
        ...block.toObject(),
        blockCategory: 'DEVICE',
        identifier: block.deviceFingerprint,
        displayName: `Device: ${block.deviceFingerprint.substring(0, 8)}...`,
        icon: '📱'
      })));
    }

    // Sort by most recent
    blocks.sort((a, b) => new Date(b.blockedAt) - new Date(a.blockedAt));

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedBlocks = blocks.slice(skip, skip + limit);

    res.json({
      blocks: paginatedBlocks,
      pagination: {
        page,
        limit,
        totalCount: blocks.length,
        totalPages: Math.ceil(blocks.length / limit),
        hasNext: page < Math.ceil(blocks.length / limit),
        hasPrev: page > 1
      },
      summary: {
        ipBlocks: blocks.filter(b => b.blockCategory === 'IP').length,
        deviceBlocks: blocks.filter(b => b.blockCategory === 'DEVICE').length,
        total: blocks.length
      }
    });
  } catch (error) {
    console.error('Get unified blocks error:', error);
    res.status(500).json({ error: 'Failed to fetch security blocks' });
  }
});

/**
 * @route POST /unified-security/block-ip
 * @desc Manually block an IP address
 * @access Admin only
 */
router.post('/block-ip', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_BLOCK_IP_CREATE), async (req, res) => {
  try {
    const { ipAddress, reason, blockType, expirationHours } = req.body;

    if (!ipAddress || !reason) {
      return res.status(400).json({ error: 'IP address and reason are required' });
    }

    if (!Object.values(BLOCK_REASONS).includes(reason)) {
      return res.status(400).json({ error: 'Invalid block reason' });
    }

    const validBlockType = blockType || BLOCK_TYPES.MANUAL;
    if (!Object.values(BLOCK_TYPES).includes(validBlockType)) {
      return res.status(400).json({ error: 'Invalid block type' });
    }

    const block = await IpBlocklist.addBlock(
      ipAddress,
      reason,
      validBlockType,
      expirationHours,
      req.user._id
    );

    console.log(`🌐 Admin ${req.user.login} manually blocked IP: ${ipAddress} (${reason})`);

    res.json({ 
      message: 'IP address blocked successfully',
      block: {
        ...block.toObject(),
        blockCategory: 'IP',
        displayName: `IP: ${block.ipAddress}`,
        icon: '🌐'
      }
    });
  } catch (error) {
    console.error('Manual IP block error:', error);
    res.status(500).json({ error: 'Failed to block IP address' });
  }
});

/**
 * @route POST /unified-security/block-device
 * @desc Manually block a device
 * @access Admin only
 */
router.post('/block-device', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_BLOCK_DEVICE_CREATE), async (req, res) => {
  try {
    const { deviceFingerprint, reason, blockType, expirationHours } = req.body;

    if (!deviceFingerprint || !reason) {
      return res.status(400).json({ error: 'Device fingerprint and reason are required' });
    }

    if (!Object.values(DEVICE_BLOCK_REASONS).includes(reason)) {
      return res.status(400).json({ error: 'Invalid block reason' });
    }

    const result = await manualBlockDevice(
      deviceFingerprint,
      reason,
      req.user,
      blockType || DEVICE_BLOCK_TYPES.MANUAL,
      expirationHours
    );

    if (result.success) {
      res.json({ 
        message: result.message, 
        block: {
          ...result.block.toObject(),
          blockCategory: 'DEVICE',
          displayName: `Device: ${result.block.deviceFingerprint.substring(0, 8)}...`,
          icon: '📱'
        }
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Manual device block error:', error);
    res.status(500).json({ error: 'Failed to block device' });
  }
});

/**
 * @route POST /unified-security/unblock
 * @desc Unblock an IP or device
 * @access Admin only
 */
router.post('/unblock', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_UNBLOCK_CREATE), async (req, res) => {
  try {
    const { identifier, blockCategory } = req.body;

    if (!identifier || !blockCategory) {
      return res.status(400).json({ error: 'Identifier and block category are required' });
    }

    let result;
    if (blockCategory === 'IP') {
      const block = await IpBlocklist.findOne({ ipAddress: identifier, isActive: true });
      if (!block) {
        return res.status(404).json({ error: 'IP block not found' });
      }
      await block.unblock(req.user._id);
      result = { success: true, message: 'IP address unblocked successfully' };
      console.log(`🔓 Admin ${req.user.login} unblocked IP: ${identifier}`);
    } else if (blockCategory === 'DEVICE') {
      result = await unblockDevice(identifier, req.user);
    } else {
      return res.status(400).json({ error: 'Invalid block category' });
    }

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Unblock error:', error);
    res.status(500).json({ error: 'Failed to unblock' });
  }
});

/**
 * @route GET /unified-security/constants
 * @desc Get all security constants for frontend
 * @access Admin only
 */
router.get('/constants', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_CONSTANTS_READ), (req, res) => {
  res.json({
    IP_BLOCKING: {
      BLOCK_REASONS,
      BLOCK_TYPES,
    },
    DEVICE_BLOCKING: {
      DEVICE_BLOCK_TYPES,
      DEVICE_BLOCK_REASONS,
    }
  });
});

/**
 * @route DELETE /unified-security/cleanup
 * @desc Clean up all expired blocks (both IP and device)
 * @access Admin only
 */
router.delete('/cleanup', authenticate, authorize(PERMISSIONS.UNIFIED_SECURITY_BLOCK_DELETE), async (req, res) => {
  try {
    const [ipCleanup, deviceCleanup] = await Promise.all([
      IpBlocklist.cleanupExpiredBlocks(),
      DeviceBlocklist.cleanupExpiredBlocks()
    ]);

    res.json({
      message: 'Security cleanup completed successfully',
      results: {
        ipBlocksCleanedUp: ipCleanup.modifiedCount,
        deviceBlocksCleanedUp: deviceCleanup.modifiedCount,
        totalCleaned: ipCleanup.modifiedCount + deviceCleanup.modifiedCount
      }
    });
  } catch (error) {
    console.error('Security cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired blocks' });
  }
});

/**
 * Calculate combined threat level from IP and device statistics
 */
function calculateThreatLevel(ipStats, deviceStats) {
  const recentThreats = (ipStats.recentBlocks || 0) + (deviceStats.recentBlocks || 0);
  const totalThreats = (ipStats.activeIPBlocks || 0) + (deviceStats.activeBlocks || 0);
  
  if (recentThreats >= 10 || totalThreats >= 50) {
    return { level: 'HIGH', color: 'red', message: 'Multiple active threats detected' };
  } else if (recentThreats >= 5 || totalThreats >= 20) {
    return { level: 'MEDIUM', color: 'orange', message: 'Moderate security activity' };
  } else if (recentThreats >= 1 || totalThreats >= 5) {
    return { level: 'LOW', color: 'yellow', message: 'Normal security activity' };
  } else {
    return { level: 'MINIMAL', color: 'green', message: 'Minimal security threats' };
  }
}

module.exports = router;
