import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import { useEmailTemplates } from '@/services/hooks/useSettings';
import { apiGetEmailTemplate } from '@/services/SettingsService';
import { usePreviewEmailTemplate } from '@/services/hooks/useMailTemplate';
import { chatbotSendMailStore } from '@/stores/chatbotSendMailStore';

export interface UseComposeMailInitialValues {
  subject?: string;
  content?: string;
  offerIds?: string[];
}

function isHtmlContent(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toEditorHtml(value: string): string {
  if (!value) return '';
  if (isHtmlContent(value)) return value;

  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('');
}

export const useComposeMail = (
  leadId?: string,
  initialValues?: UseComposeMailInitialValues
) => {
  const mailData = chatbotSendMailStore((state) => state.mailData);
  const seedSubject = initialValues?.subject ?? mailData?.subject ?? '';
  const seedContent = toEditorHtml(initialValues?.content ?? mailData?.body ?? '');

  const [subject, setSubject] = useState(seedSubject);
  const [content, setContent] = useState(seedContent);
  const [previewContent, setPreviewContent] = useState(seedContent);
  const [debouncedContent, setDebouncedContent] = useState(seedContent);
  const [isContentEdited, setIsContentEdited] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [cc, setCc] = useState(mailData?.cc ?? '');
  const [bcc, setBcc] = useState(mailData?.bcc ?? '');
  const [offerIds, setOfferIds] = useState<string[]>(initialValues?.offerIds ?? []);

  const { data: emailTemplates } = useEmailTemplates();
  const { data: selectedTemplateData } = useQuery({
    queryKey: ['email-template', selectedTemplateId],
    queryFn: async () => {
      const response = await apiGetEmailTemplate(selectedTemplateId);
      return (response as any)?.template ?? response;
    },
    enabled: !!selectedTemplateId,
  });
  const { mutate: previewEmailTemplateMutate } = usePreviewEmailTemplate();

  const previewMutateRef = useRef(previewEmailTemplateMutate);
  useEffect(() => {
    previewMutateRef.current = previewEmailTemplateMutate;
  }, [previewEmailTemplateMutate]);

  const debouncedPreviewUpdate = useMemo(
    () =>
      debounce((html: string) => {
        setDebouncedContent(html);
      }, 800),
    []
  );
  useEffect(() => () => debouncedPreviewUpdate.cancel(), [debouncedPreviewUpdate]);

  const applyComposeContent = useCallback(
    (nextSubject: string, nextContent: string) => {
      debouncedPreviewUpdate.cancel();
      setSubject(nextSubject);
      setContent(nextContent);
      setPreviewContent(nextContent);
      setDebouncedContent(nextContent);
      setIsContentEdited(false);
    },
    [debouncedPreviewUpdate]
  );

  const onUpdateText = useCallback(
    (html: string) => {
      setContent(html);
      setPreviewContent(html);
      setIsContentEdited(true);
      debouncedPreviewUpdate(html);
    },
    [debouncedPreviewUpdate]
  );

  useEffect(() => {
    if (!selectedTemplateId || !selectedTemplateData) return;

    const template = (selectedTemplateData as any)?.template ?? selectedTemplateData;
    const templateContent =
      template?.template_content ?? template?.info?.template_content ?? '';
    const templateSubject = template?.subject ?? template?.info?.subject ?? '';

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      applyComposeContent(templateSubject, templateContent);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, selectedTemplateData, applyComposeContent]);

  const handleTemplateChange = useCallback(
    (templateId: string | null) => {
      if (templateId === null) return;
      setSelectedTemplateId(templateId);

      if (!templateId) {
        applyComposeContent(seedSubject, seedContent);
        return;
      }

      const selectedTemplate = (emailTemplates?.data || [])?.find(
        (template: any) => template._id === templateId
      );
      if (!selectedTemplate) return;

      const templateContent =
        selectedTemplate.template_content ??
        (selectedTemplate as { info?: { template_content?: string } }).info?.template_content ??
        '';
      const templateSubject =
        selectedTemplate.subject ??
        (selectedTemplate as { info?: { subject?: string } }).info?.subject ??
        '';

      applyComposeContent(templateSubject, templateContent);
    },
    [applyComposeContent, emailTemplates, seedContent, seedSubject]
  );

  useEffect(() => {
    const hasMailSubject = mailData?.subject !== null && mailData?.subject !== undefined;
    const hasMailBody = mailData?.body !== null && mailData?.body !== undefined;
    if (!hasMailSubject && !hasMailBody) return;

    const nextSubject = mailData?.subject ?? initialValues?.subject ?? '';
    const nextContent = toEditorHtml(mailData?.body ?? initialValues?.content ?? '');
    const nextCc = mailData?.cc ?? '';
    const nextBcc = mailData?.bcc ?? '';

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSelectedTemplateId('');
      applyComposeContent(nextSubject, nextContent);
      setCc(nextCc);
      setBcc(nextBcc);
    });

    return () => {
      cancelled = true;
    };
  }, [
    applyComposeContent,
    initialValues?.content,
    initialValues?.subject,
    mailData?.bcc,
    mailData?.body,
    mailData?.cc,
    mailData?.subject,
  ]);

  useEffect(() => {
    const previewSourceContent = isContentEdited ? debouncedContent : content;
    const hasPendingContentChanges = isContentEdited && debouncedContent !== content;

    if (!leadId || !previewSourceContent.trim() || hasPendingContentChanges) return;

    const requestData: Record<string, unknown> = {
      lead_id: leadId,
      offer_ids: offerIds,
      template_content: previewSourceContent,
    };

    if (selectedTemplateId) {
      requestData.template_id = selectedTemplateId;
      if (!isContentEdited) {
        delete requestData.template_content;
      }
    }

    previewMutateRef.current(requestData as any, {
      onSuccess(data) {
        setPreviewContent(data?.preview || previewSourceContent);
      },
      onError() {
        setPreviewContent(previewSourceContent);
      },
    });
  }, [selectedTemplateId, debouncedContent, content, offerIds, leadId, isContentEdited]);

  const reset = useCallback(() => {
    debouncedPreviewUpdate.cancel();
    setSubject('');
    setContent('');
    setPreviewContent('');
    setDebouncedContent('');
    setCc('');
    setBcc('');
    setSelectedTemplateId('');
    setOfferIds([]);
    setIsContentEdited(false);
  }, [debouncedPreviewUpdate]);

  const resetWithInitial = useCallback(
    (initial?: { subject?: string; content?: string }) => {
      if (!initial) {
        reset();
        return;
      }

      const nextContent = toEditorHtml(initial.content ?? '');

      debouncedPreviewUpdate.cancel();
      setSubject(initial.subject ?? '');
      setContent(nextContent);
      setPreviewContent(nextContent);
      setDebouncedContent(nextContent);
      setCc('');
      setBcc('');
      setSelectedTemplateId('');
      setIsContentEdited(false);
    },
    [debouncedPreviewUpdate, reset]
  );

  return {
    subject,
    setSubject,
    content,
    setContent,
    previewContent,
    selectedTemplateId,
    offerIds,
    setOfferIds,
    cc,
    setCc,
    bcc,
    setBcc,
    onUpdateText,
    handleTemplateChange,
    reset,
    resetWithInitial,
  };
};
