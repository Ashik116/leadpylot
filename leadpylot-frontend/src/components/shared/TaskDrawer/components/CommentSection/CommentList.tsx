/**
 * CommentList Component - List of comments
 */

import { formatDate } from '../../TaskDrawer.utils';
import type { InternalComment } from '../../TaskDrawer.types';

interface CommentListProps {
  comments: InternalComment[];
}

export const CommentList = ({ comments }: CommentListProps) => {
  if (comments.length === 0) return null;

  return (
    <div className="mb-3 max-h-60 space-y-2 overflow-y-auto">
      {comments.map((comment) => (
        <div key={comment._id} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-1 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                {comment.user.name?.charAt(0) || comment.user.login?.charAt(0) || '?'}
              </div>
              <span className="text-xs font-medium text-gray-700">
                {comment.user.name || comment.user.login}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {formatDate(comment.created_at, 'MMM d, h:mm a')}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{comment.text}</p>
        </div>
      ))}
    </div>
  );
};

