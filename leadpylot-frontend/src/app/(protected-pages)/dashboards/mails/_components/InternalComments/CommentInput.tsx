'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useInternalComments } from '../../_hooks/useInternalComments';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MentionAutocomplete, { MentionUser } from './MentionAutocomplete';
import CommentAttachmentUpload from './CommentAttachmentUpload';
import { InternalComment } from '../../_types/comment.types';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const commentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty'),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentInputProps {
  emailId: string;
  editingComment?: InternalComment | null;
  onCancelEdit?: () => void;
  visibleToAgents?: string[] | null;
}

export default function CommentInput({
  emailId,
  editingComment = null,
  onCancelEdit,
  visibleToAgents,
}: CommentInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [mentionLookup, setMentionLookup] = useState<Record<string, string>>({});
  const [showMentionsAbove, setShowMentionsAbove] = useState(false);
  const [uploadedAttachmentIds, setUploadedAttachmentIds] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Array<{ id: string; filename: string; size?: number }>>([]);
  const [pendingMentionUser, setPendingMentionUser] = useState<MentionUser | null>(null);
  const [showMentionConfirm, setShowMentionConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { addComment, updateComment, isAddingComment, isUpdatingComment } = useInternalComments(emailId);

  const isEditing = !!editingComment;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: '',
    },
  });

  const textValue = watch('text');

  useEffect(() => {
    if (editingComment) {
      setValue('text', editingComment.text);
      const existingAttachmentIds =
        editingComment.attachments?.map((attachment) => attachment.document_id || attachment._id).filter(Boolean) as string[] || [];
      const existingAttachmentData =
        editingComment.attachments?.map((attachment) => ({
          id: attachment.document_id || attachment._id,
          filename: attachment.filename,
          size: attachment.size,
        })).filter((att) => Boolean(att.id)) as Array<{ id: string; filename: string; size?: number }> || [];
      setUploadedAttachmentIds(existingAttachmentIds);
      setExistingAttachments(existingAttachmentData);
    } else {
      setValue('text', '');
      setUploadedAttachmentIds([]);
      setExistingAttachments([]);
    }
  }, [editingComment, setValue]);

  useEffect(() => {
    if (!showMentions || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 300;

    setShowMentionsAbove(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight);
  }, [showMentions]);

  const onSubmit = useCallback(
    async (data: CommentFormData) => {
      const mentionMatches = Array.from((data.text || '').matchAll(/@([a-zA-Z0-9._-]+)/g));
      const mentionedUsers = Array.from(
        new Set(
          mentionMatches
            .map((match) => mentionLookup[match[1]])
            .filter((id): id is string => Boolean(id))
        )
      );

      if (isEditing && editingComment) {
        updateComment({
          commentId: editingComment._id,
          data: {
            text: data.text.trim(),
            mentioned_users: mentionedUsers,
            attachment_ids: uploadedAttachmentIds,
          },
        });
        onCancelEdit?.();
        setUploadedAttachmentIds([]);
      } else {
        addComment({
          email_id: emailId,
          text: data.text.trim(),
          mentioned_users: mentionedUsers,
          attachment_ids: uploadedAttachmentIds,
        });
        setUploadedAttachmentIds([]);
      }

      reset();
      setMentionQuery('');
      setMentionStartIndex(null);
      setShowMentions(false);
      setMentionLookup({});
    },
    [addComment, updateComment, emailId, mentionLookup, reset, isEditing, editingComment, onCancelEdit, uploadedAttachmentIds]
  );

  const insertMentionForUser = useCallback(
    (user: MentionUser) => {
      if (mentionStartIndex === null || !textareaRef.current) return;

      setMentionLookup((prev) => ({ ...prev, [user.login]: user._id }));

      const currentText = textValue || '';
      const beforeMention = currentText.substring(0, mentionStartIndex);
      const afterMention = currentText.substring(cursorPosition);
      const mentionText = `@${user.login}`;
      const needsTrailingSpace = afterMention.length === 0 || !/[\s]/.test(afterMention.charAt(0));
      const newText = `${beforeMention}${mentionText}${needsTrailingSpace ? ' ' : ''}${afterMention}`;

      setValue('text', newText);
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartIndex(null);

      const newCaretPosition = mentionStartIndex + mentionText.length + (needsTrailingSpace ? 1 : 0);
      textareaRef.current.focus();
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(newCaretPosition, newCaretPosition);
      });
    },
    [mentionStartIndex, cursorPosition, textValue, setValue]
  );

  const handleConfirmMention = useCallback(() => {
    if (pendingMentionUser) {
      insertMentionForUser(pendingMentionUser);
    }
    setPendingMentionUser(null);
    setShowMentionConfirm(false);
  }, [pendingMentionUser, insertMentionForUser]);

  const handleCancelMention = useCallback(() => {
    setPendingMentionUser(null);
    setShowMentionConfirm(false);
  }, []);

  const handleMentionSelect = useCallback(
    (user: MentionUser) => {
      if (mentionStartIndex === null || !textareaRef.current) return;

      if (!visibleToAgents?.includes(user._id)) {
        setPendingMentionUser(user);
        setShowMentionConfirm(true);
        setShowMentions(false);
        return;
      }

      insertMentionForUser(user);
    },
    [mentionStartIndex, cursorPosition, textValue, visibleToAgents, insertMentionForUser]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(onSubmit)();
        return;
      }

      if (e.key === '@') {
        const input = e.currentTarget as HTMLTextAreaElement;
        const selectionStart = input.selectionStart ?? 0;
        setCursorPosition(selectionStart);
        setMentionStartIndex(selectionStart);
        setShowMentions(true);
        setMentionQuery('');
      }

      if (e.key === 'Escape' && showMentions) {
        e.preventDefault();
        setShowMentions(false);
        setMentionQuery('');
        setMentionStartIndex(null);
      }
    },
    [showMentions, handleSubmit, onSubmit]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const value = e.target.value;
      const input = e.target as HTMLTextAreaElement;
      const newCursorPosition = input.selectionStart || 0;
      setCursorPosition(newCursorPosition);

      if (showMentions && mentionStartIndex !== null) {
        if (
          mentionStartIndex >= value.length ||
          value[mentionStartIndex] !== '@' ||
          mentionStartIndex >= newCursorPosition
        ) {
          setShowMentions(false);
          setMentionStartIndex(null);
        } else {
          const query = value.substring(mentionStartIndex + 1, newCursorPosition);
          setMentionQuery(query);

          if (query.includes(' ') || query.includes('\n')) {
            setShowMentions(false);
            setMentionStartIndex(null);
          }
        }
      }
    },
    [showMentions, mentionStartIndex]
  );

  return (
    <div ref={containerRef} className="relative z-10">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-lg border border-amber-200 bg-white">
          <Input
            {...register('text')}
            ref={(e) => {
              const ref = register('text').ref;
              if (typeof ref === 'function') {
                ref(e);
              }
              if (e) {
                textareaRef.current = e as HTMLTextAreaElement;
              }
            }}
            textArea
            rows={3}
            placeholder={isEditing ? 'Edit comment... Use @ to mention teammates' : 'Type internal comment... Use @ to mention teammates'}
            className="w-full resize-none border-0 p-3 text-sm focus:ring-0 focus:outline-none"
            disabled={isAddingComment}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              register('text').onChange(e);
              handleTextChange(e);
            }}
            invalid={!!errors.text}
          />

          <div className="flex items-center justify-between border-t border-amber-100 px-3 py-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="text-xs text-amber-700">
                <kbd className="rounded bg-amber-100 px-1 py-0.5 text-xs">Ctrl</kbd>
                {' + '}
                <kbd className="rounded bg-amber-100 px-1 py-0.5 text-xs">Enter</kbd>
                {' to '}
                {isEditing ? 'update' : 'send'}
              </div>
              <CommentAttachmentUpload
                value={uploadedAttachmentIds}
                onChange={setUploadedAttachmentIds}
                disabled={isAddingComment || isUpdatingComment}
                maxFileSize={4 * 1024 * 1024}
                existingAttachments={existingAttachments}
              />
            </div>

            <div className="flex items-center gap-2">
              {isEditing && onCancelEdit && (
                <Button type="button" size="sm" variant="plain" onClick={onCancelEdit}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                variant="solid"
                disabled={isAddingComment || isUpdatingComment}
                loading={isAddingComment || isUpdatingComment}
              >
                {isEditing ? 'Update' : isAddingComment ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {showMentions && (
        <div
          className={`absolute right-0 left-0 z-[100] ${showMentionsAbove ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
        >
          <MentionAutocomplete
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentions(false)}
            showAbove={showMentionsAbove}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={showMentionConfirm}
        onCancel={handleCancelMention}
        handleCancel={handleCancelMention}
        onConfirm={handleConfirmMention}
        title="Warning!"
      >
        <div className="text-base text-gray-500 text-center">
          <strong className="text-amber-700 capitalize">{pendingMentionUser?.name}</strong> has no access to this mail.
        </div>
        <p className="text-center pb-4"> Do you want to assign this mail to <strong className="text-amber-700 capitalize">{pendingMentionUser?.name}</strong>?</p>
      </ConfirmDialog>
    </div>
  );
}
