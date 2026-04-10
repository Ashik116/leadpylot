import { Loader2, Send, Smile } from 'lucide-react';
import Image from 'next/image';
import React, { useMemo, useRef, useState } from 'react';
import { useCreateChatMessage } from '@/hooks/useInternalChat';
import { EmojiPicker } from './EmojiPicker';
import { useUserStore } from '@/stores/userStore';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';

interface CommentComposerProps {
  taskId?: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({ taskId }) => {
  const { currentUser } = useUserStore();
  const imageId = currentUser?.image_id?._id || currentUser?.image_id?.id;
  const { blobUrl: profileImageUrl } = useAttachmentPreviewFile(imageId);

  const [commentText, setCommentText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const createMessageMutation = useCreateChatMessage();

  const userInitials = useMemo(() => {
    const name = currentUser?.login || 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [currentUser?.login]);

  const handleEmojiSelect = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!commentText.trim() || !taskId) return;

    try {
      await createMessageMutation.mutateAsync({
        taskId,
        message: commentText.trim(),
      });
      setCommentText('');
      setEmojiPickerOpen(false);
    } catch {
      // Error is handled by React Query and will be shown in the UI if needed
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift), allow Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled =
    !commentText.trim() || createMessageMutation.isPending || !taskId;

  return (
    <div className="shrink-0 border-t border-gray-300 bg-white px-2 py-3">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={currentUser?.login || 'User'}
              className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm"
              width={36}
              height={36}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-semibold text-white shadow-sm">
              {userInitials}
            </div>
          )}

          {/* Input Area */}
          <div className="relative flex-1">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-opacity-20">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message..."
                disabled={!taskId}
                className="min-h-[40px] max-h-[120px] w-full resize-none border-0 bg-transparent px-0 py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                rows={1}
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                  className={`rounded-md p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-95 ${emojiPickerOpen ? 'bg-gray-100 text-gray-600' : ''}`}
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="rounded-md bg-indigo-600 p-1.5 text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
                  title="Send message (Enter)"
                >
                  {createMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {/* Emoji Picker */}
            <EmojiPicker
              isOpen={emojiPickerOpen}
              onClose={() => setEmojiPickerOpen(false)}
              onSelect={handleEmojiSelect}
              triggerRef={emojiButtonRef}
            />
          </div>
        </div>
      </form>
    </div>
  );
};
