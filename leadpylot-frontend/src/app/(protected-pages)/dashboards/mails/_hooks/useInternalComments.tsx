/**
 * useInternalComments Hook
 * Manages internal comments with real-time updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InternalCommentService } from '../_services';
import { useEmailStore } from '../_stores/emailStore';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { CreateCommentInput, UpdateCommentInput } from '../_types/comment.types';

export function useInternalComments(emailId: string | null) {
  const queryClient = useQueryClient();
  const emailStore = useEmailStore();
  const addCommentToStore = emailStore.addComment;
  const updateCommentInStore = emailStore.updateComment;
  const deleteCommentFromStore = emailStore.deleteComment;

  // Fetch comments
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['internal-comments', emailId],
    queryFn: () => emailId ? InternalCommentService.getComments(emailId) : [],
    enabled: !!emailId,
    staleTime: 30000,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: CreateCommentInput) => {
      const payload = {
        text: data.text,
        mentioned_users: Array.isArray(data.mentioned_users) ? data.mentioned_users : [],
        attachment_ids: data.attachment_ids || [],
      };

      return InternalCommentService.addComment(data.email_id, payload);
    },
    onSuccess: (newComment) => {
      // Update cache
      queryClient.setQueryData(['internal-comments', emailId], (old: any[] = []) => [...old, newComment]);
      queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });

      // Update store
      if (emailId) {
        addCommentToStore(emailId, newComment);
      }

      toast.push(
        <Notification title="Success" type="success">
          Comment added
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to add comment'}
        </Notification>
      );
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentInput }) =>
      emailId ? InternalCommentService.updateComment(emailId, commentId, data) : Promise.reject(),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({ queryKey: ['internal-comments', emailId] });
      queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
      if (emailId) {
        updateCommentInStore(emailId, updatedComment._id, updatedComment);
      }
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      emailId ? InternalCommentService.deleteComment(emailId, commentId) : Promise.reject(),
    onSuccess: (_, commentId) => {
      // Update cache
      queryClient.setQueryData(['internal-comments', emailId], (old: any[] = []) =>
        old.filter((c: any) => c._id !== commentId)
      );
      queryClient.invalidateQueries({ queryKey: ['email-detail', emailId] });
      // Update store
      if (emailId) {
        deleteCommentFromStore(emailId, commentId);
      }

      toast.push(
        <Notification title="Success" type="success">
          Comment deleted
        </Notification>
      );
    },
  });

  return {
    // Data
    comments,
    isLoading,
    error,
    commentCount: comments.length,

    // Actions
    addComment: addCommentMutation.mutate,
    updateComment: updateCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,

    // States
    isAddingComment: addCommentMutation.isPending,
    isUpdatingComment: updateCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
  };
}

