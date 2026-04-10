/**
 * useEmailActions Hook
 * Centralized email action handlers (approve, reject, archive, etc.)
 */

import { useCallback } from 'react';
import { useEmailData } from './useEmailData';

export function useEmailActions() {
  const { approveEmail, rejectEmail, archiveEmail, isApproving, isRejecting, isArchiving } =
    useEmailData();

  const handleApprove = useCallback(
    async (emailId: string, comments?: string) => {
      approveEmail({ emailId, comments });
    },
    [approveEmail]
  );

  const handleReject = useCallback(
    async (emailId: string, reason: string, comments?: string) => {
      rejectEmail({ emailId, reason, comments });
    },
    [rejectEmail]
  );

  const handleArchive = useCallback(
    async (emailId: string) => {
      archiveEmail(emailId);
    },
    [archiveEmail]
  );

  const handleBulkArchive = useCallback(
    async (emailIds: string[]) => {
      // Archive multiple emails
      await Promise.all(emailIds.map((id) => archiveEmail(id)));
    },
    [archiveEmail]
  );

  return {
    // Single actions
    approveEmail: handleApprove,
    rejectEmail: handleReject,
    archiveEmail: handleArchive,

    // Bulk actions
    bulkArchive: handleBulkArchive,

    // Loading states
    isApproving,
    isRejecting,
    isArchiving,
  };
}
