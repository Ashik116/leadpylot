'use client';

import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import type { OfferApiResponse } from '@/services/LeadsService';
import { TLead } from '@/services/LeadsService';
import { apiGetEmailTemplate } from '@/services/SettingsService';
import { useSaveDraftToMailServer } from '@/services/hooks/useEmailSystem';
import { useProject } from '@/services/hooks/useProjects';
import { useMailServers } from '@/services/hooks/useSettings';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { inlineTableStyles } from '@/utils/emailHtmlUtils';
import useNotification from '@/utils/hooks/useNotification';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LEAD_TABLE_NAMES } from '../v2/LeadDetailsBulkActionsContext';
import { ComposeMailDialogFooter } from './components/ComposeMailDialogFooter';
import { ComposeMailDialogHeader } from './components/ComposeMailDialogHeader';
import { EmailAttachmentsSection } from './components/EmailAttachmentsSection';
import { EmailCompositionForm } from './components/EmailCompositionForm';
import { OrderedOffer } from './components/OffersSelector';
import PreviewDialogContent from './components/PreviewDialogContent';
import { ScheduleSendData } from './components/ScheduleSendModal';
import { useComposeMail } from './hooks/useComposeMail';
import { useContractFilesFromAttachments } from './hooks/useContractFilesFromAttachments';
import { useEmailAttachments } from './hooks/useEmailAttachments';
import { useMaxOffersEnforcement } from './hooks/useMaxOffersEnforcement';
import { extractDocumentAttachmentIds, extractFileAttachments } from './utils/attachmentUtils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { chatbotSendMailStore } from '@/stores/chatbotSendMailStore';

interface ComposeMailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  agentId?: string;
  leadId?: string;
  recipientEmail?: string;
  recipientName?: string;
  closeButton?: boolean;
  isMobile?: boolean;
  lead?: TLead;
}

const ComposeMailDialog = ({
  isOpen,
  onClose,
  projectId,
  agentId,
  leadId,
  recipientEmail,
  closeButton = true,
  lead,
}: ComposeMailDialogProps) => {
  const { isOpen: isOpenMail } = chatbotSendMailStore();
  const [selectedMailServer, setSelectedMailServer] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<OrderedOffer[]>([]);
  const { user } = useAuth();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId ?? '', !!projectId);
  const { data: mailServersRaw, isLoading: isLoadingServers } = useMailServers();
  const servers = useMemo(() => {
    const list = Array.isArray(mailServersRaw) ? mailServersRaw : (mailServersRaw as any)?.data ?? [];
    return { data: list };
  }, [mailServersRaw]);
  const emailTemplates = useMemo(
    () => ({ data: project?.email_templates ?? [] }),
    [project?.email_templates]
  );
  const templatesLoading = isProjectLoading;
  const queryClient = useQueryClient();

  const selectedFromStore = useSelectedItemsStore(
    useShallow((s) =>
      s.getCurrentPage() === LEAD_TABLE_NAMES.OFFERS
        ? s.getSelectedItems(LEAD_TABLE_NAMES.OFFERS)
        : []
    )
  );

  const activeOfferIds = useMemo(
    () =>
      new Set(
        (lead?.offers ?? [])
          .filter((o: { active?: boolean }) => o?.active === true)
          .map((o: { _id?: string }) => o._id)
      ),
    [lead?.offers]
  );
  const { sendProjectEmail, isSendingEmail } = useNotification();
  const saveDraftMutation = useSaveDraftToMailServer();

  const {
    subject,
    setSubject,
    content,
    previewContent,
    selectedTemplateId,
    onUpdateText,
    handleTemplateChange,
    setOfferIds,
    reset: resetComposeMail,
  } = useComposeMail(leadId);

  const {
    attachments,
    fileInputRef,
    isLoadingAttachments,
    isUploadingLibrary,
    leadAttachmentsData,
    handleFileUpload,
    handleDocumentSelect,
    handleRemoveAttachment,
    handleAttachClick,
    reset: resetAttachments,
    formatFileSize,
    addAttachments,
    removeAttachmentsByIds,
  } = useEmailAttachments(leadId);

  const handleClose = () => {
    resetComposeMail();
    resetAttachments();
    setSelectedMailServer('');
    setSelectedOffers([]);
    setShowPreview(false);
    onClose();
  };

  // Auto-select first mail server when available (defer to avoid cascading render)
  useEffect(() => {
    if (!isOpen) return;
    const list = servers.data ?? [];
    if (list.length > 0 && !selectedMailServer) {
      queueMicrotask(() => setSelectedMailServer(list[0]._id));
    }
  }, [isOpen, servers.data, selectedMailServer]);

  // Auto-select first template (prefetch so Send button enables immediately)
  useEffect(() => {
    if (!isOpen || isOpenMail) return;
    const templates = project?.email_templates ?? [];
    if (templates.length === 0 || selectedTemplateId) return;
    const id = templates[0]._id;
    void queryClient.prefetchQuery({
      queryKey: ['email-template', id],
      queryFn: async () => {
        const res = await apiGetEmailTemplate(id);
        return (res as any)?.template ?? res;
      },
    }).then(() => handleTemplateChange(id));
  }, [isOpen, isOpenMail, project?.email_templates, selectedTemplateId, handleTemplateChange, queryClient]);

  // Sync offers from store to selectedOffers whenever table selection changes (real-time sync)
  useEffect(() => {
    if (!isOpen) return;
    if (selectedFromStore.length === 0) {
      queueMicrotask(() => setSelectedOffers([]));
      return;
    }
    const ordered: OrderedOffer[] = selectedFromStore
      .filter((item) => activeOfferIds.has(item._id))
      .map((item, i) => ({ id: item._id, order: i + 1, offer: item as OfferApiResponse }));

    if (ordered.length === 0) return;

    const templates = project?.email_templates ?? [];
    const template =
      templates.find((t: { _id: string }) => t._id === selectedTemplateId) ?? templates[0];
    const howMany = (template as any)?.how_many_offers ?? (template as any)?.info?.how_many_offers;
    const maxOffers =
      howMany !== undefined && howMany !== null
        ? typeof howMany === 'number'
          ? howMany
          : parseInt(String(howMany), 10)
        : undefined;

    const limited =
      maxOffers !== undefined && maxOffers > 0 ? ordered.slice(0, maxOffers) : ordered;
    queueMicrotask(() => setSelectedOffers(limited));
  }, [
    isOpen,
    selectedFromStore,
    activeOfferIds,
    selectedTemplateId,
    project?.email_templates,
  ]);

  // Sync selected offers with useComposeMail hook
  useEffect(() => {
    const ids = selectedOffers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((offer) => offer.id);
    setOfferIds(ids);
  }, [selectedOffers, setOfferIds]);

  // Enforce max offers limit when template changes
  useMaxOffersEnforcement({
    selectedTemplateId,
    emailTemplates,
    selectedOffers,
    setSelectedOffers,
  });

  // Auto-select contract files when offers are selected; remove when deselected
  useContractFilesFromAttachments({
    selectedOffers,
    leadAttachmentsData,
    addAttachments,
    removeAttachmentsByIds,
    formatFileSize,
  });

  const handleSend = async ({ scheduled_at }: ScheduleSendData) => {
    if (!projectId || !agentId || !leadId) {
      toast.push(
        <Notification title="Error" type="danger">
          Missing required parameters: projectId, agentId, or leadId
        </Notification>
      );
      return;
    }

    if (!subject || (!content && !previewContent)) {
      toast.push(
        <Notification title="Error" type="danger">
          Missing required email content: subject or content
        </Notification>
      );
      return;
    }

    try {
      const attachmentIds = extractDocumentAttachmentIds(attachments);
      const attachmentFiles = extractFileAttachments(attachments);
      const offerIds = selectedOffers.sort((a, b) => a.order - b.order).map((offer) => offer.id);
      const htmlBody = previewContent || content || '';

      const emailData = {
        project_id: projectId,
        agent_id: agentId,
        lead_id: leadId,
        subject,
        html: htmlBody,
        to: recipientEmail || lead?.email_from || undefined,
        mailserver_id: user?.role === Role.ADMIN ? selectedMailServer : undefined,
        offer_ids: offerIds.length > 0 ? offerIds : undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
        ...(scheduled_at && { scheduled_at }),
      };

      await sendProjectEmail(emailData);

      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['infinite-emails-for-lead', leadId] });
        queryClient.invalidateQueries({ queryKey: ['lead-last-email', leadId] });
      }

      handleClose();
    } catch (error) {
      // Error is already handled by sendProjectEmail notification
      // eslint-disable-next-line no-console
      console.error('Failed to send email:', error);
    }
  };

  const handlePreviewToggle = () => {
    setShowPreview((prev) => !prev);
  };

  const handleSaveDraft = async () => {
    const recipient = recipientEmail || lead?.email_from || '';

    if (!recipient) {
      toast.push(
        <Notification title="Error" type="danger">
          Recipient email is required to save draft
        </Notification>
      );
      return;
    }

    if (!selectedMailServer) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select a mail server
        </Notification>
      );
      return;
    }

    try {
      const attachmentIds = extractDocumentAttachmentIds(attachments);
      const htmlBody = inlineTableStyles(previewContent || content || '');

      const draftData = {
        to: recipient,
        subject: subject || '(No Subject)',
        html_body: htmlBody,
        body: htmlBody,
        mailserver_id: selectedMailServer,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        offer_ids: selectedOffers.map((offer) => offer.id),
        email_template_id: selectedTemplateId,
        lead_id: leadId,
      };

      await saveDraftMutation.mutateAsync(draftData);
    } catch {
      // Error is already handled by the mutation hook
    }
  };

  // Validation helpers
  const canSaveDraft = useMemo(
    () => !!selectedMailServer && (!!subject || !!content),
    [selectedMailServer, subject, content]
  );

  const canSend = useMemo(
    () =>
      !!projectId &&
      !!agentId &&
      !!leadId &&
      !!selectedMailServer &&
      (!!selectedTemplateId || (!!subject && (!!content || !!previewContent))) &&
      !isSendingEmail,
    [projectId, agentId, leadId, selectedMailServer, selectedTemplateId, subject, content, previewContent, isSendingEmail]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="flex flex-1 flex-col h-[85vh] lg:h-[86vh] overflow-y-auto">
        <ComposeMailDialogHeader
          closeButton={closeButton}
          onClose={handleClose}
          selectedMailServer={selectedMailServer}
          onMailServerChange={setSelectedMailServer}
          isLoadingServers={isLoadingServers}
          servers={servers}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={handleTemplateChange}
          templatesLoading={templatesLoading}
          emailTemplates={emailTemplates}
          leadId={leadId}
          selectedOffers={selectedOffers}
          onOffersChange={setSelectedOffers}
          lead={lead}
        />

        {/* Main Content Section - Responsive scrolling */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-2 md:gap-2 md:px-3 md:py-2 text-xs">
          <EmailCompositionForm
            subject={subject}
            onSubjectChange={setSubject}
            content={content}
            onContentChange={onUpdateText}
            selectedTemplateId={selectedTemplateId}
            showPreview={showPreview}
            onPreviewToggle={handlePreviewToggle}
          />
          <PreviewDialogContent
            content={previewContent}
            onContentChange={onUpdateText}
            onClose={handlePreviewToggle}
          />
          <EmailAttachmentsSection
            attachments={attachments}
            isLoadingAttachments={isLoadingAttachments}
            leadAttachmentsData={leadAttachmentsData}
            formatFileSize={formatFileSize}
            onDocumentSelect={handleDocumentSelect}
            onRemoveAttachment={handleRemoveAttachment}
            onAttachClick={handleAttachClick}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
          />
        </div>

        <ComposeMailDialogFooter
          onAttachClick={handleAttachClick}
          isUploadingAttachments={isUploadingLibrary}
          onSaveDraft={handleSaveDraft}
          isSavingDraft={saveDraftMutation.isPending}
          canSaveDraft={canSaveDraft}
          onClose={handleClose}
          onSend={() => handleSend({})}
          onScheduleSend={(data) => handleSend(data)}

          isSendingEmail={isSendingEmail}
          canSend={canSend}
        />
      </div>

      {/* Preview Dialog - Responsive */}
      {/* <Dialog
        width={1100}
        isOpen={showPreview}
        onClose={handlePreviewToggle}
        className="p-2 sm:p-3 md:p-4"
      >
        <PreviewDialogContent
          content={previewContent}
          onContentChange={onUpdateText}
          onClose={handlePreviewToggle}
        />
      </Dialog> */}
    </>
  );
};

export default ComposeMailDialog;
