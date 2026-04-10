'use client';

import { useState, useCallback } from 'react';
import { useLeadbotConversation } from './useLeadbotConversation';
import { useExtractDocument } from './useExtractDocument';
import { useTranscribeAudio } from './useTranscribeAudio';
import { useClassifyEmail } from './useClassifyEmail';
import type { LeadbotConversationMessage, LeadbotLeadContext } from '@/types/leadbot.types';

const EXTRACT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
const TRANSCRIBE_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4';
/** Chat accepts both documents and audio (per AUDIO_FILE.md) */
const CHAT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4';

function isExtractFile(f: File): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase();
  return ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '');
}

function isAudioFile(f: File): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase();
  const audio = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'mp4'];
  return audio.includes(ext ?? '') || f.type.startsWith('audio/');
}

export type LeadbotAction = 'chat' | 'extract' | 'transcribe' | 'classify';

export function useLeadbotActions(
  userId: string,
  leadId: string | undefined,
  lead?: LeadbotLeadContext | null,
  emails?: unknown[]
) {
  const [localMessages, setLocalMessages] = useState<LeadbotConversationMessage[]>([]);

  const conversation = useLeadbotConversation(userId, leadId, lead, emails);
  const { extract, isExtracting, error: extractError, reset: resetExtract } = useExtractDocument();
  const { transcribe, isTranscribing, error: transcribeError, reset: resetTranscribe } =
    useTranscribeAudio();
  const { classify, isClassifying, error: classifyError, reset: resetClassify } = useClassifyEmail();

  const appendLocalTurn = useCallback(
    (userContent: string, assistantContent: string) => {
      setLocalMessages((prev) => [
        ...prev,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ]);
    },
    []
  );

  const executeAction = useCallback(
    async (
      action: LeadbotAction,
      message: string,
      files: File[],
      classifyPayload?: { subject: string; body: string; direction?: 'incoming' | 'outgoing' }
    ) => {
      if (action === 'chat') {
        return conversation.sendMessageOrWithFiles(message, files);
      }

      if (action === 'extract') {
        const docFiles = files.filter(isExtractFile);
        if (docFiles.length === 0) {
          throw new Error('Please attach PDF or image files to extract.');
        }
        const userContent = message.trim() || `Extract from ${docFiles.map((f) => f.name).join(', ')}`;
        const data = await extract(docFiles);
        const assistantContent = [
          data.full_text,
          data.fields && Object.keys(data.fields).length > 0
            ? `\n\n**Fields:**\n${JSON.stringify(data.fields, null, 2)}`
            : '',
        ].join('');
        appendLocalTurn(userContent, assistantContent);
        return;
      }

      if (action === 'transcribe') {
        const audioFile = files.find(isAudioFile);
        if (!audioFile) {
          throw new Error('Please attach an audio file (MP3, WAV, M4A, etc.) to transcribe.');
        }
        const userContent = message.trim() || `Transcribe ${audioFile.name}`;
        const data = await transcribe({ file: audioFile });
        appendLocalTurn(userContent, data.text);
        return;
      }

      if (action === 'classify') {
        if (!classifyPayload?.subject?.trim() || !classifyPayload?.body?.trim()) {
          throw new Error('Subject and body are required for classification.');
        }
        const userContent = `Classify email: "${classifyPayload.subject}"`;
        const data = await classify({
          subject: classifyPayload.subject.trim(),
          body: classifyPayload.body.trim(),
          direction: classifyPayload.direction ?? 'incoming',
        });
        const assistantContent = [
          `**Is opening:** ${data.is_opening ? 'Yes' : 'No'}`,
          data.slot && `**Slot:** ${data.slot}`,
          data.stage && `**Stage:** ${data.stage}`,
          data.suggested_agent && `**Suggested agent:** ${data.suggested_agent}`,
          `**Confidence:** ${(data.confidence * 100).toFixed(0)}%`,
          data.situation_summary && `**Summary:** ${data.situation_summary}`,
          data.reason && `**Reason:** ${data.reason}`,
        ]
          .filter(Boolean)
          .join('\n');
        appendLocalTurn(userContent, assistantContent);
        return;
      }
    },
    [
      conversation,
      extract,
      transcribe,
      classify,
      appendLocalTurn,
    ]
  );

  const isSending =
    conversation.isSending || isExtracting || isTranscribing || isClassifying;

  const actionError = extractError ?? transcribeError ?? classifyError;
  const sendError = conversation.sendError ?? actionError;

  const messages: LeadbotConversationMessage[] = [
    ...(conversation.messages ?? []),
    ...localMessages,
  ];

  const resetSendError = useCallback(() => {
    conversation.resetSendError();
    resetExtract();
    resetTranscribe();
    resetClassify();
  }, [conversation, resetExtract, resetTranscribe, resetClassify]);

  return {
    ...conversation,
    messages,
    executeAction,
    isSending,
    sendError,
    resetSendError,
    EXTRACT_ACCEPT,
    TRANSCRIBE_ACCEPT,
    CHAT_ACCEPT,
    /** Multipart: upload / transcription / generating step tracker */
    uploadProgress: conversation.uploadProgress,
    submitFeedback: conversation.submitFeedback,
    clearLocalChatView: conversation.clearLocalChatView,
  };
}
