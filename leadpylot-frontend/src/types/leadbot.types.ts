/**
 * Leadbot API types
 * @see docs/leadbot/Leadbot-Service-API.md
 */

// --- Conversation ---

/** Attachment on a user message (from file upload) */
export interface LeadbotMessageAttachment {
  filename: string;
  subject?: string;
  extracted_text?: string;
  fields?: Record<string, unknown>;
  page_count?: number;
  /** Direct document preview URL from API attachments payload */
  document_url?: string;
  /** Blob URL for viewing (created from File on upload, before refetch) */
  preview_url?: string;
  /** URL from API for viewing/downloading (when backend provides it) */
  url?: string;
}

/** Voice attachment from API (audio transcription) */
export interface LeadbotVoiceAttachment {
  type?: 'voice';
  filename: string;
  transcript: string;
  diarization?: string;
  detected_lang?: string;
}

/** Assistant metadata for draft-email actions */
export interface LeadbotEmailDraftMetadata {
  message_type: 'email_draft';
  email_subject?: string;
  email_body?: string;
  email_template_id?: string;
  to_email?: string;
  cc?: string;
  bcc?: string;
  [key: string]: unknown;
}

/** Stored on assistant messages after feedback POST (see GET /api/conversation). */
export interface LeadbotMessageFeedbackMetadata {
  rating: 1 | -1;
  correction?: string;
}

/** Conversation message (user, assistant, or system notice) */
export interface LeadbotConversationMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  tool_exchanges?: unknown[];
  metadata?: LeadbotEmailDraftMetadata | Record<string, unknown> | null;
  /** Attachments on user messages (uploaded files) */
  attachments?: LeadbotMessageAttachment[];
  /** Document attachments from API (PDF, images) */
  document_attachments?: LeadbotMessageAttachment[] | null;
  /** Voice attachments from API (audio transcripts) */
  voice_attachments?: LeadbotVoiceAttachment[] | null;
}

/**
 * Send message request (POST /api/conversation, /api/conversation/stream).
 * CRM: `user_id`, `lead_id`, `message` required — do not send `user` / `lead` / `emails` (server loads from CRM).
 * Legacy (e.g. email draft without lead): omit `lead_id` and optionally send `emails` / `lead` for offline/testing.
 */
export interface LeadbotSendMessageRequest {
  user_id: string;
  /** CRM thread key; omit for legacy-only requests. Must not be the literal `"general"`. */
  lead_id?: string;
  message: string;
  /** @deprecated Legacy: only when `lead_id` is omitted */
  lead?: LeadbotLeadContext;
  /** @deprecated Legacy */
  user?: LeadbotUserContext;
  /** @deprecated Legacy: only when `lead_id` is omitted */
  emails?: unknown[];
  /** Offer ObjectIds belonging to the lead (merged from offers / out offers / openings in UI). */
  offer_ids?: string[];
  out_offer_ids?: string[];
  opening_ids?: string[];
}

/** Send message response */
export interface LeadbotSendMessageResponse {
  reply: string;
  lead_id: string;
  user_id: string;
}

/** File upload only response (when sending files without message) */
export interface LeadbotFileUploadResponse {
  documents: unknown[];
  message: string;
}

/** Union response for sendMessageWithFiles */
export type LeadbotSendMessageWithFilesResponse =
  | LeadbotSendMessageResponse
  | LeadbotFileUploadResponse;

/** Params for multipart conversation (files + optional audio + optional message) */
export interface LeadbotSendMessageWithFilesParams {
  user_id: string;
  lead_id?: string;
  message?: string;
  lead?: LeadbotLeadContext;
  user?: LeadbotUserContext;
  emails?: unknown[];
  /** Document files (PDF, PNG, JPEG, WebP) */
  files: File[];
  /** Single audio file (MP3, WAV, M4A, OGG, FLAC, WebM, MP4) */
  audio?: File;
  offer_ids?: string[];
  out_offer_ids?: string[];
  opening_ids?: string[];
}

/** POST /api/conversation/feedback */
export interface LeadbotFeedbackRequest {
  user_id: string;
  message_id: string;
  rating: 1 | -1;
  correction?: string;
}

export type LeadbotFeedbackSubmitResult =
  | { ok: true }
  | { ok: false; conflict: true; existing_rating: 1 | -1; message: string };

/** Get conversation response (paginated) */
export interface LeadbotGetConversationResponse {
  id?: string;
  user_id?: string;
  lead_id?: string;
  title?: string;
  messages: LeadbotConversationMessage[];
  has_more?: boolean;
}

/** TanStack Query cache for conversation list + pagination (`has_more` from API). */
export interface LeadbotConversationCache {
  messages: LeadbotConversationMessage[];
  hasMore: boolean;
}

/** GET /api/conversation/quick-actions — preset user messages (chips). */
export interface LeadbotQuickAction {
  slug: string;
  label: string;
  message: string;
  available: boolean;
}

export interface LeadbotQuickActionsResponse {
  actions: LeadbotQuickAction[];
}

/** Lead context for conversation */
export interface LeadbotLeadContext {
  id?: string;
  name?: string;
  email?: string;
  /** Selected offer IDs from Offers table (for AI context) */
  offer_ids?: string[];
  /** Selected offer IDs from Out Offers table (for AI context) */
  out_offer_ids?: string[];
  /** Selected opening IDs from Openings table (for AI context) */
  opening_ids?: string[];
  [key: string]: unknown;
}

/** User/agent context for conversation */
export interface LeadbotUserContext {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

// --- Health ---

export interface LeadbotHealthResponse {
  status: 'ok' | 'degraded';
  checks?: Record<string, string>;
}

export interface LeadbotRootResponse {
  name?: string;
  version?: string;
  [key: string]: unknown;
}

// --- Email Classification ---

export interface LeadbotClassifyEmailRequest {
  subject: string;
  body: string;
  direction?: 'incoming' | 'outgoing';
  attachments?: unknown[];
  is_reply?: boolean;
  parent_subject?: string;
  parent_slot?: string;
}

export interface LeadbotClassifyEmailResponse {
  is_opening: boolean;
  stage: string | null;
  slot: string | null;
  confidence: number;
  reason: string | null;
  suggested_agent: string | null;
  situation_summary: string | null;
  attachment_slots?: unknown[];
}

// --- Document Extraction ---

export interface LeadbotExtractDocumentResponse {
  full_text: string;
  fields?: Record<string, unknown>;
  pages?: unknown[];
}

// --- Audio Transcription ---

export interface LeadbotTranscribeRequest {
  file: File;
  translate?: boolean;
  diarize?: boolean;
  summary?: boolean;
  language?: string;
}

export interface LeadbotTranscribeResponse {
  text: string;
  metadata?: {
    engine?: string;
    language?: string;
    [key: string]: unknown;
  };
}

export interface LeadbotTranscribeStatusResponse {
  available: boolean;
  [key: string]: unknown;
}

// --- Error ---

export interface LeadbotApiError {
  error: string | { message?: string; errors?: unknown[]; hint?: string };
  request_id?: string;
}
