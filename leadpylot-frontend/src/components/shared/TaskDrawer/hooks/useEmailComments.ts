/**
 * Hook for managing email comments state and operations
 */

import { useState, useCallback } from 'react';
import { apiGetEmailComments, apiSaveEmailComment } from '../services/TaskDrawerService';
import type { InternalComment } from '../TaskDrawer.types';

export const useEmailComments = () => {
  const [emailComments, setEmailComments] = useState<Record<string, InternalComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [savingComments, setSavingComments] = useState<Set<string>>(new Set());
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  const fetchEmailComments = useCallback(async (emailId: string) => {
    setLoadingComments((prev) => new Set(prev).add(emailId));
    try {
      const response = await apiGetEmailComments(emailId);
      const comments = response.data || response.comments || [];

      setEmailComments((prev) => ({
        ...prev,
        [emailId]: comments,
      }));
    } catch {
      // Error fetching comments
      setEmailComments((prev) => ({
        ...prev,
        [emailId]: [],
      }));
    } finally {
      setLoadingComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
    }
  }, []);

  const handleCommentChange = useCallback((emailId: string, comment: string) => {
    setNewComment((prev) => ({
      ...prev,
      [emailId]: comment,
    }));
  }, []);

  const saveEmailComment = useCallback(
    async (emailId: string) => {
      const comment = newComment[emailId];
      if (!comment || !comment.trim()) return;

      setSavingComments((prev) => new Set(prev).add(emailId));
      try {
        await apiSaveEmailComment(emailId, comment, []);

        // Clear the comment input after successful save
        setNewComment((prev) => ({
          ...prev,
          [emailId]: '',
        }));

        // Refresh comments
        await fetchEmailComments(emailId);
      } catch {
        // Error saving comment
      } finally {
        setSavingComments((prev) => {
          const newSet = new Set(prev);
          newSet.delete(emailId);
          return newSet;
        });
      }
    },
    [newComment, fetchEmailComments]
  );

  const getComments = useCallback(
    (emailId: string) => {
      return emailComments[emailId] || [];
    },
    [emailComments]
  );

  const isLoadingComments = useCallback(
    (emailId: string) => {
      return loadingComments.has(emailId);
    },
    [loadingComments]
  );

  const isSavingComment = useCallback(
    (emailId: string) => {
      return savingComments.has(emailId);
    },
    [savingComments]
  );

  const getNewComment = useCallback(
    (emailId: string) => {
      return newComment[emailId] || '';
    },
    [newComment]
  );

  return {
    emailComments,
    newComment,
    fetchEmailComments,
    handleCommentChange,
    saveEmailComment,
    getComments,
    isLoadingComments,
    isSavingComment,
    getNewComment,
  };
};

