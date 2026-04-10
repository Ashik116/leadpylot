'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import CommentAttachmentUpload from '../../InternalComments/CommentAttachmentUpload';
import type { AttachmentMeta } from '../hooks/useReplyEditor';

interface ReplyEditorActionBarProps {
  attachmentIds: string[];
  existingAttachments: AttachmentMeta[];
  onAttachmentChange: (ids: string[]) => void;
  isSavingDraft: boolean;
  isReplying: boolean;
  hasLead: boolean;
  showTemplateSelector: boolean;
  onToggleTemplateSelector: () => void;
  selectedTemplateLabel: string;
  draftId: string | null;
  onDeleteDraft: () => void;
  isDeletingDraft: boolean;
  hasContent: boolean;
  onSaveDraft: () => void;
  onCancel: () => void;
  onSend: () => void;
  preventBlurRef: React.MutableRefObject<boolean>;
}

export function ReplyEditorActionBar({
  attachmentIds,
  existingAttachments,
  onAttachmentChange,
  isSavingDraft,
  isReplying,
  hasLead,
  showTemplateSelector,
  onToggleTemplateSelector,
  selectedTemplateLabel,
  draftId,
  onDeleteDraft,
  isDeletingDraft,
  hasContent,
  onSaveDraft,
  onCancel,
  onSend,
  preventBlurRef,
}: ReplyEditorActionBarProps) {
  const preventBlur = () => {
    preventBlurRef.current = true;
  };

  return (
    <div className="mt-1 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CommentAttachmentUpload
          value={attachmentIds}
          onChange={onAttachmentChange}
          disabled={isSavingDraft || isReplying}
          maxFileSize={4 * 1024 * 1024}
          existingAttachments={existingAttachments}
        />
        <Button
          size="sm"
          variant="plain"
          disabled={!hasLead}
          onMouseDown={(e) => {
            e.preventDefault();
            preventBlur();
          }}
          onClick={onToggleTemplateSelector}
          icon={<ApolloIcon name="file" />}
          className={showTemplateSelector ? 'text-blue-600' : undefined}
        >
          <span className="flex max-w-[220px] items-center gap-1">
            <span>Templates</span>
            {selectedTemplateLabel && (
              <span className="truncate text-xs text-slate-500">({selectedTemplateLabel})</span>
            )}
          </span>
        </Button>
      </div>

      <div className="flex gap-1">
        {draftId && (
          <Button
            size="sm"
            variant="plain"
            className="text-red-600 hover:text-red-700"
            onMouseDown={(e) => {
              e.preventDefault();
              preventBlur();
            }}
            onClick={onDeleteDraft}
            disabled={isDeletingDraft}
            loading={isDeletingDraft}
            icon={<ApolloIcon name="trash" />}
          >
            Delete Draft
          </Button>
        )}
        <Button
          size="sm"
          variant="plain"
          onMouseDown={(e) => {
            e.preventDefault();
            preventBlur();
          }}
          onClick={onSaveDraft}
          disabled={!hasContent || isSavingDraft}
          loading={isSavingDraft}
          icon={<ApolloIcon name="file" />}
        >
          {isSavingDraft ? 'Saving...' : 'Draft'}
        </Button>

        <Button
          size="sm"
          variant="plain"
          onMouseDown={(e) => {
            e.preventDefault();
            preventBlur();
          }}
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          size="sm"
          variant="solid"
          onMouseDown={(e) => {
            e.preventDefault();
            preventBlur();
          }}
          onClick={onSend}
          disabled={!hasContent || isReplying}
          loading={isReplying}
          icon={<ApolloIcon name="share" />}
        >
          {isReplying ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
