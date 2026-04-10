/**
 * CommentSection Component - Comments container
 */

import Spinner from '@/components/ui/Spinner';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';

interface CommentSectionProps {
  emailId: string;
  comments: any[];
  isLoading: boolean;
  newComment: string;
  isSaving: boolean;
  onCommentChange: (value: string) => void;
  onSaveComment: () => void;
}

export const CommentSection = ({
  emailId,
  comments,
  isLoading,
  newComment,
  isSaving,
  onCommentChange,
  onSaveComment,
}: CommentSectionProps) => {
  return (
    <div className="mt-3 border-t border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="text-xs font-medium text-gray-700">Internal Comments</span>
        <span className="text-xs text-gray-500">(Team only)</span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size={20} />
          <span className="ml-2 text-xs text-gray-500">Loading comments...</span>
        </div>
      ) : (
        <>
          {/* Existing Comments */}
          <CommentList comments={comments} />

          {/* New Comment Form */}
          <CommentForm
            value={newComment}
            onChange={onCommentChange}
            onSubmit={onSaveComment}
            isLoading={isSaving}
          />
        </>
      )}
    </div>
  );
};

