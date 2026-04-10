/**
 * useUrlSync Hook
 * Handles URL-based routing for email system
 * Pattern: #inbox/email-id-123 or #inbox
 */

import { useEffect, useCallback } from 'react';
import { UrlEmailState, EmailView } from '../_types/email.types';

/**
 * Parse hash and query parameters from URL
 * Examples:
 * - #inbox -> { view: 'inbox', emailId: null }
 * - #inbox/507f1f77bcf86cd799439011 -> { view: 'inbox', emailId: '507f...' }
 * - ?conversation=507f1f77bcf86cd799439011 -> { view: 'inbox', emailId: '507f...' }
 * - #sent?conversation=507f1f77bcf86cd799439011 -> { view: 'sent', emailId: '507f...' }
 */
export function parseUrlHash(): UrlEmailState {
  if (typeof window === 'undefined') {
    return { view: null, emailId: null };
  }

  const validViews: EmailView[] = [
    'inbox',
    'sent',
    'drafts',
    'starred',
    'snoozed',
    'archived',
    'all',
    'trash',
    'pending',
  ];

  // Check for query parameter first (?conversation=ID)
  const searchParams = new URLSearchParams(window.location.search);
  const conversationParam = searchParams.get('conversation');

  // Parse hash
  const hash = window.location.hash.slice(1); // Remove the '#'
  const [hashView, hashEmailId] = hash.split('/');

  // Determine view (from hash or default to 'inbox' if conversation param exists)
  let view: EmailView | null = null;
  if (hashView && validViews.includes(hashView as EmailView)) {
    view = hashView as EmailView;
  } else if (conversationParam) {
    // If conversation param exists but no valid view, default to inbox
    view = 'inbox';
  }

  // Determine email ID (query param takes priority over hash)
  const emailId = conversationParam || hashEmailId || null;

  return {
    view: view as any,
    emailId,
  };
}

/**
 * Update URL hash without page reload
 * Uses history.replaceState to avoid triggering hashchange event
 */
export function updateUrlHash(
  view: EmailView | null,
  emailId?: string | null,
  replace = false
): void {
  if (typeof window === 'undefined') return;

  const searchParams = new URLSearchParams(window.location.search);
  // Remove conversation query param whenever we update via hash routing
  if (searchParams.has('conversation')) {
    searchParams.delete('conversation');
  }
  const sanitizedSearch = searchParams.toString();
  const currentPath = `${window.location.pathname}${sanitizedSearch ? `?${sanitizedSearch}` : ''}`;
  let newHash = '';

  if (view) {
    newHash = emailId ? `#${view}/${emailId}` : `#${view}`;
  }

  const newUrl = currentPath + newHash;

  // Use replaceState to update URL without triggering navigation or hashchange
  if (replace) {
    window.history.replaceState(null, '', newUrl);
  } else {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Get full URL for a view/email combination
 */
export function getEmailUrl(view: EmailView | null, emailId?: string | null): string {
  if (!view) return '/dashboards/mails';

  if (emailId) {
    return `/dashboards/mails#${view}/${emailId}`;
  }

  return `/dashboards/mails#${view}`;
}

/**
 * Hook to sync URL with email state
 * Listens to hash changes and popstate for browser navigation
 */
export function useUrlSync(onHashChange: (state: UrlEmailState) => void): {
  updateUrl: (view: EmailView | null, emailId?: string | null) => void;
  currentUrlState: UrlEmailState;
} {
  // Listen to both hashchange and popstate (back/forward navigation)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleNavigation = () => {
      const urlState = parseUrlHash();
      onHashChange(urlState);
    };

    // Helper to patch history methods so pushState/replaceState trigger a custom event
    const patchHistoryMethod = (method: 'pushState' | 'replaceState') => {
      const original = window.history[method];
      if (!original) return original;

      const wrapped: History['pushState'] = (...args) => {
        const result = (original as History['pushState']).apply(window.history, args);
        window.dispatchEvent(new Event('locationchange'));
        return result;
      };

      window.history[method] = wrapped as History['pushState'];
      return original;
    };

    const originalPushState = patchHistoryMethod('pushState');
    const originalReplaceState = patchHistoryMethod('replaceState');

    // Process initial URL state on mount
    const initialState = parseUrlHash();
    onHashChange(initialState);

    // hashchange for hash changes
    window.addEventListener('hashchange', handleNavigation);
    // popstate for browser back/forward buttons
    window.addEventListener('popstate', handleNavigation);
    // custom event for pushState/replaceState
    window.addEventListener('locationchange', handleNavigation);

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('locationchange', handleNavigation);

      if (originalPushState) {
        window.history.pushState = originalPushState;
      }
      if (originalReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, [onHashChange]);

  const updateUrl = useCallback((view: EmailView | null, emailId?: string | null) => {
    updateUrlHash(view, emailId);
  }, []);

  return {
    updateUrl,
    currentUrlState: parseUrlHash(),
  };
}
