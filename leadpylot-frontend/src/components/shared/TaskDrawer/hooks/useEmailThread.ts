/**
 * Hook for managing email thread state and fetching
 */

import { useState, useCallback } from 'react';
import { apiGetEmailThread } from '../services/TaskDrawerService';
import type { EmailThread } from '../TaskDrawer.types';

export const useEmailThread = () => {
  const [emailThreads, setEmailThreads] = useState<Record<string, EmailThread[]>>({});
  const [loadingThreads, setLoadingThreads] = useState<Set<string>>(new Set());
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  const fetchEmailThread = useCallback(async (taskId: string, emailId: string) => {
    setLoadingThreads((prev) => new Set(prev).add(taskId));
    try {
      const response = await apiGetEmailThread(emailId);
      const emails = response.data?.emails || [];
      const validEmails = Array.isArray(emails)
        ? emails.filter((email: any) => email !== null && email !== undefined && email._id)
        : [];

      setEmailThreads((prev) => ({
        ...prev,
        [taskId]: validEmails,
      }));
    } catch {
      // Set empty array to show "no email found" message instead of loading state
      setEmailThreads((prev) => ({
        ...prev,
        [taskId]: [],
      }));
    } finally {
      setLoadingThreads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, []);

  const toggleEmailExpansion = useCallback((emailId: string) => {
    setExpandedEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  }, []);

  const isEmailExpanded = useCallback(
    (emailId: string) => {
      return expandedEmails.has(emailId);
    },
    [expandedEmails]
  );

  const isLoadingThread = useCallback(
    (taskId: string) => {
      return loadingThreads.has(taskId);
    },
    [loadingThreads]
  );

  const getThread = useCallback(
    (taskId: string) => {
      return emailThreads[taskId] || [];
    },
    [emailThreads]
  );

  return {
    emailThreads,
    loadingThreads,
    expandedEmails,
    fetchEmailThread,
    toggleEmailExpansion,
    isEmailExpanded,
    isLoadingThread,
    getThread,
  };
};

