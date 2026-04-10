import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { LeadWithOffers, hasActiveOffers } from '../utils/leadUtils';
import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';

interface ComposeModalFooterProps {
  isUploadingFiles: boolean;
  onAttachClick: () => void;
  onSaveDraft: () => void;
  isSavingDraft: boolean;
  canSaveDraft: boolean;
  onCancel: () => void;
  onSend: () => void;
  isSendingEmail: boolean;
  canSend: boolean;
}

export const ComposeModalFooter = ({
  isUploadingFiles,
  onAttachClick,
  onSaveDraft,
  isSavingDraft,
  canSaveDraft,
  onCancel,
  onSend,
  isSendingEmail,
  canSend,
}: ComposeModalFooterProps) => {
  return (
    <div className="sticky bottom-0 z-10 flex justify-between gap-2 border-t border-gray-200 pt-2">
      <div className="flex items-center justify-between pb-1">
        <Button
          variant="default"
          size="sm"
          onClick={onAttachClick}
          icon={<ApolloIcon name="cloud-upload" />}
          loading={isUploadingFiles}
          disabled={isUploadingFiles}
        >
          {isUploadingFiles ? 'Uploading...' : 'Add File'}
        </Button>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="success"
          onClick={onSaveDraft}
          loading={isSavingDraft}
          disabled={!canSaveDraft}
        >
          Draft
        </Button>
        <Button size="sm" variant="plain" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="solid"
          onClick={onSend}
          loading={isSendingEmail}
          disabled={!canSend}
          icon={<ApolloIcon name="mail" />}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

