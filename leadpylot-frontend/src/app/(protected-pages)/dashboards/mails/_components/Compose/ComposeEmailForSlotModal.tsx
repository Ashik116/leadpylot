'use client';

/**
 * ComposeEmailForSlotModal - Compose email from a document slot's pinned email
 * Pre-fills To, Subject, Body from the slot. Template dropdown refills body when selected.
 */

import { EmailTemplateSelector } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/EmailTemplateSelector';
import { useComposeMail } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useComposeMail';
import RichTextEditor from '@/components/shared/RichTextEditor';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Opening } from '@/services/OpeningsService';
import useNotification from '@/utils/hooks/useNotification';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/services/hooks/useProjects';
import { LeadWithOffers, getProjectId, getAgentId } from './utils/leadUtils';

export interface ComposeEmailForSlotInitialData {
  to: string;
  subject: string;
  body: string;
  mailserver_id: string;
}

interface ComposeEmailForSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ComposeEmailForSlotInitialData | null;
  lead: LeadWithOffers | null;
  offerId?: string;
  offerIds?: string[];
  opening: Opening;
  openingIdFromProp?: string;
}

export default function ComposeEmailForSlotModal({
  isOpen,
  onClose,
  initialData,
  lead,
  offerId,
  offerIds,
  opening,
  openingIdFromProp,
}: ComposeEmailForSlotModalProps) {
  void opening; // Reserved for future variable substitution in templates
  const [to, setTo] = useState(initialData?.to ?? '');
  const [subject, setSubject] = useState(initialData?.subject ?? '');

  const projectId = getProjectId(lead);
  const { data: project, isLoading: isProjectLoading } = useProject(projectId, !!projectId);
  const emailTemplates = useMemo(
    () => ({ data: project?.email_templates ?? [] }),
    [project?.email_templates]
  );
  const templatesLoading = isProjectLoading;
  const initialOfferIds = offerIds ?? (offerId ? [offerId] : []);

  const initialComposeValues =
    isOpen && initialData
      ? {
        subject: initialData.subject,
        content: initialData.body,
        mailserver_id: initialData.mailserver_id,
        offerIds: initialOfferIds,
      }
      : undefined;

  const {
    content,
    previewContent,
    selectedTemplateId,
    onUpdateText,
    handleTemplateChange,
    reset,
    resetWithInitial,
  } = useComposeMail(lead?._id, initialComposeValues);


  // Sync compose state with initialData when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      resetWithInitial({
        subject: initialData.subject,
        content: initialData.body,
      });
    }
  }, [isOpen, initialData, resetWithInitial]);

  const { sendProjectEmail, isSendingEmail } = useNotification();
  const queryClient = useQueryClient();

  const leadId = lead?._id || '';

  const handleClose = () => {
    reset();
    setTo('');
    onClose();
  };

  const handleSend = async () => {

    try {
      const emailData = {
        project_id: projectId,
        agent_id: getAgentId(lead) || lead?.assigned_agent?._id || '',
        lead_id: leadId,
        subject: subject,
        to: to || '',
        html: previewContent || content,
        mailserver_id: initialData?.mailserver_id || '',
      };

      await sendProjectEmail(emailData);

      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['infinite-emails-for-lead', leadId] });
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        queryClient.invalidateQueries({ queryKey: ['lead-last-email', leadId] });
      }
      if (offerId) {
        queryClient.invalidateQueries({ queryKey: ['offer-document-slots', offerId] });
      }
      if (openingIdFromProp) {
        queryClient.invalidateQueries({ queryKey: ['opening', openingIdFromProp] });
      }

      handleClose();
    } catch (error) {
      // Error is already handled by sendProjectEmail notification
      console.error('Failed to send email:', error);
    }
  };

  const displayContent = previewContent || content;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="min-w-[95vw] 2xl:min-w-[80vw]" height={'77vh'}>
      <div className="flex max-h-[85vh]  flex-col h-full">
        <div className="border-b border-gray-200 px-4 pb-1 sm:px-2">
          <h2 className="text-lg font-semibold text-slate-600">Compose Email</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-2 ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <EmailTemplateSelector
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={handleTemplateChange}
                templatesLoading={templatesLoading}
                emailTemplates={emailTemplates}
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                To <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                Subject <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium tracking-wide text-slate-500 uppercase">
              Message
            </label>
            <RichTextEditor
              key={selectedTemplateId || 'empty'}
              className="h-[41.9vh] sm:h-[51.6vh] md:h-[58vh] overflow-y-auto"
              content={displayContent}
              onChange={({ html }) => onUpdateText(html)}
              placeholder="Type your message..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-gray-200 px-4">
          <Button size="sm" variant="plain" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="solid"
            onClick={handleSend}
            loading={isSendingEmail}
            // disabled={!canSend}
            icon={<ApolloIcon name="mail" />}
          >
            Send
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
