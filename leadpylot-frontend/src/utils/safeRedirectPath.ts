/**
 * Returns a safe in-app path for post-login redirects (open-redirect hardening).
 * Only same-origin relative paths are allowed.
 */
export function getSafeRedirectPath(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('://') || trimmed.includes('\\')) return null;
  if (trimmed.toLowerCase().startsWith('/javascript:') || trimmed.toLowerCase().startsWith('/data:')) {
    return null;
  }
  return trimmed;
}
