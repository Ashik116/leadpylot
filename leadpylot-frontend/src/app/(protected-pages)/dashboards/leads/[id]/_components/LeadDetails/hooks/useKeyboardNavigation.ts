import { useEffect } from 'react';

interface NavigationData {
  has_previous?: boolean;
  has_next?: boolean;
  can_complete?: boolean;
  is_current_top?: boolean;
}

interface UseKeyboardNavigationOptions {
  onPrevious: () => void;
  onNext: () => void;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  queueNavigation?: NavigationData | null;
  lead?: any;
  enabled?: boolean;
}

/**
 * Custom hook for keyboard navigation in lead details
 * 
 * Features:
 * - Arrow Left/Right keys for navigation
 * - Automatically ignores input fields, textareas, and contenteditable elements
 * - Respects navigation state (canGoToPrevious/canGoToNext)
 * - Supports both regular and queue-based navigation
 * 
 * @param options - Navigation configuration options
 * @param options.onPrevious - Callback for previous navigation
 * @param options.onNext - Callback for next navigation
 * @param options.canGoToPrevious - Whether previous navigation is enabled
 * @param options.canGoToNext - Whether next navigation is enabled
 * @param options.queueNavigation - Optional queue navigation data
 * @param options.lead - Optional lead data for additional checks
 * @param options.enabled - Whether keyboard navigation is enabled (default: true)
 */
export const useKeyboardNavigation = ({
  onPrevious,
  onNext,
  canGoToPrevious,
  canGoToNext,
  queueNavigation,
  lead,
  enabled = true,
}: UseKeyboardNavigationOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field, textarea, select, or contenteditable element
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          (activeElement as HTMLElement).isContentEditable ||
          activeElement.closest('[contenteditable="true"]'));

      // Don't trigger navigation if user is typing
      if (isTyping) {
        return;
      }

      // Check if navigation is enabled
      const canGoPrevious = queueNavigation
        ? queueNavigation.has_previous
        : canGoToPrevious;
      const canGoNext = queueNavigation
        ? queueNavigation.has_next
        : canGoToNext || (lead as any)?.is_on_top;

      // Handle arrow key navigation
      if (event.key === 'ArrowLeft' && canGoPrevious) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault();
        onNext();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onPrevious,
    onNext,
    canGoToPrevious,
    canGoToNext,
    queueNavigation,
    lead,
  ]);
};

