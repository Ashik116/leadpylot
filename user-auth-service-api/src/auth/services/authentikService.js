/**
 * Authentik OAuth2/OIDC Service
 * Handles authentication through Authentik identity provider
 */

const axios = require('axios');
const crypto = require('crypto');
const User = require('../../models/User');
const { generateToken } = require('./tokenService');
const { UserSession, SESSION_STATUS } = require('../../models/UserSession');
const { eventEmitter, EVENT_TYPES } = require('../../utils/events');
const {
  AGENT_TELEGRAM_REQUIRED_MESSAGE,
  isAgentRole,
  hasLinkedTelegramChat,
} = require('../utils/agentTelegramGate');

// Authentik configuration from environment variables
const AUTHENTIK_CONFIG = {
  baseUrl: process.env.AUTHENTIK_BASE_URL || 'https://authentik.yourdomain.com',
  clientId: process.env.AUTHENTIK_CLIENT_ID,
  clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
  redirectUri: process.env.AUTHENTIK_REDIRECT_URI || 'http://localhost:3001/auth/authentik/callback',
  frontendCallbackUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Standard OIDC endpoints (Authentik follows OpenID Connect standard)
const getEndpoints = () => ({
  authorization: `${AUTHENTIK_CONFIG.baseUrl}/application/o/authorize/`,
  token: `${AUTHENTIK_CONFIG.baseUrl}/application/o/token/`,
  userinfo: `${AUTHENTIK_CONFIG.baseUrl}/application/o/userinfo/`,
  logout: `${AUTHENTIK_CONFIG.baseUrl}/application/o/logout/`,
});

// Store for PKCE and state verification (in production, use Redis)
const pendingAuthRequests = new Map();

/**
 * Generate cryptographically secure random string
 */
const generateSecureString = (length = 32) => {
  return crypto.randomBytes(length).toString('base64url');
};

/**
 * Generate PKCE code verifier and challenge
 */
const generatePKCE = () => {
  const codeVerifier = generateSecureString(32);
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
};

/**
 * Generate Authentik authorization URL
 * @param {Object} options - Additional options
 * @returns {Object} - Authorization URL and state
 */
const getAuthorizationUrl = (options = {}) => {
  if (!AUTHENTIK_CONFIG.clientId) {
    throw new Error('AUTHENTIK_CLIENT_ID is not configured');
  }

  const state = generateSecureString(16);
  const { codeVerifier, codeChallenge } = generatePKCE();
  const nonce = generateSecureString(16);

  // Store state and PKCE verifier for callback verification
  pendingAuthRequests.set(state, {
    codeVerifier,
    nonce,
    createdAt: Date.now(),
    redirectTo: options.redirectTo || '/',
  });

  // Clean up old pending requests (older than 10 minutes)
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [key, value] of pendingAuthRequests.entries()) {
    if (Date.now() - value.createdAt > TEN_MINUTES) {
      pendingAuthRequests.delete(key);
    }
  }

  const params = new URLSearchParams({
    client_id: AUTHENTIK_CONFIG.clientId,
    redirect_uri: AUTHENTIK_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const endpoints = getEndpoints();
  const authorizationUrl = `${endpoints.authorization}?${params.toString()}`;

  return {
    authorizationUrl,
    state,
  };
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Authentik
 * @param {string} state - State parameter for verification
 * @returns {Promise<Object>} - Token response
 */
const exchangeCodeForTokens = async (code, state) => {
  const pendingRequest = pendingAuthRequests.get(state);

  if (!pendingRequest) {
    throw new Error('Invalid or expired state parameter');
  }

  const { codeVerifier, redirectTo } = pendingRequest;
  pendingAuthRequests.delete(state);

  const endpoints = getEndpoints();

  try {
    const response = await axios.post(
      endpoints.token,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: AUTHENTIK_CONFIG.clientId,
        client_secret: AUTHENTIK_CONFIG.clientSecret,
        code,
        redirect_uri: AUTHENTIK_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      ...response.data,
      redirectTo,
    };
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

/**
 * Get user info from Authentik using access token
 * @param {string} accessToken - Authentik access token
 * @returns {Promise<Object>} - User info from Authentik
 */
const getAuthentikUserInfo = async (accessToken) => {
  const endpoints = getEndpoints();

  try {
    const response = await axios.get(endpoints.userinfo, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('User info error:', error.response?.data || error.message);
    throw new Error('Failed to fetch user info from Authentik');
  }
};

/**
 * Find or create user in CRM based on Authentik user info
 * @param {Object} authentikUser - User info from Authentik
 * @returns {Promise<Object>} - CRM user
 */
const findOrMatchUser = async (authentikUser) => {
  const { email, preferred_username, sub, name, groups } = authentikUser;

  // Strategy 1: Find by email
  let user = await User.findOne({ 
    $or: [
      { email: email?.toLowerCase() },
      { login: email?.toLowerCase() },
      { login: preferred_username?.toLowerCase() },
    ]
  }).populate('image_id');

  if (user) {
    console.log(`[Authentik] Found existing user by email/login: ${user.login}`);
    
    // Optionally update authentik_id for future lookups
    if (!user.authentik_id) {
      user.authentik_id = sub;
      await user.save();
    }
    
    return user;
  }

  // Strategy 2: Find by authentik_id (sub claim)
  user = await User.findOne({ authentik_id: sub }).populate('image_id');

  if (user) {
    console.log(`[Authentik] Found existing user by authentik_id: ${user.login}`);
    return user;
  }

  // Strategy 3: User not found - return null (no auto-creation)
  // The admin must create the user in CRM first
  console.log(`[Authentik] No matching CRM user found for: ${email || preferred_username}`);
  return null;
};

/**
 * Handle the complete Authentik OAuth callback
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @param {Object} metadata - Request metadata (IP, user agent)
 * @returns {Promise<Object>} - Login result with token
 */
const handleAuthentikCallback = async (code, state, metadata = {}) => {
  const ipAddress = metadata?.ipAddress || 'unknown';
  const userAgent = metadata?.userAgent || 'unknown';

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code, state);
    const { access_token, id_token, redirectTo } = tokenResponse;

    // 2. Get user info from Authentik
    const authentikUser = await getAuthentikUserInfo(access_token);
    console.log('[Authentik] User info:', {
      email: authentikUser.email,
      preferred_username: authentikUser.preferred_username,
      sub: authentikUser.sub,
    });

    // 3. Find matching CRM user
    const user = await findOrMatchUser(authentikUser);

    if (!user) {
      return {
        success: false,
        error: 'No matching account found in the CRM. Please contact your administrator to create an account.',
        authentikUser: {
          email: authentikUser.email,
          name: authentikUser.name,
          username: authentikUser.preferred_username,
        },
      };
    }

    // 4. Check if user is active
    if (!user.active) {
      return {
        success: false,
        error: 'Your account is disabled. Please contact your administrator.',
      };
    }

    if (isAgentRole(user.role) && !hasLinkedTelegramChat(user)) {
      return {
        success: false,
        error: AGENT_TELEGRAM_REQUIRED_MESSAGE,
      };
    }

    // 5. Generate session and JWT token
    const sessionId = crypto.randomUUID();
    const token = generateToken(user, sessionId);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 6. Create user session
    try {
      const SESSION_DURATION_HOURS = process.env.SESSION_DURATION_HOURS || 24;

      await UserSession.create({
        userId: user._id,
        sessionId,
        tokenHash,
        ipAddress,
        userAgent,
        deviceFingerprint: 'authentik-sso',
        expiresAt: new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000),
        authMethod: 'authentik', // Track SSO login
      });
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
    }

    // 7. Emit login event for activity logging
    try {
      eventEmitter.emit(EVENT_TYPES.AUTH.LOGIN, {
        user: {
          _id: user._id,
          login: user.login,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ipAddress,
        userAgent,
        sessionId,
        authMethod: 'authentik',
      });
    } catch (eventError) {
      console.error('Login event emission failed:', eventError);
    }

    return {
      success: true,
      data: {
        user: {
          _id: user._id,
          login: user.login,
          role: user.role,
          view_type: (user.view_type && user.view_type.trim()) || 'listView',
          color_code: user.color_code,
          image_id: user.image_id,
        },
        token,
        sessionId,
        redirectTo,
      },
    };
  } catch (error) {
    console.error('Authentik callback error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
};

/**
 * Get Authentik logout URL
 * @param {string} idToken - Optional ID token for logout hint
 * @returns {string} - Logout URL
 */
const getLogoutUrl = (idToken = null) => {
  const endpoints = getEndpoints();
  const params = new URLSearchParams({
    post_logout_redirect_uri: AUTHENTIK_CONFIG.frontendCallbackUrl,
  });

  if (idToken) {
    params.append('id_token_hint', idToken);
  }

  return `${endpoints.logout}?${params.toString()}`;
};

/**
 * Verify Authentik configuration
 */
const verifyConfiguration = () => {
  const missing = [];

  if (!AUTHENTIK_CONFIG.baseUrl) missing.push('AUTHENTIK_BASE_URL');
  if (!AUTHENTIK_CONFIG.clientId) missing.push('AUTHENTIK_CLIENT_ID');
  if (!AUTHENTIK_CONFIG.clientSecret) missing.push('AUTHENTIK_CLIENT_SECRET');

  if (missing.length > 0) {
    console.warn(`[Authentik] Missing configuration: ${missing.join(', ')}`);
    return false;
  }

  console.log('[Authentik] Configuration verified successfully');
  return true;
};

module.exports = {
  getAuthorizationUrl,
  handleAuthentikCallback,
  getLogoutUrl,
  verifyConfiguration,
  AUTHENTIK_CONFIG,
};
