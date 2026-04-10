const AllowedSite = require('../models/AllowedSite');
const logger = require('../utils/logger');

/**
 * Extracts the origin (scheme + host) from a full URL.
 * e.g. "https://example.com/some/path?q=1" → "https://example.com"
 */
function extractOrigin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Extracts site URL from WordPress User-Agent header.
 * WordPress sends: "WordPress/6.x; https://eu-festgeld.de"
 */
function extractFromWordPressUA(userAgent) {
  if (!userAgent) return null;
  const match = userAgent.match(/WordPress\/[\d.]+;\s*(https?:\/\/[^\s;]+)/i);
  return match ? match[1] : null;
}

/**
 * Middleware that only allows POST requests from whitelisted WordPress sites.
 *
 * Checks multiple sources since WordPress wp_safe_remote_post() is a
 * server-to-server call that does NOT send Origin/Referer headers:
 *   1. Origin header (browser requests)
 *   2. Referer header (browser requests)
 *   3. site_link field in body
 *   4. Elementor meta.page_url (Advanced Data ON)
 *   5. WordPress User-Agent header (e.g. "WordPress/6.5; https://eu-festgeld.de")
 */
const validateOrigin = async (req, res, next) => {
  try {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const rawSiteLink = req.body?.site_link;
    const siteLink = rawSiteLink && typeof rawSiteLink === 'object' ? (rawSiteLink.raw_value || rawSiteLink.value) : rawSiteLink;
    const rawMetaPageUrl = req.body?.meta?.page_url;
    const metaPageUrl = rawMetaPageUrl && typeof rawMetaPageUrl === 'object' ? (rawMetaPageUrl.raw_value || rawMetaPageUrl.value) : rawMetaPageUrl;
    const wpSiteFromUA = extractFromWordPressUA(req.headers['user-agent']);

    const candidates = [origin, referer, siteLink, metaPageUrl, wpSiteFromUA]
      .map(extractOrigin)
      .filter(Boolean);

    if (candidates.length === 0) {
      logger.warn('Lead form POST rejected – no identifiable origin', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    const allowedSites = await AllowedSite.find({ active: true }).lean();

    const allowedOrigins = allowedSites.map((s) =>
      extractOrigin(s.url)
    );

    const isAllowed = candidates.some((c) => allowedOrigins.includes(c));

    if (!isAllowed) {
      logger.warn('Lead form POST rejected – origin not in allowed list', {
        candidates,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    next();
  } catch (error) {
    logger.error('Error validating origin', { error: error.message });
    return res.status(500).json({ error: 'Internal server error during origin validation' });
  }
};

module.exports = { validateOrigin };
