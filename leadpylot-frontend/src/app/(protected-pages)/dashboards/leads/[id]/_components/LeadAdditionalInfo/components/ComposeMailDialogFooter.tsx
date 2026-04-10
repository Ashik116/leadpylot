'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ScheduleSendModal, ScheduleSendData } from './ScheduleSendModal';

interface ComposeMailDialogFooterProps {
  onAttachClick?: () => void;
  isUploadingAttachments?: boolean;
  onSaveDraft: () => void;
  isSavingDraft: boolean;
  canSaveDraft: boolean;
  onClose: () => void;
  onSend: () => void;
  onScheduleSend?: (data: ScheduleSendData) => void;
  isSendingEmail: boolean;
  canSend: boolean;
}

const splitSendButtonClasses = {
  main: 'flex items-center gap-2 bg-[#1a73e8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-60 h-8',
  arrow:
    'flex items-center justify-center border-l border-[#1a73e8]/50 bg-[#4285f4] px-3 py-2 text-white transition-colors hover:bg-[#3367d6] disabled:cursor-not-allowed disabled:opacity-60',
};

export const ComposeMailDialogFooter = ({
  onAttachClick,
  isUploadingAttachments,
  onSaveDraft,
  isSavingDraft,
  canSaveDraft,
  onClose,
  onSend,
  onScheduleSend,
  isSendingEmail,
  canSend,
}: ComposeMailDialogFooterProps) => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const handleScheduleSend = (data: ScheduleSendData) => {
    onScheduleSend?.(data);
  };

  const renderSplitSendButton = (className = '') => (
    <div className={`inline-flex overflow-hidden rounded-full ${className}`}>
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend || isSendingEmail}
        className={splitSendButtonClasses.main}
      >
        {isSendingEmail ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          'Send'
        )}
      </button>
      <button
        type="button"
        onClick={() => setIsScheduleModalOpen(true)}
        disabled={!canSend || isSendingEmail}
        title="Schedule send"
        className={splitSendButtonClasses.arrow}
      >
        <ApolloIcon name="chevron-arrow-down" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-gray-200 bg-white">
      {/* Mobile: Stacked - left group (clip, Discard, Send), right (Draft) */}
      <div className="flex flex-col gap-1.5 p-2 sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {renderSplitSendButton('flex-1')}
            <Button
              variant="plain"
              size="sm"
              onClick={onAttachClick}
              loading={isUploadingAttachments}
              disabled={isUploadingAttachments}
              title="Attach files"
              icon={<ApolloIcon name="paperclip" className="text-base" />}
            />
            <Button variant="plain" size="sm" onClick={onClose} className="flex-1">
              Discard
            </Button>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={onSaveDraft}
            loading={isSavingDraft}
            disabled={!canSaveDraft}
          >
            Draft
          </Button>
        </div>
      </div>

      {/* Tablet & Desktop: Left (clip, Discard, Send) | Right (Draft) */}
      <div className="hidden items-center justify-between gap-2 px-2 py-2 sm:flex md:px-3">
        <div className="flex items-center gap-2">
          {renderSplitSendButton()}
          <Button
            variant="plain"
            size="sm"
            onClick={onAttachClick}
            loading={isUploadingAttachments}
            disabled={isUploadingAttachments}
            title="Attach files"
            icon={<ApolloIcon name="paperclip" className="text-base" />}
          />
          <Button variant="plain" size="sm" onClick={onClose}>
            Discard
          </Button>
        </div>
        <Button
          variant="success"
          size="sm"
          onClick={onSaveDraft}
          loading={isSavingDraft}
          disabled={!canSaveDraft}
        >
          Draft
        </Button>
      </div>

      <ScheduleSendModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleScheduleSend}
        isScheduling={isSendingEmail}
      />
    </div>
  );
};
