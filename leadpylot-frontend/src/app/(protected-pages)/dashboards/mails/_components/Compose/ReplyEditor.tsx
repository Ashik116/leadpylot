'use client';

import { useState } from 'react';
import { EmailConversation } from '../../_types/email.types';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import TemplateEditor from '../CannedResponses/TemplateEditor';
import PreviewDialogContent from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/PreviewDialogContent';
import { ReplyTemplateAndOffersSelector } from './components/ReplyTemplateAndOffersSelector';
import { ReplyEditorActionBar } from './components/ReplyEditorActionBar';
import { TemplateSelectorPopover } from './components/TemplateSelectorPopover';
import { useReplyEditor } from './hooks/useReplyEditor';

interface ReplyEditorProps {
  conversation: EmailConversation;
  isExpanded?: boolean;
  onToggle?: () => void;
  specificParentEmailId?: string | null;
  prefetchedDraft?: any | null;
  skipFetch?: boolean;
  setExpandedSection?: (section: 'tasks' | 'comments' | 'reply' | null) => void;
  replyAll?: boolean;
}

export default function ReplyEditor({
  conversation,
  isExpanded: controlledExpanded,
  onToggle,
  specificParentEmailId,
  prefetchedDraft,
  setExpandedSection,
  replyAll = true,
}: ReplyEditorProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const editor = useReplyEditor({
    conversation,
    isExpanded,
    onToggle,
    setInternalExpanded,
    specificParentEmailId,
    prefetchedDraft,
    setExpandedSection,
  });

  const {
    replyText,
    replyHtml,
    showTemplateSelector,
    setShowTemplateSelector,
    attachmentIds,
    existingAttachments,
    draftId,
    isSavingDraft,
    selectedTemplateId,
    selectedOffers,
    setSelectedOffers,
    templatesLoading,
    emailTemplates,
    activeLeadOffers,
    effectiveLeadId,
    showDraftOfferControls,
    selectedTemplateLabel,
    preventBlurRef,
    templateSelectorRef,
    handleTemplateSelectorChange,
    handleReplyClick,
    handleSaveDraft,
    handleSend,
    handleDeleteDraft,
    handleAttachmentChange,
    handleReplyContentChange,
    editorRefCallback,
    getEditorContent,
    hasContent,
    handleCancel,
    handleTemplateSelectFromButton,
    deleteDraftMutation,
    isReplying,
  } = editor;

  return (
    <div className="rounded-b-2xl bg-white">
      {!isExpanded ? (
        <div className="flex gap-2 py-1">
          <Button
            size="xs"
            onClick={() => handleReplyClick('reply')}
            icon={<ApolloIcon name="reply" />}
          >
            Reply
          </Button>
          {replyAll && (
            <Button
              size="xs"
              onClick={() => handleReplyClick('reply_all')}
              icon={<ApolloIcon name="email-check" />}
            >
              Reply All
            </Button>
          )}
        </div>
      ) : (
        <div className="p-1">
          {showDraftOfferControls && (
            <ReplyTemplateAndOffersSelector
              leadId={effectiveLeadId}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={handleTemplateSelectorChange}
              templatesLoading={templatesLoading}
              emailTemplates={emailTemplates}
              selectedOffers={selectedOffers}
              onOffersChange={setSelectedOffers}
              offers={activeLeadOffers}
            />
          )}

          <div className="relative" ref={templateSelectorRef}>
            {showTemplateSelector && !showDraftOfferControls && (
              <TemplateSelectorPopover
                isOpen={showTemplateSelector}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={handleTemplateSelectFromButton}
                onClose={() => setShowTemplateSelector(false)}
                onClear={() => handleTemplateSelectFromButton(null)}
                templatesLoading={templatesLoading}
                emailTemplates={emailTemplates}
                position="overlay"
              />
            )}
            <div>
              <PreviewDialogContent
                content={replyHtml || replyText}
                onContentChange={handleReplyContentChange}
                onClose={() => {}}
                editorRefCallback={editorRefCallback}
              />
            </div>
          </div>

          <ReplyEditorActionBar
            attachmentIds={attachmentIds}
            existingAttachments={existingAttachments}
            onAttachmentChange={handleAttachmentChange}
            isSavingDraft={isSavingDraft}
            isReplying={isReplying}
            hasLead={Boolean(conversation?.lead_id)}
            showTemplateSelector={showTemplateSelector}
            onToggleTemplateSelector={() => setShowTemplateSelector((prev: boolean) => !prev)}
            selectedTemplateLabel={selectedTemplateLabel}
            draftId={draftId}
            onDeleteDraft={handleDeleteDraft}
            isDeletingDraft={deleteDraftMutation.isPending}
            hasContent={hasContent}
            onSaveDraft={() => handleSaveDraft(getEditorContent())}
            onCancel={handleCancel}
            onSend={() => handleSend(getEditorContent())}
            preventBlurRef={preventBlurRef}
          />

          <div className="text-[0.698775rem] text-gray-500">
            <kbd className="rounded bg-gray-100 px-1">Ctrl</kbd> +{' '}
            <kbd className="rounded bg-gray-100 px-1">Enter</kbd> to send
          </div>
        </div>
      )}

      {showTemplateEditor && (
        <TemplateEditor
          onClose={() => setShowTemplateEditor(false)}
          onSave={() => setShowTemplateEditor(false)}
        />
      )}
    </div>
  );
}
