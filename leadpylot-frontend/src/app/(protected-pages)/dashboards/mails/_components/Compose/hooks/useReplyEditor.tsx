'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailConversation } from '../../../_types/email.types';
import { useEmailData } from '../../../_hooks/useEmailData';
import { usePresence } from '../../../_hooks/usePresence';
import EmailDraftService from '@/services/emailSystem/EmailDraftService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useEmailTemplates } from '@/services/hooks/useSettings';
import { useComposeMail } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useComposeMail';
import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';
import { useLeadConditional } from '@/services/hooks/useLeads';
import { usePreviewEmailTemplate } from '@/services/hooks/useMailTemplate';

export interface AttachmentMeta {
  id: string;
  filename: string;
  size?: number;
}

export interface UseReplyEditorProps {
  conversation: EmailConversation;
  isExpanded: boolean;
  onToggle?: () => void;
  setInternalExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  specificParentEmailId?: string | null;
  prefetchedDraft?: any | null;
  setExpandedSection?: (section: 'tasks' | 'comments' | 'reply' | null) => void;
}

export function useReplyEditor({
  conversation,
  isExpanded,
  onToggle,
  setInternalExpanded,
  specificParentEmailId,
  prefetchedDraft,
  setExpandedSection,
}: UseReplyEditorProps) {
  const replyPosition = specificParentEmailId ? 'specific' : 'last';
  const parentEmailId = specificParentEmailId || conversation.thread_id || conversation._id;
  const emailDraftId = conversation?._id;
  const queryClient = useQueryClient();
  const { replyToEmail, isReplying } = useEmailData();
  const { startComposing, stopComposing } = usePresence();

  const [replyText, setReplyText] = useState('');
  const [replyHtml, setReplyHtml] = useState('');
  const [liveContent, setLiveContent] = useState('');
  const [replyType, setReplyType] = useState<'reply' | 'reply_all'>('reply');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<AttachmentMeta[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    conversation.draftOffers?.email_template_id || ''
  );
  const [selectedOffers, setSelectedOffers] = useState<OrderedOffer[]>([]);

  const initializedOffersRef = useRef(false);
  const loadedDraftIdRef = useRef<string | null>(null);
  const preventBlurRef = useRef(false);
  const templateSelectorRef = useRef<HTMLDivElement>(null);

  const leadIdFromConversation =
    typeof conversation.lead_id === 'string' ? conversation.lead_id : conversation.lead_id?._id;
  const effectiveLeadId = conversation.draftOffers?.lead_id || leadIdFromConversation || '';
  const showDraftOfferControls = Boolean(conversation.draftOffers);

  const { data: existingDraftsData } = useQuery({
    queryKey: ['draft-for-conversation', parentEmailId],
    queryFn: async () => {
      if (prefetchedDraft) return { data: [prefetchedDraft] };
      return EmailDraftService.getDrafts({ parent_email_id: parentEmailId, limit: 1 });
    },
    enabled: !prefetchedDraft,
  });

  const { data: emailTemplates, isLoading: templatesLoading } = useEmailTemplates();
  const leadQueryEnabled = Boolean(effectiveLeadId) && isExpanded;
  const { data: leadData } = useLeadConditional(effectiveLeadId, leadQueryEnabled);
  const leadOffers = useMemo(() => (leadData?.offers || []) as any[], [leadData?.offers]);
  const activeLeadOffers = useMemo(
    () => leadOffers.filter((offer: any) => offer?.active === true),
    [leadOffers]
  );
  const { setOfferIds } = useComposeMail(showDraftOfferControls ? effectiveLeadId : undefined);
  const { mutate: previewEmailTemplateMutate } = usePreviewEmailTemplate();

  const existingDraftId = prefetchedDraft?._id || existingDraftsData?.data?.[0]?._id;
  const existingDraft = prefetchedDraft || existingDraftsData?.data?.[0];

  const selectedTemplateLabel = useMemo(() => {
    if (!selectedTemplateId) return '';
    return (
      emailTemplates?.data?.find((t: any) => t._id === selectedTemplateId)?.name || ''
    );
  }, [emailTemplates?.data, selectedTemplateId]);

  const htmlToText = useCallback((html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  const loadDraftIntoEditor = useCallback((draft: any) => {
    const htmlContent = draft.html_body || draft.original_html_body || draft.body || '';
    let plainText = '';
    if (htmlContent) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      plainText = tempDiv.textContent || tempDiv.innerText || '';
    }
    if (!plainText && draft.body) plainText = draft.body;
    const normalizedAttachments: AttachmentMeta[] = ((draft as any).attachments || [])
      .map((a: any) => ({ id: a.document_id || a._id, filename: a.filename, size: a.size }))
      .filter((a: AttachmentMeta) => Boolean(a.id));

    setReplyText(plainText);
    setReplyHtml(htmlContent || plainText);
    setExistingAttachments(normalizedAttachments);
    setAttachmentIds(normalizedAttachments.map((a) => a.id));
    loadedDraftIdRef.current = draft._id;
  }, []);

  const applyTemplateContent = useCallback((html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    setReplyHtml(html);
    setReplyText(text);
  }, []);

  const handleTemplateSelectorChange = useCallback(
    (templateId: string | null) => {
      const nextTemplateId = templateId || '';
      setSelectedTemplateId(nextTemplateId);

      if (!nextTemplateId) {
        setReplyHtml('');
        setReplyText('');
        return;
      }

      const selectedTemplate = emailTemplates?.data?.find(
        (t: any) => t._id === nextTemplateId
      );
      const templateContent =
        selectedTemplate?.template_content ?? selectedTemplate?.info?.template_content ?? '';
      if (templateContent) applyTemplateContent(templateContent);

      if (effectiveLeadId) {
        previewEmailTemplateMutate(
          {
            lead_id: effectiveLeadId,
            template_id: nextTemplateId,
            offer_ids: showDraftOfferControls ? selectedOffers.map((o) => o.id) : undefined,
          },
          {
            onSuccess(data) {
              if (data?.preview) applyTemplateContent(data.preview);
            },
          }
        );
      }
    },
    [
      emailTemplates?.data,
      effectiveLeadId,
      showDraftOfferControls,
      selectedOffers,
      previewEmailTemplateMutate,
      applyTemplateContent,
    ]
  );

  const handleReplyClick = useCallback(
    (type: 'reply' | 'reply_all') => {
      if (existingDraft?._id) {
        loadDraftIntoEditor(existingDraft);
      } else {
        loadedDraftIdRef.current = null;
      }
      setReplyType(type);
      onToggle ? onToggle() : setInternalExpanded(true);
      startComposing(conversation._id);
    },
    [existingDraft, loadDraftIntoEditor, onToggle, setInternalExpanded, startComposing, conversation._id]
  );

  const handleSaveDraft = useCallback(
    async (overrideHtml?: string) => {
      const htmlContent = overrideHtml ?? (replyHtml || replyText.replace(/\n/g, '<br>'));
      const textContent = overrideHtml ? htmlToText(overrideHtml) : replyText;
      if (!textContent.trim()) return;
      setIsSavingDraft(true);
      try {
      const payload: Record<string, any> = {
        subject: `Re: ${conversation.subject}`,
        to: conversation.from_address || conversation.from || '',
        body: textContent,
        html_body: htmlContent,
        parent_email_id: parentEmailId,
        reply_position: replyPosition,
        attachment_ids: attachmentIds,
        mailserver_id: conversation.mailserver_id || '',
      };
      if (conversation.project_id?._id) payload.project_id = conversation.project_id._id;
      if (conversation.lead_id?._id) payload.lead_id = conversation.lead_id._id;
      if (showDraftOfferControls) {
        payload.draftOffers = {
          offer_ids: selectedOffers.map((o) => o.id),
          lead_id: effectiveLeadId || null,
          email_template_id: selectedTemplateId || null,
        };
      }

      if (draftId) {
        await EmailDraftService.updateDraft(draftId, payload);
      } else {
        const response = await EmailDraftService.createDraft(payload);
        const newDraftId = response.data._id;
        setDraftId(newDraftId);
        loadedDraftIdRef.current = newDraftId;
      }
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['draft-for-conversation', parentEmailId] });
      queryClient.invalidateQueries({ queryKey: ['thread-drafts'] });
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to save draft');
      toast.push(
        <Notification title="Error" type="danger" duration={5000}>
          {errorMessage}
        </Notification>
      );
      console.error('Failed to save draft:', error);
    } finally {
      setIsSavingDraft(false);
    }
  },
    [
      replyText,
      replyHtml,
      htmlToText,
      conversation,
    parentEmailId,
    replyPosition,
    attachmentIds,
    draftId,
    showDraftOfferControls,
    selectedOffers,
    effectiveLeadId,
    selectedTemplateId,
    queryClient,
  ]);

  const handleSend = useCallback(
    (overrideHtml?: string) => {
      const htmlContent = overrideHtml ?? (replyHtml || replyText.replace(/\n/g, '<br>'));
      const textContent = overrideHtml ? htmlToText(overrideHtml) : replyText;
      if (!textContent.trim()) return;
    const draftToDelete = draftId;

    replyToEmail(
      {
        emailId: conversation._id,
        data: {
          subject: `Re: ${conversation.subject}`,
          html: htmlContent,
          reply_type: replyType,
          attachment_ids: attachmentIds,
        },
      },
      {
        onSuccess: async () => {
          if (draftToDelete) {
            try {
              await EmailDraftService.deleteDraft(draftToDelete);
              setDraftId(null);
              loadedDraftIdRef.current = null;
            } catch (e) {
              console.error('Failed to delete draft after sending:', e);
            }
          }
          setReplyText('');
          setReplyHtml('');
          setLiveContent('');
          setAttachmentIds([]);
          setExistingAttachments([]);
          loadedDraftIdRef.current = null;
          setShowTemplateSelector(false);
          onToggle && isExpanded ? onToggle() : setInternalExpanded(false);
          stopComposing(conversation._id);
        },
      }
    );
  },
    [replyText, replyHtml, htmlToText, draftId,
    replyType,
    attachmentIds,
    conversation,
    isExpanded,
    onToggle,
    setInternalExpanded,
    replyToEmail,
    stopComposing,
  ]);

  const deleteDraftMutation = useMutation({
    mutationFn: (id: string) => EmailDraftService.deleteDraft(id),
    onSuccess: (_, deletedDraftId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['thread-drafts'] });
      queryClient.setQueryData(['draft-for-conversation', parentEmailId], { data: [] });
      loadedDraftIdRef.current = deletedDraftId;
      setDraftId(null);
      setReplyText('');
      setReplyHtml('');
      setLiveContent('');
      setAttachmentIds([]);
      setExistingAttachments([]);
      onToggle && isExpanded ? onToggle() : setInternalExpanded(false);
      stopComposing(conversation._id);
      toast.push(
        <Notification title="Success" type="success">
          Draft deleted successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message || 'Failed to delete draft. Please try again.'}
        </Notification>
      );
    },
  });

  const handleDeleteDraft = useCallback(() => {
    if (draftId) deleteDraftMutation.mutate(draftId);
  }, [draftId, deleteDraftMutation]);

  const handleAttachmentChange = useCallback((ids: string[]) => {
    setAttachmentIds(ids);
    setExistingAttachments((prev) => prev.filter((a) => ids.includes(a.id)));
  }, []);

  const handleReplyContentChange = useCallback(
    (html: string) => {
      const text = htmlToText(html);
      setReplyHtml(html);
      setReplyText(text);
      setLiveContent('');
    },
    [htmlToText]
  );

  const handleLiveContentChange = useCallback((html: string) => {
    setLiveContent(html);
  }, []);

  const liveText = useMemo(() => htmlToText(liveContent), [liveContent, htmlToText]);
  const hasContent = Boolean(replyText.trim() || liveText.trim());

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorInstanceRef = useRef<any>(null);

  const editorRefCallback = useCallback(
    (editorInstance: any) => {
      editorInstanceRef.current = editorInstance;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (!editorInstance) return;

      const POLL_MS = 400;
      const startPolling = () => {
        if (pollIntervalRef.current) return;
        pollIntervalRef.current = setInterval(() => {
          handleLiveContentChange(editorInstance.value ?? '');
        }, POLL_MS);
      };
      const stopPolling = () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
      editorInstance.events.on('focus', startPolling);
      editorInstance.events.on('blur', stopPolling);
    },
    [handleLiveContentChange]
  );

  const getEditorContent = useCallback(() => editorInstanceRef.current?.value ?? '', []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleCancel = useCallback(() => {
    loadedDraftIdRef.current = draftId;
    onToggle && isExpanded ? onToggle() : setInternalExpanded(false);
    setReplyText('');
    setReplyHtml('');
    setLiveContent('');
    setAttachmentIds([]);
    setExistingAttachments([]);
    setShowTemplateSelector(false);
    stopComposing(conversation._id);
  }, [draftId, isExpanded, onToggle, setInternalExpanded, stopComposing, conversation._id]);

  const handleTemplateSelectFromButton = useCallback(
    (templateId: string | null) => {
      handleTemplateSelectorChange(templateId);
      setShowTemplateSelector(false);
    },
    [handleTemplateSelectorChange]
  );

  useEffect(() => {
    if (!showDraftOfferControls) {
      setSelectedTemplateId('');
      setSelectedOffers([]);
      initializedOffersRef.current = false;
      return;
    }
    setSelectedTemplateId(conversation.draftOffers?.email_template_id || '');
    setSelectedOffers([]);
    initializedOffersRef.current = false;
  }, [conversation._id, conversation.draftOffers?.email_template_id, showDraftOfferControls]);

  useEffect(() => {
    if (!showDraftOfferControls) return;
    if (initializedOffersRef.current) return;
    const offerIds = conversation.draftOffers?.offer_ids;
    if (!offerIds?.length || !activeLeadOffers.length) return;

    const offerMap = new Map(activeLeadOffers.map((o: any) => [o._id, o]));
    const ordered = offerIds
      .map((offerId: string, i: number) => {
        const offer = offerMap.get(offerId);
        return offer ? { id: offerId, order: i + 1, offer } : null;
      })
      .filter(Boolean) as OrderedOffer[];

    if (ordered.length) {
      setSelectedOffers(ordered);
      initializedOffersRef.current = true;
    }
  }, [conversation.draftOffers?.offer_ids, activeLeadOffers, showDraftOfferControls]);

  useEffect(() => {
    if (showTemplateSelector) {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          templateSelectorRef.current &&
          !templateSelectorRef.current.contains(e.target as Node)
        ) {
          setShowTemplateSelector(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplateSelector]);

  useEffect(() => {
    if (!showDraftOfferControls) {
      setOfferIds([]);
      return;
    }
    setOfferIds(selectedOffers.map((o) => o.id));
  }, [selectedOffers, setOfferIds, showDraftOfferControls]);

  useEffect(() => {
    if (existingDraftId && existingDraftId !== loadedDraftIdRef.current && !draftId) {
      setDraftId(existingDraftId);
    } else if (!existingDraftId && emailDraftId && conversation?.is_draft) {
      setDraftId(emailDraftId);
    }
  }, [existingDraftId, draftId, emailDraftId, conversation?.is_draft]);

  useEffect(() => {
    if (existingDraft?._id && existingDraft._id !== loadedDraftIdRef.current) {
      loadDraftIntoEditor(existingDraft);
      onToggle ? (!isExpanded && onToggle()) : setInternalExpanded(true);
    } else if (!existingDraft && conversation.is_draft) {
      setReplyText(conversation?.body || '');
      setReplyHtml(conversation?.html_body || '');
      setInternalExpanded(true);
      setExpandedSection?.('reply');
    }
  }, [existingDraft, onToggle, isExpanded, conversation, setExpandedSection, loadDraftIntoEditor, setInternalExpanded]);

  return {
    replyText,
    replyHtml,
    replyType,
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
    loadDraftIntoEditor,
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
  };
}
