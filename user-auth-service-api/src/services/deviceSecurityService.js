/**
 * Device Security Service
 * Handles device-based security operations: blocking, fingerprinting, threat detection
 */

const { DeviceBlocklist, DEVICE_BLOCK_TYPES, DEVICE_BLOCK_REASONS,  LoginAttempt, ATTEMPT_TYPES, ATTEMPT_RESULTS  } = require('../models');

/**
 * Check if a device should be blocked based on failed attempts
 * @param {string} deviceFingerprint - Device fingerprint
 * @param {string} login - Login username
 * @returns {Promise<boolean>} True if should be blocked
 */
const shouldBlockDevice = async (deviceFingerprint, login = null) => {
  try {
    // Check if device is already blocked
    const isBlocked = await DeviceBlocklist.isDeviceBlocked(deviceFingerprint);
    if (isBlocked) {
      return true;
    }

    // Count recent failed attempts from this device
    const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    const recentFailedAttempts = await LoginAttempt.countDocuments({
      deviceFingerprint,
      attemptResult: { $in: [ATTEMPT_RESULTS.INVALID_CREDENTIALS, ATTEMPT_RESULTS.ACCOUNT_DISABLED] },
      createdAt: { $gte: timeWindow },
    });

    // Device-based blocking thresholds (more lenient for user experience)
    const MAX_DEVICE_ATTEMPTS = process.env.MAX_DEVICE_ATTEMPTS || 10; // Configurable via environment
    
    if (recentFailedAttempts >= MAX_DEVICE_ATTEMPTS) {
      console.log(`🚫 Auto-blocking device after ${recentFailedAttempts} failed attempts: ${deviceFingerprint.substring(0, 8)}...`);
      
      // Auto-block the device temporarily
      await DeviceBlocklist.addBlock(
        deviceFingerprint,
        DEVICE_BLOCK_REASONS.TOO_MANY_FAILED_ATTEMPTS,
        DEVICE_BLOCK_TYPES.TEMPORARY,
        24, // 24 hours
        null, // system block
        { login }
      );
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Device block check failed:', error);
    return false;
  }
};

/**
 * Analyze device behavior for suspicious patterns
 * @param {string} deviceFingerprint - Device fingerprint
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Threat analysis result
 */
const analyzeDeviceThreat = async (deviceFingerprint, requestData = {}) => {
  try {
    const timeWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    
    // Check for rapid-fire attempts (possible bot)
    const recentAttempts = await LoginAttempt.find({
      deviceFingerprint,
      createdAt: { $gte: timeWindow },
    }).sort({ createdAt: -1 });

    const threatScore = 0;
    const threats = [];

    // Check for rapid succession attempts (bot behavior)
    if (recentAttempts.length >= 3) {
      const timeDeltas = [];
      for (let i = 1; i < recentAttempts.length; i++) {
        const delta = recentAttempts[i-1].createdAt - recentAttempts[i].createdAt;
        timeDeltas.push(delta);
      }
      
      const avgDelta = timeDeltas.reduce((a, b) => a + b, 0) / timeDeltas.length;
      
      // If average time between attempts is less than 2 seconds, likely bot
      if (avgDelta < 2000) {
        threats.push({
          type: 'BOT_BEHAVIOR',
          severity: 'HIGH',
          description: 'Rapid successive login attempts detected',
          evidence: { averageTimeBetweenAttempts: avgDelta }
        });
      }
    }

    // Check for different username attempts (credential stuffing)
    const uniqueLogins = [...new Set(recentAttempts.map(attempt => attempt.login))];
    if (uniqueLogins.length >= 5) {
      threats.push({
        type: 'CREDENTIAL_STUFFING',
        severity: 'HIGH',
        description: 'Multiple username attempts from same device',
        evidence: { uniqueUsernamesAttempted: uniqueLogins.length }
      });
    }

    // Check for suspicious user agent patterns
    if (requestData.userAgent) {
      const suspiciousPatterns = [
        /curl/i, /wget/i, /python/i, /bot/i, /crawler/i, /scraper/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestData.userAgent)) {
          threats.push({
            type: 'SUSPICIOUS_USER_AGENT',
            severity: 'MEDIUM',
            description: 'Suspicious user agent detected',
            evidence: { userAgent: requestData.userAgent }
          });
          break;
        }
      }
    }

    return {
      deviceFingerprint,
      threatScore: threats.length,
      threats,
      riskLevel: threats.length >= 2 ? 'HIGH' : threats.length >= 1 ? 'MEDIUM' : 'LOW',
      recommendedAction: threats.length >= 2 ? 'BLOCK' : threats.length >= 1 ? 'MONITOR' : 'ALLOW'
    };

  } catch (error) {
    console.error('Device threat analysis failed:', error);
    return {
      deviceFingerprint,
      threatScore: 0,
      threats: [],
      riskLevel: 'UNKNOWN',
      recommendedAction: 'ALLOW'
    };
  }
};

/**
 * Get device blocking statistics for security dashboard
 * @returns {Promise<Object>} Device security statistics
 */
const getDeviceSecurityStats = async () => {
  try {
    const [
      totalBlockedDevices,
      activeBlocks,
      temporaryBlocks,
      permanentBlocks,
      recentBlocks,
    ] = await Promise.all([
      DeviceBlocklist.countDocuments(),
      DeviceBlocklist.countDocuments({ isActive: true }),
      DeviceBlocklist.countDocuments({ 
        isActive: true, 
        blockType: DEVICE_BLOCK_TYPES.TEMPORARY 
      }),
      DeviceBlocklist.countDocuments({ 
        isActive: true, 
        blockType: DEVICE_BLOCK_TYPES.PERMANENT 
      }),
      DeviceBlocklist.countDocuments({
        blockedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
    ]);

    // Get top block reasons
    const blockReasons = await DeviceBlocklist.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$blockReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    return {
      totalBlockedDevices,
      activeBlocks,
      temporaryBlocks,
      permanentBlocks,
      recentBlocks,
      blockReasons: blockReasons.map(br => ({
        reason: br._id,
        count: br.count
      }))
    };
  } catch (error) {
    console.error('Failed to get device security stats:', error);
    throw error;
  }
};

/**
 * Manual device blocking by admin
 * @param {string} deviceFingerprint - Device fingerprint to block
 * @param {string} reason - Block reason
 * @param {Object} adminUser - Admin user performing the block
 * @param {string} blockType - Type of block (temporary/permanent)
 * @param {number} expirationHours - Hours until expiration (for temporary blocks)
 * @returns {Promise<Object>} Block result
 */
const manualBlockDevice = async (deviceFingerprint, reason, adminUser, blockType = DEVICE_BLOCK_TYPES.MANUAL, expirationHours = null) => {
  try {
    const block = await DeviceBlocklist.addBlock(
      deviceFingerprint,
      reason,
      blockType,
      expirationHours,
      adminUser._id,
      { manualBlock: true }
    );

    console.log(`👨‍💼 Admin ${adminUser.login} blocked device: ${deviceFingerprint.substring(0, 8)}... (${reason})`);
    
    return {
      success: true,
      block,
      message: 'Device blocked successfully'
    };
  } catch (error) {
    console.error('Manual device block failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Unblock a device
 * @param {string} deviceFingerprint - Device fingerprint to unblock
 * @param {Object} adminUser - Admin user performing the unblock
 * @returns {Promise<Object>} Unblock result
 */
const unblockDevice = async (deviceFingerprint, adminUser) => {
  try {
    const block = await DeviceBlocklist.findOne({ deviceFingerprint, isActive: true });
    
    if (!block) {
      return {
        success: false,
        error: 'Device block not found or already inactive'
      };
    }

    await block.unblock(adminUser._id);
    
    console.log(`🔓 Admin ${adminUser.login} unblocked device: ${deviceFingerprint.substring(0, 8)}...`);
    
    return {
      success: true,
      message: 'Device unblocked successfully'
    };
  } catch (error) {
    console.error('Device unblock failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  shouldBlockDevice,
  analyzeDeviceThreat,
  getDeviceSecurityStats,
  manualBlockDevice,
  unblockDevice
};
