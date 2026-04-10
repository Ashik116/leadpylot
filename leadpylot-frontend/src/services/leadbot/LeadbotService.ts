import { leadbotConfig } from '@/configs/microservices.config';
import { LeadbotApiClient, type QuickActionAdminItem } from './LeadbotApiClient';
import { LeadbotMockAdapter } from './LeadbotMockAdapter';
import type {
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
  LeadbotFeedbackRequest,
  LeadbotFeedbackSubmitResult,
  LeadbotQuickActionsResponse,
} from '@/types/leadbot.types';

export type { QuickActionAdminItem };

const client = leadbotConfig.mock ? LeadbotMockAdapter : LeadbotApiClient;

export const LeadbotService = {
  getHealth: (): Promise<LeadbotHealthResponse> => client.getHealth(),
  getRoot: (): Promise<LeadbotRootResponse> => client.getRoot(),
  getQuickActions: (userId: string, leadId: string): Promise<LeadbotQuickActionsResponse> =>
    client.getQuickActions(userId, leadId),
  classifyEmail: (body: LeadbotClassifyEmailRequest): Promise<LeadbotClassifyEmailResponse> =>
    client.classifyEmail(body),
  extractDocument: (files: File[]): Promise<LeadbotExtractDocumentResponse> =>
    client.extractDocument(files),
  sendMessage: (body: LeadbotSendMessageRequest): Promise<LeadbotSendMessageResponse> =>
    client.sendMessage(body),
  sendMessageStream: (
    body: LeadbotSendMessageRequest,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: {
        reply: string;
        lead_id?: string;
        user_id?: string;
        tool_exchanges?: unknown[];
      }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> =>
    client.sendMessageStream(body, callbacks),
  sendMessageWithFiles: (
    params: LeadbotSendMessageWithFilesParams
  ): Promise<LeadbotSendMessageWithFilesResponse> => client.sendMessageWithFiles(params),
  sendMessageWithFilesStream: (
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
        tool_exchanges?: unknown[];
      }) => void;
      onError: (message: string) => void;
    }
  ): Promise<LeadbotSendMessageResponse> =>
    client.sendMessageWithFilesStream(params, callbacks),
  getConversation: (params: {
    user_id: string;
    lead_id: string;
    limit?: number;
    before_id?: string;
  }): Promise<LeadbotGetConversationResponse> => client.getConversation(params),
  deleteMessage: (messageId: string, userId: string) => client.deleteMessage(messageId, userId),
  deleteConversation: (userId: string, leadId: string) => client.deleteConversation(userId, leadId),
  sendFeedback: (body: LeadbotFeedbackRequest): Promise<LeadbotFeedbackSubmitResult> =>
    client.sendFeedback(body),
  regenerateStream: (
    userId: string,
    leadId: string,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: {
        reply: string;
        lead_id?: string;
        user_id?: string;
        tool_exchanges?: unknown[];
      }) => void;
      onError: (message: string) => void;
    }
  ) => client.regenerateStream(userId, leadId, callbacks),
  editAndRegenerateStream: (
    userId: string,
    leadId: string,
    messageId: string,
    content: string,
    callbacks: {
      onChunk: (content: string) => void;
      onPlaceholder?: (text: string | null) => void;
      onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
      onDone: (data: {
        reply: string;
        lead_id?: string;
        user_id?: string;
        tool_exchanges?: unknown[];
      }) => void;
      onError: (message: string) => void;
    }
  ) => client.editAndRegenerateStream(userId, leadId, messageId, content, callbacks),
  getTranscribeStatus: (): Promise<LeadbotTranscribeStatusResponse> =>
    client.getTranscribeStatus(),
  transcribeAudio: (params: LeadbotTranscribeRequest): Promise<LeadbotTranscribeResponse> =>
    client.transcribeAudio(params),
  transcribeElevenLabs: (params: LeadbotTranscribeRequest): Promise<LeadbotTranscribeResponse> =>
    client.transcribeElevenLabs(params),

  // ── Admin: Quick Actions CRUD ─────────────────
  adminListQuickActions: (
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }
  ) => LeadbotApiClient.adminListQuickActions(userId, params),

  adminCreateQuickAction: (userId: string, body: { label: string; message: string; slug?: string }) =>
    LeadbotApiClient.adminCreateQuickAction(userId, body),

  adminUpdateQuickAction: (
    userId: string,
    id: string,
    body: Partial<{
      label: string;
      message: string;
      available: boolean;
      is_active: boolean;
      sort_order: number;
      slug: string;
    }>
  ) => LeadbotApiClient.adminUpdateQuickAction(userId, id, body),

  adminToggleVisible: (userId: string, id: string) =>
    LeadbotApiClient.adminToggleVisible(userId, id),

  adminToggleActive: (userId: string, id: string) =>
    LeadbotApiClient.adminToggleActive(userId, id),

  adminDeleteQuickAction: (userId: string, id: string) =>
    LeadbotApiClient.adminDeleteQuickAction(userId, id),

  adminBulkDelete: (userId: string, ids: string[]) =>
    LeadbotApiClient.adminBulkDelete(userId, ids),

  adminReorderQuickActions: (userId: string, ids: string[]) =>
    LeadbotApiClient.adminReorderQuickActions(userId, ids),

  adminGetSeedDefaults: (userId: string) => LeadbotApiClient.adminGetSeedDefaults(userId),

  adminSeedQuickActions: (userId: string) => LeadbotApiClient.adminSeedQuickActions(userId),
};

