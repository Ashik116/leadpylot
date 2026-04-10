import { useEffect } from 'react';
import { useCommStore } from '@/stores/commStore';
import CommApi from '@/services/CommApiService';

/**
 * Module-level set of user IDs that have already been fetched or are in-flight.
 * Prevents duplicate network requests across component mounts/unmounts.
 */
const fetchedProfileIds = new Set<string>();

/**
 * Hook that fetches and caches user profiles for a list of user IDs.
 * - Profiles are stored in the Zustand commStore.
 * - Only fetches IDs that haven't been fetched before.
 * - Components read profiles via `useCommStore(s => s.userProfiles[userId])`.
 *
 * @example
 * // In a parent component that knows about user IDs:
 * const userIds = messages.map(m => m.authorId);
 * useUserProfiles(userIds);
 *
 * // In a child component:
 * const username = useCommStore(s => s.userProfiles[userId]?.username) || 'Unknown';
 */
export function useUserProfiles(userIds: string[]) {
  const setUserProfiles = useCommStore((s) => s.setUserProfiles);

  useEffect(() => {
    // Filter to IDs that are valid and haven't been fetched yet
    const missing = userIds.filter((id) => id && id.length > 0 && !fetchedProfileIds.has(id));
    if (missing.length === 0) return;

    // Deduplicate
    const uniqueMissing = [...new Set(missing)];

    // Mark as in-flight to prevent duplicate requests
    uniqueMissing.forEach((id) => fetchedProfileIds.add(id));

    CommApi.getUserProfiles(uniqueMissing)
      .then(({ data }) => {
        if (data.data && Array.isArray(data.data)) {
          setUserProfiles(data.data);
        }
      })
      .catch(() => {
        // Remove from fetched set so they can be retried on next render
        uniqueMissing.forEach((id) => fetchedProfileIds.delete(id));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(','), setUserProfiles]);
}

/**
 * Utility hook that returns the display name for a single user ID.
 * Falls back to the last 6 characters of the ID if no profile is cached.
 */
export function useDisplayName(userId: string): string {
  return useCommStore((s) => s.userProfiles[userId]?.username) || userId?.slice(-6) || 'Unknown';
}

/**
 * Reset the fetched profiles tracker (useful for logout/cleanup).
 */
export function resetProfileCache() {
  fetchedProfileIds.clear();
}
