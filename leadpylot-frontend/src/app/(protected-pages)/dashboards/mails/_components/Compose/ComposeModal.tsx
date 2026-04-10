'use client';

/**
 * ComposeModal - Missive-Style
 * Modal for composing new emails with lead integration, templates, offers, and draft save
 */

import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';
import { useComposeMail } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useComposeMail';
import { useEmailAttachments } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useEmailAttachments';
import Dialog from '@/components/ui/Dialog';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import { Lead } from '@/services/LeadsService';
import { useSaveDraftToMailServer } from '@/services/hooks/useEmailSystem';
import { useProject } from '@/services/hooks/useProjects';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import useNotification from '@/utils/hooks/useNotification';
import { useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelectedMailServerDisplay } from '../../_hooks';
import { useLeadSearch } from '../../_hooks/useLeadSearch';
import { ComposeModalFooter } from './components/ComposeModalFooter';
import { ComposeModalForm } from './components/ComposeModalForm';
import { ComposeModalHeader } from './components/ComposeModalHeader';
import { useContractFiles } from './hooks/useContractFiles';
import { extractAttachmentIds } from './utils/attachmentUtils';
import { createAttachmentsFromFiles, uploadFilesToLibrary } from './utils/fileUploadUtils';
import { LeadWithOffers, getAgentId, getProjectId, hasActiveOffers } from './utils/leadUtils';




interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  // Mail server for admin and Agent
  const { servers: adminServers } = useSelectedMailServerDisplay();
  const { allProjects } = useSelectedProjectStore();
  const { data: session } = useSession();
  const [to, setTo] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadWithOffers | null>(null);
  const [selectedMailServer, setSelectedMailServer] = useState<string>('');
  const [selectedOffers, setSelectedOffers] = useState<OrderedOffer[]>([]);
  const [editorHtmlContent, setEditorHtmlContent] = useState<string>('');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  console.log({ adminServers })
  // Lead search hook
  const { searchTerm, setSearchTerm, debouncedSearchTerm, leads, isLoading, hasResults } =
    useLeadSearch({
      initialSearchTerm: '',
      debounceMs: 500,
      minSearchLength: 2,
      limit: 10,
    });

  // Project-specific mail servers and email templates (from lead's assigned project)
  const projectId = getProjectId(selectedLead);
  const { data: project, isLoading: isProjectLoading } = useProject(projectId, !!projectId);
  // const servers = useMemo(
  //   () => ({ data: project?.mailservers ?? [] }),
  //   [project?.mailservers]
  // );
  const emailTemplates = useMemo(
    () => ({ data: project?.email_templates ?? [] }),
    [project?.email_templates]
  );
  const isLoadingServers = isProjectLoading;
  const templatesLoading = isProjectLoading;

  // get the Mail server from agent view
  const currentUserId = session?.user?.id ?? (session?.user as any)?._id;
  const AgentServers = (allProjects || []).reduce((acc: any[], project: any) => {
    const agent = project?.agents?.find(
      (a: any) => a?.user?.id === currentUserId || a?.user?._id === currentUserId
    );

    if (agent?.mailservers?.length) {
      acc.push(...agent.mailservers);
    }

    return acc;
  }, []);
  const isAdmin = session?.user?.role === Role.ADMIN;


  // Compose mail hook
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
  } = useComposeMail(selectedLead?._id);
  // Email attachments hook
  const {
    attachments,
    fileInputRef,
    isLoadingAttachments,
    leadAttachmentsData,
    handleDocumentSelect,
    handleRemoveAttachment,
    handleAttachClick,
    addAttachment,
    addAttachments,
    reset: resetAttachments,
    formatFileSize,
  } = useEmailAttachments(selectedLead?._id);

  // Draft save mutation
  const saveDraftMutation = useSaveDraftToMailServer();

  // Email sending
  const { sendProjectEmail, isSendingEmail } = useNotification();
  const queryClient = useQueryClient();

  // Extract lead data using utility functions
  const agentId = getAgentId(selectedLead);
  const leadId = selectedLead?._id || '';
  const leadHasOffers = hasActiveOffers(selectedLead);

  // Sync selected offers with useComposeMail hook
  useEffect(() => {
    const ids = selectedOffers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((offer) => offer.id);
    setOfferIds(ids);
  }, [selectedOffers, setOfferIds]);

  // Auto-select contract files when offers are selected
  useContractFiles({
    selectedOffers,
    selectedLead,
    addAttachments,
    formatFileSize,
  });

  // Stable callback for PreviewDialogContent — avoids creating a new function
  // reference every render which would retrigger its internal useEffect.
  const handleEditorContentChange = useCallback(
    (html: string) => {
      onUpdateText(html);
      setEditorHtmlContent(html);
    },
    [onUpdateText]
  );

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead as unknown as LeadWithOffers);
    // Populate "To" field with lead's email
    if (lead.email_from) {
      setTo(lead.email_from);
    }
    // Clear search after selection
    setSearchTerm('');
  };

  const handleClearLead = () => {
    setSelectedLead(null);
    setTo('');
    setSelectedOffers([]);
  };

  const handleFileUploadImmediate = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const files = Array.from(e.target.files);
      const { documentIds, error } = await uploadFilesToLibrary(files);

      if (error) {
        toast.push(
          <Notification title="Error" type="danger">
            {error}
          </Notification>,

        );
        return;
      }

      // Create attachments from files and document IDs
      const attachmentsToAdd = createAttachmentsFromFiles(files, documentIds, formatFileSize);

      // Add all attachments
      attachmentsToAdd.forEach((attachment) => {
        addAttachment(attachment);
      });

      // Show success notification
      if (documentIds.length > 0) {
        toast.push(
          <Notification title="Success" type="success">
            {documentIds.length === 1
              ? 'File uploaded successfully'
              : `${documentIds.length} files uploaded successfully`}
          </Notification>
        );
      }
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to upload files'}
        </Notification>,

      );
    } finally {
      setIsUploadingFiles(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    resetComposeMail();
    resetAttachments();
    setSelectedMailServer('');
    setSelectedOffers([]);
    setTo('');
    setSelectedLead(null);
    setSearchTerm('');
    setEditorHtmlContent('');
    onClose();
  };

  const handleSaveDraft = async () => {
    const recipient = selectedLead?.email_from || to;

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
      const htmlBody = editorHtmlContent || previewContent || content || '';
      const attachmentIds = extractAttachmentIds(attachments);

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
      handleClose();
    } catch (error) {
      // Error is already handled by the mutation hook
      // eslint-disable-next-line no-console
      console.error('Error saving draft:', error);
    }
  };

  const handleSend = async () => {
    if (!projectId || !agentId || !leadId) {
      toast.push(
        <Notification title="Error" type="danger">
          Missing required parameters: projectId, agentId, or leadId. Please select a lead.
        </Notification>
      );
      return;
    }

    if (!subject || !content) {
      toast.push(
        <Notification title="Error" type="danger">
          Missing required email content: subject or content
        </Notification>
      );
      return;
    }

    try {
      const attachmentIds = extractAttachmentIds(attachments);
      const offerIds = selectedOffers.sort((a, b) => a.order - b.order).map((offer) => offer.id);

      const emailData = {
        project_id: projectId,
        agent_id: agentId,
        lead_id: leadId,
        subject,
        html: previewContent || content,
        mailserver_id: selectedMailServer,
        offer_ids: offerIds.length > 0 ? offerIds : undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      await sendProjectEmail(emailData);

      // Invalidate email queries for the lead
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['infinite-emails-for-lead', leadId] });
      }

      handleClose();
    } catch (error) {
      // Error is already handled by sendProjectEmail notification
      // eslint-disable-next-line no-console
      console.error('Failed to send email:', error);
    }
  };

  // Validation helpers
  const canSaveDraft = useMemo(
    () => !!selectedMailServer && (!!subject || !!content),
    [selectedMailServer, subject, content]
  );

  const canSend = useMemo(
    () =>
      !!to &&
      !!subject &&
      !!content &&
      !!selectedTemplateId &&
      (!leadHasOffers || selectedOffers.length > 0) &&
      !!selectedLead &&
      !!projectId &&
      !!agentId &&
      !isSendingEmail,
    [
      to,
      subject,
      content,
      selectedTemplateId,
      leadHasOffers,
      selectedOffers.length,
      selectedLead,
      projectId,
      agentId,
      isSendingEmail,
    ]
  );

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={1200} >
      <div className="flex h-[85vh] flex-col p-1 m-0 overflow-y-auto">
        <ComposeModalHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          leads={leads}
          isLoading={isLoading}
          hasResults={hasResults}
          selectedLead={selectedLead}
          onSelectLead={handleLeadSelect}
          onClearLead={handleClearLead}
          selectedMailServer={selectedMailServer}
          onMailServerChange={setSelectedMailServer}
          isLoadingServers={isLoadingServers}
          servers={isAdmin ? adminServers : AgentServers}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={handleTemplateChange}
          templatesLoading={templatesLoading}
          emailTemplates={emailTemplates}
          selectedOffers={selectedOffers}
          onOffersChange={setSelectedOffers}
        />

        <ComposeModalForm
          to={to}
          onToChange={setTo}
          subject={subject}
          onSubjectChange={setSubject}
          selectedTemplateId={selectedTemplateId}
          previewContent={previewContent}
          onContentChange={handleEditorContentChange}
          selectedLead={selectedLead}
          selectedOffers={selectedOffers}
          attachments={attachments}
          isLoadingAttachments={isLoadingAttachments}
          leadAttachmentsData={leadAttachmentsData}
          formatFileSize={formatFileSize}
          onDocumentSelect={handleDocumentSelect}
          onRemoveAttachment={handleRemoveAttachment}
          onAttachClick={handleAttachClick}
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUploadImmediate}
        />

        <ComposeModalFooter
          isUploadingFiles={isUploadingFiles}
          onAttachClick={handleAttachClick}
          onSaveDraft={handleSaveDraft}
          isSavingDraft={saveDraftMutation.isPending}
          canSaveDraft={canSaveDraft}
          onCancel={handleClose}
          onSend={handleSend}
          isSendingEmail={isSendingEmail}
          canSend={canSend}
        />
      </div>
    </Dialog>
  );
}
