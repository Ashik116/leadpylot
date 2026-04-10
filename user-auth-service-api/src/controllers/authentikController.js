/**
 * Authentik OAuth Controller
 * Handles OAuth2/OIDC authentication flow with Authentik
 */

const {
  getAuthorizationUrl,
  handleAuthentikCallback,
  getLogoutUrl,
  verifyConfiguration,
  AUTHENTIK_CONFIG,
} = require('../auth/services/authentikService');

/**
 * Initiate Authentik OAuth flow
 * GET /auth/authentik
 */
const initiateAuthentik = async (req, res) => {
  try {
    // Verify Authentik is configured
    if (!verifyConfiguration()) {
      return res.status(503).json({
        error: 'SSO is not configured. Please contact your administrator.',
      });
    }

    // Get optional redirect parameter
    const redirectTo = req.query.redirect || '/';

    // Generate authorization URL
    const { authorizationUrl, state } = getAuthorizationUrl({ redirectTo });

    // Redirect to Authentik login page
    res.redirect(authorizationUrl);
  } catch (error) {
    console.error('Authentik initiation error:', error);
    res.status(500).json({
      error: 'Failed to initiate SSO login',
    });
  }
};

/**
 * Get Authentik authorization URL (for frontend-initiated flow)
 * GET /auth/authentik/url
 */
const getAuthentikUrl = async (req, res) => {
  try {
    // Verify Authentik is configured
    if (!verifyConfiguration()) {
      return res.status(503).json({
        error: 'SSO is not configured',
        configured: false,
      });
    }

    // Get optional redirect parameter
    const redirectTo = req.query.redirect || '/';

    // Generate authorization URL
    const { authorizationUrl, state } = getAuthorizationUrl({ redirectTo });

    res.json({
      authorizationUrl,
      state,
      configured: true,
    });
  } catch (error) {
    console.error('Authentik URL generation error:', error);
    res.status(500).json({
      error: 'Failed to generate SSO URL',
    });
  }
};

/**
 * Handle Authentik OAuth callback
 * GET /auth/authentik/callback
 */
const authentikCallback = async (req, res) => {
  try {
    const { code, state, error: authError, error_description } = req.query;

    // Handle OAuth errors from Authentik
    if (authError) {
      console.error('Authentik OAuth error:', authError, error_description);
      const errorMessage = encodeURIComponent(error_description || authError);
      return res.redirect(
        `${AUTHENTIK_CONFIG.frontendCallbackUrl}/sign-in?error=${errorMessage}&provider=authentik`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(
        `${AUTHENTIK_CONFIG.frontendCallbackUrl}/sign-in?error=missing_parameters&provider=authentik`
      );
    }

    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Process the callback
    const result = await handleAuthentikCallback(code, state, metadata);

    if (!result.success) {
      const errorMessage = encodeURIComponent(result.error);
      return res.redirect(
        `${AUTHENTIK_CONFIG.frontendCallbackUrl}/sign-in?error=${errorMessage}&provider=authentik`
      );
    }

    // Success - redirect to frontend with token
    const { token, user, redirectTo } = result.data;
    
    // Create a secure URL with token for frontend to capture
    // The frontend will extract this token and store it properly
    const successUrl = new URL(`${AUTHENTIK_CONFIG.frontendCallbackUrl}/auth/callback`);
    successUrl.searchParams.set('token', token);
    successUrl.searchParams.set('user', JSON.stringify({
      _id: user._id,
      login: user.login,
      role: user.role,
      view_type: user.view_type,
    }));
    successUrl.searchParams.set('redirect', redirectTo || '/');
    successUrl.searchParams.set('provider', 'authentik');

    res.redirect(successUrl.toString());
  } catch (error) {
    console.error('Authentik callback error:', error);
    const errorMessage = encodeURIComponent('Authentication failed. Please try again.');
    res.redirect(
      `${AUTHENTIK_CONFIG.frontendCallbackUrl}/sign-in?error=${errorMessage}&provider=authentik`
    );
  }
};

/**
 * Handle API callback (for SPA without redirects)
 * POST /auth/authentik/callback
 */
const authentikCallbackApi = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing required parameters: code and state',
      });
    }

    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await handleAuthentikCallback(code, state, metadata);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        authentikUser: result.authentikUser,
      });
    }

    res.status(200).json(result.data);
  } catch (error) {
    console.error('Authentik API callback error:', error);
    res.status(500).json({
      error: 'Internal server error during SSO authentication',
    });
  }
};

/**
 * Check if Authentik SSO is configured and available
 * GET /auth/authentik/status
 */
const authentikStatus = async (req, res) => {
  try {
    const isConfigured = verifyConfiguration();

    res.json({
      enabled: isConfigured,
      provider: 'authentik',
      baseUrl: isConfigured ? AUTHENTIK_CONFIG.baseUrl : null,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check SSO status',
    });
  }
};

/**
 * Get SSO logout URL
 * GET /auth/authentik/logout
 */
const authentikLogoutUrl = async (req, res) => {
  try {
    const idToken = req.query.id_token;
    const logoutUrl = getLogoutUrl(idToken);

    res.json({
      logoutUrl,
    });
  } catch (error) {
    console.error('Authentik logout URL error:', error);
    res.status(500).json({
      error: 'Failed to generate logout URL',
    });
  }
};

module.exports = {
  initiateAuthentik,
  getAuthentikUrl,
  authentikCallback,
  authentikCallbackApi,
  authentikStatus,
  authentikLogoutUrl,
};
