import { LEADBOT_GENERATING_PLACEHOLDER, LEADBOT_THINKING_PLACEHOLDER } from '@/utils/leadbotStreamPlaceholders';
import type {
  LeadbotFeedbackRequest,
  LeadbotFeedbackSubmitResult,
  LeadbotHealthResponse,
  LeadbotRootResponse,
  LeadbotClassifyEmailRequest,
  LeadbotClassifyEmailResponse,
  LeadbotExtractDocumentResponse,
  LeadbotSendMessageRequest,
  LeadbotSendMessageResponse,
  LeadbotSendMessageWithFilesParams,
  LeadbotSendMessageWithFilesResponse,
  LeadbotGetConversationResponse,
  LeadbotTranscribeRequest,
  LeadbotTranscribeResponse,
  LeadbotTranscribeStatusResponse,
  LeadbotQuickAction,
  LeadbotQuickActionsResponse,
} from '@/types/leadbot.types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Simulate network delay for mock responses */
const MOCK_DELAY_MS = 300;

/** Mock reply when request has no CRM `lead_id` (legacy / offline). */
const MOCK_LEGACY_LEAD_ID = 'legacy-mock';

/** Reference catalog (availability is set per lead_id in getQuickActions). */
const MOCK_QUICK_ACTIONS_BASE: Omit<LeadbotQuickAction, 'available'>[] = [
  {
    slug: 'lead_summary',
    label: 'Lead summary',
    message: 'Give me a full lead summary and overview including key contacts and status.',
  },
  {
    slug: 'offers',
    label: 'Offers',
    message: 'Summarize offers for this lead: stages, amounts, and next steps.',
  },
  {
    slug: 'documents',
    label: 'Documents',
    message: 'What documents are available for this lead across CRM and our conversation?',
  },
  {
    slug: 'email_timeline',
    label: 'Email timeline',
    message: 'Give me an email timeline for this lead with key threads.',
  },
  {
    slug: 'call_audio',
    label: 'Calls / audio',
    message: 'Summarize calls and voice notes related to this lead.',
  },
  {
    slug: 'crm_tips',
    label: 'CRM tips',
    message: 'Share short CRM tips to work leads more effectively.',
  },
];

export const LeadbotMockAdapter = {
  async getHealth(): Promise<LeadbotHealthResponse> {
    await delay(MOCK_DELAY_MS);
    return {
      status: 'ok',
      checks: { mongodb: 'ok', crm: 'ok', ollama: 'ok' },
    };
  },

  async getRoot(): Promise<LeadbotRootResponse> {
    await delay(MOCK_DELAY_MS);
    return { name: 'Leadbot', version: '1.0.0-mock' };
  },

  async getQuickActions(_userId: string, leadId: string): Promise<LeadbotQuickActionsResponse> {
    await delay(MOCK_DELAY_MS);
    const id = (leadId || '').trim();
    const hasCrmLead = Boolean(id) && id !== 'general';
    const actions: LeadbotQuickAction[] = MOCK_QUICK_ACTIONS_BASE.map((a) => ({
      ...a,
      available: hasCrmLead,
    }));
    return { actions };
  },

  async classifyEmail(body: LeadbotClassifyEmailRequest): Promise<LeadbotClassifyEmailResponse> {
    await delay(MOCK_DELAY_MS);
    const hasAttachments = body.attachments && body.attachments.length > 0;
    return {
      is_opening: !body.is_reply,
      stage: 'Positiv',
      slot: 'offer_email',
      confidence: 0.85,
      reason: 'Mock: Email appears to be an offer or contract discussion.',
      suggested_agent: 'agent-1',
      situation_summary: 'Mock: Incoming email about project inquiry.',
      attachment_slots: hasAttachments
        ? body.attachments!.map(() => ({ slot: 'offer_email', confidence: 0.8 }))
        : [],
    };
  },

  async extractDocument(_files: File[]): Promise<LeadbotExtractDocumentResponse> {
    await delay(MOCK_DELAY_MS);
    return {
      full_text: 'Mock extracted text from document. [Sample contract content...]',
      fields: { title: 'Sample Contract', date: '2024-01-15' },
      pages: [{ page: 1, text: 'Mock page 1 content' }],
    };
  },

  async sendMessage(body: LeadbotSendMessageRequest): Promise<LeadbotSendMessageResponse> {
    await delay(MOCK_DELAY_MS);
    return {
      reply: `Mock: I understand you're asking about "${body.message.slice(0, 50)}...". Here's a helpful response based on the lead context.`,
      lead_id: body.lead_id ?? MOCK_LEGACY_LEAD_ID,
      user_id: body.user_id,
    };
  },

  async sendMessageStream(
    body: LeadbotSendMessageRequest,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: { reply: string; lead_id?: string; user_id?: string }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> {
    const reply = `Mock: I understand you're asking about "${body.message.slice(0, 50)}...". Here's a helpful response based on the lead context.`;
    await delay(MOCK_DELAY_MS);
    callbacks.onPlaceholder?.(LEADBOT_THINKING_PLACEHOLDER);
    await delay(50);
    callbacks.onPlaceholder?.(LEADBOT_GENERATING_PLACEHOLDER);
    await delay(50);
    callbacks.onPlaceholder?.(null);
    callbacks.onMessageId?.({
      message_id: 'mock-stream-assistant-msg',
      created_at: new Date().toISOString(),
    });
    callbacks.onChunk(reply);
    callbacks.onDone({
      reply,
      lead_id: body.lead_id ?? MOCK_LEGACY_LEAD_ID,
      user_id: body.user_id,
    });
    return {
      reply,
      lead_id: body.lead_id ?? MOCK_LEGACY_LEAD_ID,
      user_id: body.user_id,
    };
  },

  async sendMessageWithFiles(
    params: LeadbotSendMessageWithFilesParams
  ): Promise<LeadbotSendMessageWithFilesResponse> {
    await delay(MOCK_DELAY_MS);
    const hasMessage = params.message?.trim();
    if (hasMessage) {
      const msg = params.message!;
      return {
        reply: `Mock: I've reviewed the ${params.files.length} file(s) you uploaded. Regarding "${msg.slice(0, 40)}..." — here's my analysis based on the document content.`,
        lead_id: params.lead_id ?? MOCK_LEGACY_LEAD_ID,
        user_id: params.user_id,
      };
    }
    return {
      documents: params.files.map((f) => ({ name: f.name, size: f.size })),
      message:
        "I've extracted the documents. What would you like to know? You can ask me to summarize, find specific information, or analyze the content.",
    };
  },

  async sendMessageWithFilesStream(
    params: LeadbotSendMessageWithFilesParams,
    callbacks: {
      onDocuments?: (documents: unknown[]) => void;
      onFileUploading?: (
        status: 'reading' | 'analysing' | 'classifying' | 'classified' | 'done',
        filenames?: string[],
        extra?: { filename?: string; index?: number; total?: number }
      ) => void;
      onAudioTranscribing?: (status: 'start' | 'done', filename?: string) => void;
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onGeneratingStepLabel?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: {
        reply: string;
        lead_id?: string;
        user_id?: string;
        documents?: unknown[];
      }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> {
    const fileCount = params.files.length;
    const hasAudio = !!params.audio;
    const reply =
      params.message?.trim()
        ? `Mock: I've reviewed the ${fileCount} file(s)${hasAudio ? ' and the audio' : ''}. Regarding "${params.message.slice(0, 40)}..." — here's my analysis.`
        : `Mock: I've extracted ${fileCount} document(s)${hasAudio ? ' and transcribed the audio' : ''}. What would you like to know?`;
    await delay(MOCK_DELAY_MS);
    if (fileCount > 0) {
      callbacks.onFileUploading?.('reading', params.files.map((f) => f.name));
      await delay(100);
      callbacks.onFileUploading?.('analysing', params.files.map((f) => f.name));
      await delay(100);
      callbacks.onFileUploading?.('classifying', params.files.map((f) => f.name));
      await delay(50);
      callbacks.onFileUploading?.('classified');
    }
    if (hasAudio && params.audio) {
      callbacks.onAudioTranscribing?.('start', params.audio.name);
      await delay(150);
      callbacks.onAudioTranscribing?.('done', params.audio.name);
    }
    if (fileCount > 0 || hasAudio) {
      callbacks.onFileUploading?.('done', [...params.files.map((f) => f.name), ...(params.audio ? [params.audio.name] : [])]);
    }
    callbacks.onDocuments?.(params.files.map((f) => ({ name: f.name, size: f.size })));
    callbacks.onGeneratingStepLabel?.(LEADBOT_GENERATING_PLACEHOLDER);
    await delay(50);
    callbacks.onGeneratingStepLabel?.(null);
    callbacks.onMessageId?.({
      message_id: 'mock-multipart-assistant-msg',
      created_at: new Date().toISOString(),
    });
    callbacks.onChunk(reply);
    callbacks.onDone({
      reply,
      lead_id: params.lead_id ?? MOCK_LEGACY_LEAD_ID,
      user_id: params.user_id,
    });
    return {
      reply,
      lead_id: params.lead_id ?? MOCK_LEGACY_LEAD_ID,
      user_id: params.user_id,
    };
  },

  async getConversation(params: {
    user_id: string;
    lead_id: string;
    limit?: number;
    before_id?: string;
  }): Promise<LeadbotGetConversationResponse> {
    await delay(MOCK_DELAY_MS);
    /** Second page: older than `msg-1` (tests load-more + scroll preservation). */
    if (params.before_id === 'msg-1') {
      return {
        id: 'mock-conv-id',
        user_id: params.user_id,
        lead_id: params.lead_id,
        has_more: false,
        messages: [
          {
            id: 'msg-0',
            role: 'user',
            content: 'Hi — can you help with this lead?',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }
    return {
      id: 'mock-conv-id',
      user_id: params.user_id,
      lead_id: params.lead_id,
      has_more: true,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Mock: Hello! I\'m your Leadbot assistant. How can I help you with this lead today?',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  },

  async deleteMessage(_messageId: string, _userId: string) {
    await delay(MOCK_DELAY_MS);
    return { deleted: true, message_id: _messageId, deleted_count: 1 };
  },

  async deleteConversation(userId: string, leadId: string) {
    await delay(MOCK_DELAY_MS);
    return { deleted: true, user_id: userId, lead_id: leadId };
  },

  async sendFeedback(_body: LeadbotFeedbackRequest): Promise<LeadbotFeedbackSubmitResult> {
    await delay(100);
    return { ok: true };
  },

  async regenerateStream(
    userId: string,
    leadId: string,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: { reply: string; lead_id?: string; user_id?: string }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> {
    const reply = 'Mock: Here is a regenerated response.';
    await delay(MOCK_DELAY_MS);
    callbacks.onPlaceholder?.(LEADBOT_THINKING_PLACEHOLDER);
    await delay(30);
    callbacks.onPlaceholder?.(null);
    callbacks.onMessageId?.({
      message_id: 'mock-regenerated-assistant-msg',
      created_at: new Date().toISOString(),
    });
    callbacks.onChunk(reply);
    callbacks.onDone({ reply, lead_id: leadId, user_id: userId });
    return { reply, lead_id: leadId, user_id: userId };
  },

  async editAndRegenerateStream(
    userId: string,
    leadId: string,
    _messageId: string,
    content: string,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: { reply: string; lead_id?: string; user_id?: string }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> {
    const reply = `Mock: I understand you edited to "${content.slice(0, 30)}...". Here is my new response.`;
    await delay(MOCK_DELAY_MS);
    callbacks.onPlaceholder?.(LEADBOT_THINKING_PLACEHOLDER);
    await delay(30);
    callbacks.onPlaceholder?.(null);
    callbacks.onMessageId?.({
      message_id: 'mock-edited-assistant-msg',
      created_at: new Date().toISOString(),
    });
    callbacks.onChunk(reply);
    callbacks.onDone({ reply, lead_id: leadId, user_id: userId });
    return { reply, lead_id: leadId, user_id: userId };
  },

  async getTranscribeStatus(): Promise<LeadbotTranscribeStatusResponse> {
    await delay(MOCK_DELAY_MS);
    return { available: true };
  },

  async transcribeAudio(_params: LeadbotTranscribeRequest): Promise<LeadbotTranscribeResponse> {
    await delay(MOCK_DELAY_MS);
    return {
      text: 'Mock transcription: This is a sample call transcript. Speaker 1 discussed the project timeline. Speaker 2 asked about pricing.',
      metadata: { engine: 'whisper', language: 'en' },
    };
  },

  async transcribeElevenLabs(
    params: LeadbotTranscribeRequest
  ): Promise<LeadbotTranscribeResponse> {
    const result = await this.transcribeAudio(params);
    return {
      ...result,
      metadata: { ...result.metadata, engine: 'elevenlabs' },
    };
  },
};
