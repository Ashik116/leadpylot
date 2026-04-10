import React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface CommentBubbleProps {
  user: string;
  text: string;
  time?: string;
  avatar?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const CommentBubble: React.FC<CommentBubbleProps> = ({
  user,
  text,
  time,
  avatar,
  showActions = false,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  return (
    <div className="group flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-[11px] font-semibold text-white shadow-sm">
        {avatar || user.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-lg bg-gray-200 px-2.5 py-1.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-rust">{user}</span>
            {showActions && (
              <div className="pointer-events-none flex items-center gap-1 text-xs opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <button
                  onClick={onEdit}
                  className="rounded-md p-1 text-gray-500 transition-all hover:bg-white hover:text-gray-900 hover:shadow-sm active:scale-95"
                  title="Edit comment"
                  aria-label="Edit comment"
                  type="button"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {onDelete && (
                  <ConfirmPopover
                    title="Delete Comment"
                    description="Are you sure you want to delete this comment? This cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={onDelete}
                    isLoading={isDeleting}
                    placement="left"
                  >
                    <button
                      onClick={(e) => e.stopPropagation()}
                      disabled={isDeleting}
                      className="rounded-md p-1 text-red-600 transition-all hover:bg-red-50 hover:text-red-700 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Delete comment"
                      aria-label="Delete comment"
                      type="button"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </ConfirmPopover>
                )}
              </div>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
            {text}
          </p>
          {time && (
            <div className="mt-0.5 flex justify-end">
              <span className="text-[11px] text-gray-400">{time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
