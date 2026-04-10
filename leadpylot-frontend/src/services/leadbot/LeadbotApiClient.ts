import axios, { type AxiosInstance } from 'axios';
import { leadbotConfig } from '@/configs/microservices.config';
import {
  LEADBOT_GENERATING_PLACEHOLDER,
  leadbotToolPlaceholder,
} from '@/utils/leadbotStreamPlaceholders';
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

/** Mutable state for one SSE stream (text tokens vs. placeholder phases). */
type ConversationStreamState = {
  hasReceivedText: boolean;
  fullReply: string;
};

type ConversationStreamCallbacks = {
  onChunk: (content: string) => void;
  onPlaceholder?: (text: string | null) => void;
  /**
   * Multipart streams: llm/tool phase labels update the "Generating response" tracker step only.
   * When set, `llm_start` / `tool_start` / `tool_done` route here instead of `onPlaceholder`.
   */
  onGeneratingStepLabel?: (text: string | null) => void;
  onDone: (data: {
    reply: string;
    lead_id?: string;
    user_id?: string;
    documents?: unknown[];
    /** Present on final `done` when backend persists tool runs (same as GET conversation). */
    tool_exchanges?: unknown[];
  }) => void;
  onError: (message: string) => void;
  /** Persisted assistant message id from SSE (enables feedback on streamed replies). */
  onMessageId?: (payload: { message_id: string; created_at?: string }) => void;
};

function routeStreamPhaseLabel(text: string | null, callbacks: ConversationStreamCallbacks): void {
  if (callbacks.onGeneratingStepLabel) {
    callbacks.onGeneratingStepLabel(text);
  } else {
    callbacks.onPlaceholder?.(text);
  }
}

function applyConversationSseEvent(
  data: {
    type: string;
    content?: string;
    reply?: string;
    lead_id?: string;
    user_id?: string;
    message?: string;
    name?: string;
    documents?: unknown[];
    tool_exchanges?: unknown[];
    /** Some deployments nest persisted fields on `done` (fallback if `tool_exchanges` is top-level only in DB). */
    metadata?: unknown;
    message_id?: string;
    created_at?: string;
  },
  state: ConversationStreamState,
  callbacks: ConversationStreamCallbacks
): void {
  switch (data.type) {
    case 'message_id': {
      const mid = data.message_id;
      if (mid) callbacks.onMessageId?.({ message_id: mid, created_at: data.created_at });
      break;
    }
    case 'llm_start':
      routeStreamPhaseLabel(LEADBOT_GENERATING_PLACEHOLDER, callbacks);
      break;
    case 'tool_start':
      routeStreamPhaseLabel(leadbotToolPlaceholder(data.name), callbacks);
      break;
    case 'tool_done':
      routeStreamPhaseLabel(LEADBOT_GENERATING_PLACEHOLDER, callbacks);
      break;
    case 'text': {
      if (!state.hasReceivedText) {
        state.hasReceivedText = true;
        callbacks.onPlaceholder?.(null);
        callbacks.onGeneratingStepLabel?.(null);
      }
      const content = data.content ?? '';
      state.fullReply += content;
      callbacks.onChunk(content);
      break;
    }
    case 'done': {
      const reply = data.reply ?? state.fullReply;
      state.fullReply = reply;
      callbacks.onPlaceholder?.(null);
      callbacks.onGeneratingStepLabel?.(null);
      const meta =
        data.metadata && typeof data.metadata === 'object' && data.metadata !== null
          ? (data.metadata as Record<string, unknown>)
          : null;
      const nestedToolExchanges = meta && Array.isArray(meta.tool_exchanges) ? meta.tool_exchanges : undefined;
      callbacks.onDone({
        reply,
        lead_id: data.lead_id,
        user_id: data.user_id,
        documents: data.documents,
        tool_exchanges: data.tool_exchanges ?? nestedToolExchanges,
      });
      break;
    }
    case 'error':
      callbacks.onPlaceholder?.(null);
      callbacks.onGeneratingStepLabel?.(null);
      callbacks.onError(data.message ?? 'Unknown error');
      break;
    default:
      break;
  }
}

function createLeadbotAxios(): AxiosInstance {
  const instance = axios.create({
    baseURL: leadbotConfig.baseUrl,
    timeout: 60000,
    headers: {
      'X-API-Key': leadbotConfig.apiKey,
      'X-Request-ID': crypto.randomUUID(),
    },
  });

  instance.interceptors.request.use((config) => {
    config.headers['X-Request-ID'] = crypto.randomUUID();
    return config;
  });

  return instance;
}

const api = createLeadbotAxios();

export const LeadbotApiClient = {
  async getHealth(): Promise<LeadbotHealthResponse> {
    const { data } = await api.get<LeadbotHealthResponse>('/health');
    return data;
  },

  async getRoot(): Promise<LeadbotRootResponse> {
    const { data } = await api.get<LeadbotRootResponse>('/');
    return data;
  },

  async getQuickActions(userId: string, leadId: string): Promise<LeadbotQuickActionsResponse> {
    const { data } = await api.get<LeadbotQuickActionsResponse>('/api/conversation/quick-actions', {
      params: { user_id: userId, lead_id: leadId },
    });
    return data;
  },

  async classifyEmail(body: LeadbotClassifyEmailRequest): Promise<LeadbotClassifyEmailResponse> {
    const { data } = await api.post<LeadbotClassifyEmailResponse>('/api/classify-email', body);
    return data;
  },

  async extractDocument(files: File[]): Promise<LeadbotExtractDocumentResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const { data } = await api.post<LeadbotExtractDocumentResponse>(
      '/api/extract-document',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  async sendMessage(body: LeadbotSendMessageRequest): Promise<LeadbotSendMessageResponse> {
    const { data } = await api.post<LeadbotSendMessageResponse>('/api/conversation', body);
    return data;
  },

  /**
   * Send message with streaming response (SSE).
   * Uses fetch + ReadableStream for text/event-stream.
   */
  async sendMessageStream(
    body: LeadbotSendMessageRequest,
    callbacks: {
      onChunk: (content: string) => void;
      /** Single-line status in the assistant bubble; `null` clears (e.g. first text token). */
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
  ): Promise<LeadbotSendMessageResponse> {
    const url = `${leadbotConfig.baseUrl}/api/conversation/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': leadbotConfig.apiKey,
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      callbacks.onError(text || `HTTP ${res.status}`);
      throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const state: ConversationStreamState = { hasReceivedText: false, fullReply: '' };

    const parseLine = (line: string) => {
      if (!line.startsWith('data: ')) return;
      try {
        const data = JSON.parse(line.slice(6)) as {
          type: string;
          content?: string;
          reply?: string;
          lead_id?: string;
          user_id?: string;
          message?: string;
          name?: string;
          documents?: unknown[];
          tool_exchanges?: unknown[];
          message_id?: string;
          created_at?: string;
        };
        applyConversationSseEvent(data, state, callbacks);
      } catch {
        // Skip malformed lines
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) parseLine(line);
    }

    if (buffer.startsWith('data: ')) parseLine(buffer);

    return {
      reply: state.fullReply,
      lead_id: body.lead_id ?? '',
      user_id: body.user_id ?? '',
    };
  },

  /**
   * Send message with files and/or audio via streaming API (multipart).
   * Emits file_uploading, audio_transcribing, documents, then text/tool_start/done/error.
   */
  async sendMessageWithFilesStream(
    params: LeadbotSendMessageWithFilesParams,
    callbacks: {
      onDocuments?: (documents: unknown[]) => void;
      /** file_uploading SSE events: reading | analysing | classifying | classified | done */
      onFileUploading?: (
        status: 'reading' | 'analysing' | 'classifying' | 'classified' | 'done',
        filenames?: string[],
        extra?: { filename?: string; index?: number; total?: number }
      ) => void;
      /** audio_transcribing SSE events: start | done */
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
  ): Promise<LeadbotSendMessageResponse> {
    const formData = new FormData();
    formData.append('user_id', params.user_id);
    if (params.lead_id) {
      formData.append('lead_id', params.lead_id);
    }
    if (params.message) formData.append('message', params.message);
    /** CRM: lead/user/emails omitted. Legacy (no lead_id): optional lead + emails. */
    if (!params.lead_id) {
      if (params.lead) formData.append('lead', JSON.stringify(params.lead));
      if (params.user) formData.append('user', JSON.stringify(params.user));
      if (params.emails?.length) formData.append('emails', JSON.stringify(params.emails));
    }
    const offerIds = [
      ...(params.offer_ids ?? []),
      ...(params.out_offer_ids ?? []),
      ...(params.opening_ids ?? []),
    ].filter(Boolean);
    if (offerIds.length) formData.append('offer_ids', JSON.stringify(offerIds));
    params.files.forEach((file) => formData.append('files', file));
    if (params.audio) formData.append('audio', params.audio);

    const url = `${leadbotConfig.baseUrl}/api/conversation/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': leadbotConfig.apiKey,
        'X-Request-ID': crypto.randomUUID(),
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      callbacks.onError(text || `HTTP ${res.status}`);
      throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const state: ConversationStreamState = { hasReceivedText: false, fullReply: '' };

    const parseSseData = (line: string) => {
      if (!line.startsWith('data: ')) return;
      try {
        const data = JSON.parse(line.slice(6)) as {
          type: string;
          content?: string;
          reply?: string;
          lead_id?: string;
          user_id?: string;
          message?: string;
          documents?: unknown[];
          tool_exchanges?: unknown[];
          message_id?: string;
          created_at?: string;
          name?: string;
          status?: string;
          filenames?: string[];
          filename?: string;
          index?: number;
          total?: number;
          count?: number;
        };
        if (data.type === 'file_uploading') {
          const status = data.status as 'reading' | 'analysing' | 'classifying' | 'classified' | 'done';
          if (status)
            callbacks.onFileUploading?.(status, data.filenames, {
              filename: data.filename,
              index: data.index,
              total: data.total,
            });
        } else if (data.type === 'audio_transcribing') {
          const status = data.status as 'start' | 'done';
          if (status) callbacks.onAudioTranscribing?.(status, data.filename);
        } else if (data.type === 'documents') {
          callbacks.onDocuments?.(data.documents ?? []);
        } else if (data.type === 'message_id') {
          const mid = data.message_id;
          if (mid) callbacks.onMessageId?.({ message_id: mid, created_at: data.created_at });
        } else {
          applyConversationSseEvent(data, state, callbacks);
        }
      } catch {
        // Skip malformed lines
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) parseSseData(line);
    }
    if (buffer.startsWith('data: ')) parseSseData(buffer);

    return {
      reply: state.fullReply,
      lead_id: params.lead_id ?? '',
      user_id: params.user_id,
    };
  },

  async sendMessageWithFiles(
    params: LeadbotSendMessageWithFilesParams
  ): Promise<LeadbotSendMessageWithFilesResponse> {
    const formData = new FormData();
    formData.append('user_id', params.user_id);
    if (params.lead_id) {
      formData.append('lead_id', params.lead_id);
    }
    if (params.message) formData.append('message', params.message);
    if (!params.lead_id) {
      if (params.lead) formData.append('lead', JSON.stringify(params.lead));
      if (params.user) formData.append('user', JSON.stringify(params.user));
      if (params.emails?.length) formData.append('emails', JSON.stringify(params.emails));
    }
    if (params.offer_ids?.length) formData.append('offer_ids', JSON.stringify(params.offer_ids));
    params.files.forEach((file) => formData.append('files', file));

    const { data } = await api.post<LeadbotSendMessageWithFilesResponse>(
      '/api/conversation',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  async getConversation(params: {
    user_id: string;
    lead_id: string;
    limit?: number;
    before_id?: string;
  }): Promise<LeadbotGetConversationResponse> {
    const { data } = await api.get<LeadbotGetConversationResponse>('/api/conversation', {
      params: {
        user_id: params.user_id,
        lead_id: params.lead_id,
        limit: params.limit ?? 20,
        ...(params.before_id && { before_id: params.before_id }),
      },
    });
    return data;
  },

  async deleteMessage(messageId: string, userId: string): Promise<{ deleted: boolean; message_id: string; deleted_count?: number }> {
    const { data } = await api.delete<{ deleted: boolean; message_id: string; deleted_count?: number }>(
      `/api/conversation/message/${messageId}`,
      { params: { user_id: userId } }
    );
    return data;
  },

  async deleteConversation(userId: string, leadId: string): Promise<{ deleted: boolean; user_id: string; lead_id: string }> {
    const { data } = await api.delete<{ deleted: boolean; user_id: string; lead_id: string }>(
      '/api/conversation',
      { params: { user_id: userId, lead_id: leadId } }
    );
    return data;
  },

  async sendFeedback(body: LeadbotFeedbackRequest): Promise<LeadbotFeedbackSubmitResult> {
    try {
      await api.post('/api/conversation/feedback', body);
      return { ok: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const raw = err.response.data as {
          detail?: { existing_rating?: number; message?: string } | string;
        };
        const detail =
          typeof raw?.detail === 'object' && raw.detail !== null ? raw.detail : {};
        const existing_rating: 1 | -1 = detail.existing_rating === -1 ? -1 : 1;
        const message =
          typeof detail.message === 'string'
            ? detail.message
            : typeof raw?.detail === 'string'
              ? raw.detail
              : 'Feedback already submitted.';
        return { ok: false, conflict: true, existing_rating, message };
      }
      throw err;
    }
  },

  /**
   * Regenerate last assistant reply (streaming). Keeps user message, deletes last assistant, streams new reply.
   */
  async regenerateStream(
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
  ): Promise<LeadbotSendMessageResponse> {
    return this._streamPost('/api/conversation/regenerate/stream', { user_id: userId, lead_id: leadId }, callbacks);
  },

  /**
   * Edit user message and regenerate from it (streaming). Deletes message and all after, updates user message, streams new reply.
   */
  async editAndRegenerateStream(
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
  ): Promise<LeadbotSendMessageResponse> {
    return this._streamPost(
      '/api/conversation/edit-and-regenerate/stream',
      { user_id: userId, lead_id: leadId, message_id: messageId, content },
      callbacks
    );
  },

  /** Shared SSE stream parser for POST endpoints returning text/event-stream */
  async _streamPost(
    path: string,
    body: Record<string, unknown>,
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
  ): Promise<LeadbotSendMessageResponse> {
    const url = `${leadbotConfig.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': leadbotConfig.apiKey,
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      callbacks.onError(text || `HTTP ${res.status}`);
      throw new Error(text || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const state: ConversationStreamState = { hasReceivedText: false, fullReply: '' };

    const parseLine = (line: string) => {
      if (!line.startsWith('data: ')) return;
      try {
        const data = JSON.parse(line.slice(6)) as {
          type: string;
          content?: string;
          reply?: string;
          lead_id?: string;
          user_id?: string;
          message?: string;
          name?: string;
          documents?: unknown[];
          tool_exchanges?: unknown[];
          message_id?: string;
          created_at?: string;
        };
        applyConversationSseEvent(data, state, callbacks);
      } catch {
        /* skip */
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) parseLine(line);
    }
    if (buffer.startsWith('data: ')) parseLine(buffer);

    return {
      reply: state.fullReply,
      lead_id: (body.lead_id as string) ?? '',
      user_id: (body.user_id as string) ?? '',
    };
  },

  async getTranscribeStatus(): Promise<LeadbotTranscribeStatusResponse> {
    const { data } = await api.get<LeadbotTranscribeStatusResponse>('/api/audio/transcribe/status');
    return data;
  },

  async transcribeAudio(params: LeadbotTranscribeRequest): Promise<LeadbotTranscribeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.translate !== undefined) formData.append('translate', String(params.translate));
    if (params.diarize !== undefined) formData.append('diarize', String(params.diarize));
    if (params.summary !== undefined) formData.append('summary', String(params.summary));
    if (params.language) formData.append('language', params.language);

    const { data } = await api.post<LeadbotTranscribeResponse>(
      '/api/audio/transcribe',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  async transcribeElevenLabs(params: LeadbotTranscribeRequest): Promise<LeadbotTranscribeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.translate !== undefined) formData.append('translate', String(params.translate));
    if (params.diarize !== undefined) formData.append('diarize', String(params.diarize));
    if (params.summary !== undefined) formData.append('summary', String(params.summary));
    if (params.language) formData.append('language', params.language);

    const { data } = await api.post<LeadbotTranscribeResponse>(
      '/api/audio/transcribe/elevenlabs',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  // ───────────────────────────────────────────────
  // Admin: Quick Actions CRUD
  // ───────────────────────────────────────────────

  async adminListQuickActions(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }
  ): Promise<{ data: QuickActionAdminItem[]; total: number; page: number; limit: number }> {
    const { data } = await api.get('/api/quick-actions', {
      params,
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminCreateQuickAction(
    userId: string,
    body: { label: string; message: string; slug?: string }
  ): Promise<QuickActionAdminItem> {
    const { data } = await api.post<QuickActionAdminItem>('/api/quick-actions', body, {
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminGetQuickAction(userId: string, id: string): Promise<QuickActionAdminItem> {
    const { data } = await api.get<QuickActionAdminItem>(`/api/quick-actions/${id}`, {
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminUpdateQuickAction(
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
  ): Promise<QuickActionAdminItem> {
    const { data } = await api.patch<QuickActionAdminItem>(`/api/quick-actions/${id}`, body, {
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminToggleVisible(userId: string, id: string): Promise<QuickActionAdminItem> {
    const { data } = await api.post<QuickActionAdminItem>(
      `/api/quick-actions/${id}/toggle-visible`,
      {},
      { headers: { 'X-User-Id': userId } }
    );
    return data;
  },

  async adminToggleActive(userId: string, id: string): Promise<QuickActionAdminItem> {
    const { data } = await api.post<QuickActionAdminItem>(
      `/api/quick-actions/${id}/toggle-active`,
      {},
      { headers: { 'X-User-Id': userId } }
    );
    return data;
  },

  async adminDeleteQuickAction(userId: string, id: string): Promise<{ ok: boolean }> {
    const { data } = await api.delete<{ ok: boolean }>(`/api/quick-actions/${id}`, {
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminBulkDelete(userId: string, ids: string[]): Promise<{ ok: boolean; deleted: number }> {
    const { data } = await api.post<{ ok: boolean; deleted: number }>(
      '/api/quick-actions/bulk-delete',
      { ids },
      { headers: { 'X-User-Id': userId } }
    );
    return data;
  },

  async adminReorderQuickActions(userId: string, ids: string[]): Promise<{ ok: boolean; updated: number }> {
    const { data } = await api.post<{ ok: boolean; updated: number }>(
      '/api/quick-actions/reorder',
      { ids },
      { headers: { 'X-User-Id': userId } }
    );
    return data;
  },

  async adminGetSeedDefaults(userId: string): Promise<{ items: { slug: string; label: string; message: string }[] }> {
    const { data } = await api.get('/api/quick-actions/defaults', {
      headers: { 'X-User-Id': userId },
    });
    return data;
  },

  async adminSeedQuickActions(userId: string): Promise<{ ok: boolean; message: string }> {
    const { data } = await api.post<{ ok: boolean; message: string }>(
      '/api/quick-actions/seed',
      {},
      { headers: { 'X-User-Id': userId } }
    );
    return data;
  },
};

/** Admin schema for a Quick Action document (from /api/quick-actions). */
export interface QuickActionAdminItem {
  _id: string;
  label: string;
  message: string;
  available: boolean;
  is_active: boolean;
  sort_order: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

