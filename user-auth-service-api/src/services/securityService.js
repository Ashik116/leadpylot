/**
 * Security Service
 * Handles security-related operations: IP blocking, geolocation, device fingerprinting, etc.
 */

const crypto = require('crypto');

const { LoginAttempt, ATTEMPT_TYPES, ATTEMPT_RESULTS, UserSession, SESSION_STATUS, IpBlocklist, BLOCK_REASONS, BLOCK_TYPES, DeviceBlocklist } = require('../models');
/**
 * Get geolocation information for an IP address
 * @param {string} ipAddress - IP address to lookup
 * @param {boolean} forcePublicLookup - Force public IP lookup even for private IPs
 * @returns {Promise<Object>} Geolocation data
 */
const getGeolocation = async (ipAddress, forcePublicLookup = false) => {
  try {
    console.log(`🌍 Geolocation lookup for IP: ${ipAddress}`);
    
    // For development: if it's a private IP, get the real public IP using our centralized function
    if (isPrivateIP(ipAddress) && !forcePublicLookup) {
      console.log(`🏠 Private IP detected in geolocation: ${ipAddress} - using getRealPublicIP`);
      
      try {
        // Use the centralized getRealPublicIP function instead of duplicate logic
        const publicIPData = await getRealPublicIP(ipAddress);
        
        console.log(`🌐 Using real public IP for geolocation: ${publicIPData}`);
        
        // Use the public IP for geolocation
        if (publicIPData && !isPrivateIP(publicIPData)) {
          return await getGeolocation(publicIPData, true); // forcePublicLookup = true
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get public IP for geolocation: ${error.message}`);
      }
      
      // Fallback to local if public IP lookup fails
      return {
        country: 'Local',
        countryCode: 'LOCAL',
        region: 'Local',
        city: 'Local',
        timezone: 'Local',
        isp: 'Local Network',
      };
    }

    // You can integrate with services like:
    // - ip-api.com (free)
    // - ipstack.com
    // - maxmind.com
    // For now, we'll use a simple HTTP request to ip-api.com
    
    // Use Node.js http module instead of fetch for compatibility
    const http = require('http');
    const url = `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`;
    
    const data = await new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
    
    if (data.status === 'success') {
      return {
        country: data.country || null,
        countryCode: data.countryCode || null,
        region: data.regionName || null,
        city: data.city || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || null,
        isp: data.isp || null,
      };
    }
    
    return {};
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
    return {};
  }
};

/**
 * Check if IP address is private/local
 * @param {string} ip - IP address
 * @returns {boolean} True if private IP
 */
const isPrivateIP = (ip) => {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  
  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  let actualIP = ip;
  if (ip.startsWith('::ffff:')) {
    actualIP = ip.replace('::ffff:', '');
  }
  
  const parts = actualIP.split('.');
  if (parts.length !== 4) return false;
  
  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);
  
  // Private IP ranges
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

/**
 * Generate enhanced device fingerprint from user agent and other factors
 * More secure than IP-only approach - persistent across network changes
 * @param {string} userAgent - User agent string
 * @param {string} ipAddress - IP address (as fallback, not primary identifier)
 * @param {Object} additionalHeaders - Additional request headers for fingerprinting
 * @returns {string} Device fingerprint hash
 */
const generateDeviceFingerprint = (userAgent, ipAddress, additionalHeaders = {}) => {
  // Enhanced fingerprinting components (more persistent than IP)
  const components = [
    userAgent || 'unknown',
    additionalHeaders['accept-language'] || 'unknown',
    additionalHeaders['accept-encoding'] || 'unknown',
    additionalHeaders['accept'] || 'unknown',
    additionalHeaders['sec-ch-ua'] || 'unknown',
    additionalHeaders['sec-ch-ua-platform'] || 'unknown',
    additionalHeaders['sec-ch-ua-mobile'] || 'unknown',
    // IP as last resort (less reliable due to VPNs, mobile networks)
    ipAddress || 'unknown'
  ];
  
  const fingerprint = components.join('|');
  
  // Use longer hash for better uniqueness (20 chars instead of 16)
  return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 20);
};

/**
 * Parse device information from user agent
 * @param {string} userAgent - User agent string
 * @returns {Object} Parsed device info
 */
const parseDeviceInfo = (userAgent) => {
  try {
    const deviceInfo = {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      device: null,
      deviceType: 'desktop', // default
    };

    if (!userAgent) return deviceInfo;

    // Simple parsing - you might want to use a library like 'ua-parser-js' for more accuracy
    const ua = userAgent.toLowerCase();

    // Browser detection
    if (ua.includes('chrome')) {
      deviceInfo.browser = 'Chrome';
      const match = userAgent.match(/chrome\/([0-9.]+)/i);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('firefox')) {
      deviceInfo.browser = 'Firefox';
      const match = userAgent.match(/firefox\/([0-9.]+)/i);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      deviceInfo.browser = 'Safari';
      const match = userAgent.match(/version\/([0-9.]+)/i);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('edge')) {
      deviceInfo.browser = 'Edge';
      const match = userAgent.match(/edge\/([0-9.]+)/i);
      if (match) deviceInfo.browserVersion = match[1];
    }

    // OS detection
    if (ua.includes('windows')) {
      deviceInfo.os = 'Windows';
      if (ua.includes('windows nt 10')) deviceInfo.osVersion = '10';
      else if (ua.includes('windows nt 6.3')) deviceInfo.osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) deviceInfo.osVersion = '8';
    } else if (ua.includes('mac os x')) {
      deviceInfo.os = 'macOS';
      const match = userAgent.match(/mac os x ([0-9_]+)/i);
      if (match) deviceInfo.osVersion = match[1].replace(/_/g, '.');
    } else if (ua.includes('linux')) {
      deviceInfo.os = 'Linux';
    }

    // Device type detection
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceInfo.deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceInfo.deviceType = 'tablet';
    }

    return deviceInfo;
  } catch (error) {
    console.error('Device info parsing failed:', error);
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      device: null,
      deviceType: 'desktop',
    };
  }
};

/**
 * Clean IPv6-mapped IPv4 addresses and normalize IP format
 * @param {string} ipAddress - IP address to clean
 * @returns {string} Cleaned IP address
 */
const cleanIPAddress = (ipAddress) => {
  if (!ipAddress) return ipAddress;
  
  // Remove IPv6-to-IPv4 mapping prefix
  let cleanIP = ipAddress.replace(/^::ffff:/, '');
  
  // Remove any additional brackets or formatting
  cleanIP = cleanIP.replace(/[\[\]]/g, '');
  
  return cleanIP.trim();
};

/**
 * Get real public IP address (for development environments behind NAT/router)
 * @param {string} ipAddress - Original IP address
 * @returns {Promise<string>} Real public IP or original IP
 */
const getRealPublicIP = async (ipAddress) => {
  try {
    // Clean the IP address first
    const cleanIP = cleanIPAddress(ipAddress);
    
    // If it's already a public IP, use it as-is
    if (!isPrivateIP(cleanIP)) {
      return cleanIP;
    }

    // In production, never do external IP lookups - always use the IP provided by the proxy
    // This prevents incorrect geolocation from external services
    if (process.env.NODE_ENV === 'production') {
      console.warn(`⚠️ Received private IP in production: ${cleanIP}. Check proxy configuration. Using IP as-is.`);
      return cleanIP;
    }
    
    // Additional safety check: if the environment looks like production, skip external lookup
    if (process.env.NODE_ENV?.toLowerCase().includes('prod') || process.env.ENVIRONMENT?.toLowerCase().includes('prod')) {
      console.warn(`⚠️ Production-like environment detected, skipping external IP lookup for: ${cleanIP}`);
      return cleanIP;
    }

    console.log(`🔍 Getting real public IP for private IP in development: ${cleanIP}`);
    
    // Get the real public IP
    const http = require('http');
    const publicIP = await new Promise((resolve, reject) => {
      const req = http.get('http://ipv4.icanhazip.com/', (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body.trim()));
      });
      req.on('error', reject);
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('Public IP lookup timeout'));
      });
    });
    
    if (publicIP && !isPrivateIP(publicIP)) {
      const finalIP = cleanIPAddress(publicIP);
      console.log(`🌐 Real public IP found: ${finalIP} for geolocation`);
      return finalIP;
    }
    
    // Fallback to original cleaned IP if lookup fails
    return cleanIP;
  } catch (error) {
    const cleanIP = cleanIPAddress(ipAddress);
    console.warn(`⚠️ Failed to get real public IP: ${error.message}, using original: ${cleanIP}`);
    return cleanIP;
  }
};

/**
 * Log a login attempt
 * @param {Object} attemptData - Login attempt data
 * @returns {Promise<Object>} Created login attempt record
 */
const logLoginAttempt = async (attemptData) => {
  try {
    const {
      login,
      userId = null,
      ipAddress,
      userAgent,
      attemptType,
      attemptResult,
      sessionId = null,
    } = attemptData;

    // Log IP processing only in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 Login attempt from IP: ${ipAddress}`);
    }

    // Get the real public IP (important for development environments)
    const realIP = await getRealPublicIP(ipAddress);

    // Get geolocation using the real IP
    const geolocation = await getGeolocation(realIP, true); // forcePublicLookup = true

    // Generate device fingerprint using enhanced browser characteristics
    const deviceFingerprint = generateDeviceFingerprint(userAgent, realIP, attemptData.headers || {});

    const loginAttempt = new LoginAttempt({
      login,
      userId,
      ipAddress: realIP, // Store the real public IP
      userAgent,
      deviceFingerprint,
      geolocation,
      attemptType,
      attemptResult,
      sessionId,
    });

    return await loginAttempt.save();
  } catch (error) {
    console.error('Failed to log login attempt:', error);
    throw error;
  }
};

/**
 * Create a new user session
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} Created session record
 */
const createUserSession = async (sessionData) => {
  try {
    const {
      userId,
      sessionId,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    } = sessionData;

    // Get the real public IP (important for development environments)
    const realIP = await getRealPublicIP(ipAddress);

    // Get geolocation and device info using the real IP
    const geolocation = await getGeolocation(realIP, true); // forcePublicLookup = true
    const deviceFingerprint = generateDeviceFingerprint(userAgent, realIP, sessionData.headers || {});
    const deviceInfo = parseDeviceInfo(userAgent);

    const session = new UserSession({
      userId,
      sessionId,
      tokenHash,
      ipAddress: realIP, // Store the real public IP
      userAgent,
      deviceFingerprint,
      deviceInfo,
      geolocation,
      expiresAt,
      status: SESSION_STATUS.ACTIVE,
    });

    return await session.save();
  } catch (error) {
    console.error('Failed to create user session:', error);
    throw error;
  }
};

/**
 * Check if IP is manually blocked by admin (NO automatic blocking)
 * @param {string} ipAddress - IP address to check
 * @param {string} login - Login username (unused, kept for compatibility)
 * @returns {Promise<boolean>} True if manually blocked by admin
 */
const shouldBlockIP = async (ipAddress, login) => {
  try {
    // Check if IP is already manually blocked by admin
    const isBlocked = await IpBlocklist.isIpBlocked(ipAddress);
    if (isBlocked) return true;

    // NO AUTOMATIC BLOCKING - Only manual admin blocks are enforced
    // Failed attempts are logged but do not trigger automatic IP blocks
    // Admins must manually review and block suspicious IPs
    
    return false;
  } catch (error) {
    console.error('Failed to check IP blocking:', error);
    return false;
  }
};

/**
 * Get security dashboard data
 * @param {Object} filters - Filters for data
 * @returns {Promise<Object>} Security dashboard data
 */
const getSecurityDashboardData = async (filters = {}) => {
  try {
    const { limit = 100, skip = 0, timeframe = 24 } = filters;
    const timeAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000);

    // Get recent failed login attempts
    const failedLoginsRaw = await LoginAttempt.find({
      attemptType: ATTEMPT_TYPES.FAILED,
      createdAt: { $gte: timeAgo }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    // Get recent successful logins with geolocation
    const successfulLoginsRaw = await LoginAttempt.find({
      attemptType: ATTEMPT_TYPES.SUCCESS,
      createdAt: { $gte: timeAgo }
    })
    .populate('userId', 'login role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    // Add deviceInfo and ensure public IP for failed logins to match active sessions structure
    const failedLogins = await Promise.all(failedLoginsRaw.map(async (attempt) => {
      const attemptObj = attempt.toObject();
      attemptObj.deviceInfo = parseDeviceInfo(attempt.userAgent);
      // Ensure we always return public IP
      attemptObj.ipAddress = await getRealPublicIP(attempt.ipAddress);
      
      // Add fields to match active sessions structure
      attemptObj.tokenHash = null; // Not applicable for login attempts
      attemptObj.status = attempt.attemptResult; // Map attemptResult to status
      attemptObj.logoutTime = null; // Not applicable
      attemptObj.expiresAt = null; // Not applicable
      attemptObj.loginTime = attempt.createdAt; // Use createdAt as loginTime
      attemptObj.lastActivity = attempt.createdAt; // Use createdAt as lastActivity
      
      return attemptObj;
    }));

    // Add deviceInfo and ensure public IP for successful logins to match active sessions structure
    const successfulLogins = await Promise.all(successfulLoginsRaw.map(async (attempt) => {
      const attemptObj = attempt.toObject();
      attemptObj.deviceInfo = parseDeviceInfo(attempt.userAgent);
      // Ensure we always return public IP
      attemptObj.ipAddress = await getRealPublicIP(attempt.ipAddress);
      
      // Add fields to match active sessions structure
      attemptObj.tokenHash = null; // Not applicable for login attempts
      attemptObj.status = attempt.attemptResult; // Map attemptResult to status
      attemptObj.logoutTime = null; // Not applicable
      attemptObj.expiresAt = null; // Not applicable
      attemptObj.loginTime = attempt.createdAt; // Use createdAt as loginTime
      attemptObj.lastActivity = attempt.createdAt; // Use createdAt as lastActivity
      
      return attemptObj;
    }));

    // Get active user sessions
    const activeSessionsRaw = await UserSession.find({
      status: SESSION_STATUS.ACTIVE,
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'login role')
    .sort({ lastActivity: -1 })
    .limit(limit);

    // Ensure public IP for active sessions
    const activeSessions = await Promise.all(activeSessionsRaw.map(async (session) => {
      const sessionObj = session.toObject();
      // Ensure we always return public IP
      sessionObj.ipAddress = await getRealPublicIP(session.ipAddress);
      return sessionObj;
    }));

    // Get blocked IPs
    const blockedIPsRaw = await IpBlocklist.getActiveBlocks(limit, skip);
    
    // Ensure public IP for blocked IPs
    const blockedIPs = await Promise.all(blockedIPsRaw.map(async (blockedIP) => {
      const blockedIPObj = blockedIP.toObject();
      // Ensure we always return public IP
      blockedIPObj.ipAddress = await getRealPublicIP(blockedIP.ipAddress);
      return blockedIPObj;
    }));

    // Get device-related data  
    const blockedDevicesRaw = await DeviceBlocklist.getActiveBlocks(limit, skip);
    const blockedDevices = blockedDevicesRaw.map(device => device.toObject());
    
    // Get statistics (including device stats)
    const stats = {
      totalFailedAttempts: await LoginAttempt.countDocuments({
        attemptType: ATTEMPT_TYPES.FAILED,
        createdAt: { $gte: timeAgo }
      }),
      totalSuccessfulLogins: await LoginAttempt.countDocuments({
        attemptType: ATTEMPT_TYPES.SUCCESS,
        createdAt: { $gte: timeAgo }
      }),
      activeSessionsCount: await UserSession.countDocuments({
        status: SESSION_STATUS.ACTIVE,
        expiresAt: { $gt: new Date() }
      }),
      // Add device-related statistics
      blockedDevicesCount: await DeviceBlocklist.countDocuments({ isActive: true }),
      uniqueFailedDevices: await LoginAttempt.distinct('deviceFingerprint', {
        attemptType: ATTEMPT_TYPES.FAILED,
        createdAt: { $gte: timeAgo },
        deviceFingerprint: { $exists: true, $ne: null }
      }).then(devices => devices.length),
      blockedIPsCount: await IpBlocklist.countDocuments({
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }),
    };

    return {
      failedLogins,
      successfulLogins,
      activeSessions,
      blockedIPs,
      blockedDevices, // Add device blocks to existing response
      stats,
    };
  } catch (error) {
    console.error('Failed to get security dashboard data:', error);
    throw error;
  }
};

module.exports = {
  getGeolocation,
  generateDeviceFingerprint,
  parseDeviceInfo,
  cleanIPAddress,
  getRealPublicIP,
  logLoginAttempt,
  createUserSession,
  shouldBlockIP,
  getSecurityDashboardData,
};