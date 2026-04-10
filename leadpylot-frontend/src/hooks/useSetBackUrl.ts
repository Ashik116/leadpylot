import { useEffect } from 'react';
import { useBackNavigationStore } from '@/stores/backNavigationStore';

export type UseSetBackUrlOptions = {
  enabled?: boolean;
  clearOnUnmount?: boolean;
};

/**
 * Sets the back URL in the global back navigation store from a provided pathname.
 * - Pass the current page `pathname` to record it as a back target.
 * - Use `enabled` to toggle behavior.
 * - Use `clearOnUnmount` to clear the back URL when the component unmounts.
 */
export function useSetBackUrl(pathname?: string | null, options: UseSetBackUrlOptions = {}): void {
  const { enabled = true, clearOnUnmount = false } = options;

  const { setBackUrl, clearBackUrl } = useBackNavigationStore();

  useEffect(() => {
    if (!enabled) return;
    if (pathname) {
      setBackUrl(pathname);
    }

    return () => {
      if (clearOnUnmount) {
        clearBackUrl();
      }
    };
  }, [enabled, pathname, setBackUrl, clearOnUnmount, clearBackUrl]);
}
