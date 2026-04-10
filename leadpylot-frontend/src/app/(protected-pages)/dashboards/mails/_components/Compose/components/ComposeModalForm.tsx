import Input from '@/components/ui/Input';
import PreviewDialogContent from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/PreviewDialogContent';
import { EmailAttachmentsSection } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/EmailAttachmentsSection';
import { Attachment } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useEmailAttachments';
import { LeadWithOffers, hasActiveOffers } from '../utils/leadUtils';
import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';

interface ComposeModalFormProps {
  to: string;
  onToChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  selectedTemplateId: string;
  previewContent: string;
  onContentChange: (html: string) => void;
  selectedLead: LeadWithOffers | null;
  selectedOffers: OrderedOffer[];
  attachments: Attachment[];
  isLoadingAttachments: boolean;
  leadAttachmentsData: any;
  formatFileSize: (size: number) => string;
  onDocumentSelect: (documentId: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onAttachClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ComposeModalForm = ({
  to,
  onToChange,
  subject,
  onSubjectChange,
  selectedTemplateId,
  previewContent,
  onContentChange,
  selectedLead,
  selectedOffers,
  attachments,
  isLoadingAttachments,
  leadAttachmentsData,
  formatFileSize,
  onDocumentSelect,
  onRemoveAttachment,
  onAttachClick,
  fileInputRef,
  onFileUpload,
}: ComposeModalFormProps) => {
  const leadHasOffers = hasActiveOffers(selectedLead);
  const canShowPreview =
    !!selectedTemplateId &&
    (leadHasOffers ? selectedOffers.length > 0 : true) &&
    !!previewContent &&
    previewContent.trim().length > 0;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto  m-0 p-0 py-3">
      {/* To */}
      <div>
        <label className="mb-1 block text-[0.8152375rem] font-medium text-gray-700">To</label>
        <Input
          type="email"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="recipient@example.com"
        />
      </div>

      {/* Subject */}
      <div>
        <label className="mb-1 block text-[0.8152375rem] font-medium text-gray-700">Subject</label>
        <Input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={
            selectedTemplateId ? 'Subject automatically uses template name' : 'Email subject'
          }
        />
      </div>

      {/* Message Editor - same as ComposeMailDialog */}
      <div>
        {selectedTemplateId && !canShowPreview && (
          <div className="mb-2 text-xs text-gray-500">
            {leadHasOffers && selectedOffers.length === 0
              ? 'Select at least one offer to see preview'
              : 'Loading preview...'}
          </div>
        )}
        <PreviewDialogContent
          content={previewContent}
          onContentChange={onContentChange}
          onClose={() => {}}
        />
      </div>

      {/* Email Attachments Section */}
      <EmailAttachmentsSection
        attachments={attachments}
        isLoadingAttachments={isLoadingAttachments}
        leadAttachmentsData={selectedLead ? leadAttachmentsData : undefined}
        formatFileSize={formatFileSize}
        onDocumentSelect={onDocumentSelect}
        onRemoveAttachment={onRemoveAttachment}
        onAttachClick={onAttachClick}
        fileInputRef={fileInputRef}
        onFileUpload={onFileUpload}
      />
    </div>
  );
};

