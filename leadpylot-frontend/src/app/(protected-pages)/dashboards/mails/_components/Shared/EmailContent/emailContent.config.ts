/**
 * EmailContent configuration
 * Central place for iframe, font, and display settings.
 * Update here when changing fonts, sizes, or security settings.
 */

/** Iframe sandbox - allow-scripts needed for img onerror fallback when external images fail */
export const IFRAME_SANDBOX = 'allow-same-origin allow-popups allow-scripts';
export const IFRAME_TITLE = 'Email content';

/** Font and typography */
export const EMAIL_FONT_FAMILY = 'Matter';
export const EMAIL_FONT_SIZE = '14px';
export const FONT_PATHS = {
  regular: '/fonts/matter-font/Matter-Regular.ttf',
  medium: '/fonts/matter-font/Matter-Medium.ttf',
  semiBold: '/fonts/matter-font/Matter-SemiBold.ttf',
  bold: '/fonts/matter-font/Matter-Bold.ttf',
} as const;

/** Default min height (px) before content loads */
export const DEFAULT_MIN_HEIGHT = 50;
