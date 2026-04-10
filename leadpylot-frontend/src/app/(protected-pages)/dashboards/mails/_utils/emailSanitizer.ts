/**
 * Email HTML Sanitizer
 * Sanitizes email HTML to prevent XSS and CSS leakage.
 *
 * - sanitizeEmailHTML: Full sanitization (strips styles) - for inline rendering
 * - sanitizeEmailForPreview: XSS-only (keeps styles) - for iframe rendering
 * - getSafeEmailHTML: Convenience wrapper for common use
 * - textToHTML: Plain text to HTML with line breaks
 */

/** Tags that can execute code or load external content */
const DANGEROUS_TAGS = ['iframe', 'object', 'embed', 'applet', 'meta', 'link'] as const;

/** Regex to match script tags and their content */
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/** Regex to match event handler attributes (onclick, onerror, etc.) */
const EVENT_HANDLER_QUOTED = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const EVENT_HANDLER_UNQUOTED = /\s*on\w+\s*=\s*[^\s>]*/gi;

interface SanitizeOptions {
  allowStyles?: boolean;
  stripStyles?: boolean;
}

/**
 * Sanitize HTML email content
 * - Removes dangerous tags (script, iframe, object, embed)
 * - Removes event handlers (onclick, onerror, etc.)
 * - Scopes or removes style tags to prevent CSS leakage
 * - Adds classes for CSS isolation
 */
export function sanitizeEmailHTML(html: string, options: SanitizeOptions = {}): string {
  if (!html) return '';

  const { stripStyles = true } = options;

  let sanitized = html;

  sanitized = sanitized.replace(SCRIPT_TAG_REGEX, '');

  DANGEROUS_TAGS.forEach((tag) => {
    const blockRegex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
    const selfCloseRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(blockRegex, '').replace(selfCloseRegex, '');
  });

  sanitized = sanitized.replace(EVENT_HANDLER_QUOTED, '').replace(EVENT_HANDLER_UNQUOTED, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Handle style tags
  if (stripStyles) {
    // Remove inline styles completely
    sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Aggressively remove border-related attributes
    sanitized = sanitized.replace(/\s*border\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*border\s*=\s*[^\s>]*/gi, '');
    sanitized = sanitized.replace(/\s*cellspacing\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*cellpadding\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*bordercolor\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*frame\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*rules\s*=\s*["'][^"']*["']/gi, '');

    // Remove width attributes that might be creating column-like appearance
    sanitized = sanitized.replace(/\s*width\s*=\s*["']1["']/gi, '');
    sanitized = sanitized.replace(/\s*width\s*=\s*["']2["']/gi, '');
  } else {
    // Scope styles by prefixing selectors with .email-content
    sanitized = sanitized.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, styles) => {
      // Simple scoping - add .email-content before each selector
      const scopedStyles = styles.replace(
        /(^|})([^{]*){/g,
        (m: string, prefix: string, selector: string) => {
          // Don't scope @media, @keyframes, etc.
          if (selector.trim().startsWith('@')) {
            return m;
          }
          // Add scoping class
          const scoped = selector
            .split(',')
            .map((s: string) => `.email-content ${s.trim()}`)
            .join(', ');
          return `${prefix}${scoped} {`;
        }
      );
      return `<style>${scopedStyles}</style>`;
    });
  }

  // Remove base href tags that might break navigation
  sanitized = sanitized.replace(/<base\b[^>]*>/gi, '');

  // Ensure links open in new tab
  sanitized = sanitized.replace(/<a\b/gi, '<a target="_blank" rel="noopener noreferrer"');

  return sanitized;
}

/**
 * Convert plain text to HTML with line breaks
 */
export function textToHTML(text: string): string {
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
}

/**
 * Get safe HTML for rendering
 */
export function getSafeEmailHTML(htmlBody: string | null, textBody: string): string {
  if (htmlBody) {
    return sanitizeEmailHTML(htmlBody, { stripStyles: true });
  }
  return textToHTML(textBody);
}

/** Fallback icon - gray warning triangle with exclamation (matches Gmail/Outlook bounce style) */
const CID_FALLBACK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23f3f4f6' stroke='%239ca3af' stroke-width='1.5' d='M12 2L2 22h20L12 2z'/%3E%3Cpath stroke='%236b7280' stroke-width='2' stroke-linecap='round' d='M12 8v4'/%3E%3Ccircle cx='12' cy='17' r='1.25' fill='%236b7280'/%3E%3C/svg%3E";

/**
 * XSS-only sanitization for iframe email preview.
 * Keeps styles/layout intact; removes scripts, handlers, dangerous tags.
 * Replaces cid: image refs (inline email images) with fallback icon - browsers cannot resolve cid:.
 */
export function sanitizeEmailForPreview(html: string): string {
  if (!html) return '';

  let sanitized = html.replace(SCRIPT_TAG_REGEX, '');

  DANGEROUS_TAGS.forEach((tag) => {
    const blockRegex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gis');
    const selfCloseRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(blockRegex, '').replace(selfCloseRegex, '');
  });

  sanitized = sanitized.replace(EVENT_HANDLER_QUOTED, '').replace(EVENT_HANDLER_UNQUOTED, '');
  sanitized = sanitized.replace(/javascript:/gi, '').replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/<base\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<a\b/gi, '<a target="_blank" rel="noopener noreferrer"');

  // Replace cid: image refs - browsers cannot resolve them; use fallback icon
  sanitized = sanitized.replace(/src=["']cid:[^"']*["']/gi, `src="${CID_FALLBACK_ICON}"`);

  // Add onerror fallback for img - when external images fail (e.g. bounce icons), show warning icon
  const escaped = CID_FALLBACK_ICON.replace(/'/g, "\\'");
  sanitized = sanitized.replace(/<img\s+([^>]*?)>/gi, `<img $1 onerror="this.src='${escaped}';this.onerror=null">`);

  return sanitized;
}
