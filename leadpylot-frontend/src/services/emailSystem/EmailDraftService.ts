import ApiService from '../ApiService';

// Types for Draft Emails
export interface DraftEmail {
  _id: string;
  direction: string;
  external_id: string;
  subject: string;
  from: string;
  from_address: string;
  to: string;
  cc: string;
  bcc: string;
  body: string;
  html_body: string;
  original_body: string;
  original_html_body: string;
  project_id?:
    | {
        _id: string;
        name: string;
      }
    | string;
  lead_id?:
    | {
        _id: string;
        contact_name: string;
        email_from: string;
      }
    | string;
  mailserver_id?: string;
  is_draft: boolean;
  email_status: string;
  draft_created_by?: {
    _id: string;
    name: string;
    login: string;
  };
  draft_last_saved_at?: string;
  draft_synced_to_imap: boolean;
  draft_imap_uid?: string;
  draft_parent_email_id?:
    | {
        _id: string;
        subject: string;
        external_id: string;
        from: string;
        to: string;
      }
    | string;
  sent_by_agent?: string;
  assigned_agent?: string;
  visible_to_agents: string[];
  is_active: boolean;
  archived: boolean;
  processed: boolean;
  attachments?: Array<{
    _id: string;
    document_id: string;
    filename: string;
    size: number;
    mime_type: string;
    approved: boolean;
    approved_by?: string;
    approved_at?: string;
    unmask?: boolean;
    visible_to_agents?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDraftRequest extends Record<string, unknown> {
  subject?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  body?: string;
  html_body?: string;
  from?: string;
  from_address?: string;
  project_id?: string;
  lead_id?: string;
  mailserver_id?: string;
  parent_email_id?: string;
  external_id?: string;
}

export interface SaveDraftToMailServerRequest {
  to: string;
  subject?: string;
  body?: string;
  html_body?: string;
  mailserver_id: string;
  attachment_ids?: string[];
}

export interface UpdateDraftRequest extends Record<string, unknown> {
  subject?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  body?: string;
  html_body?: string;
  lead_id?: string;
}

export interface DraftFilters {
  project_id?: string;
  lead_id?: string;
  parent_email_id?: string;
  thread_id?: string; // ✅ NEW: Fetch all drafts in a thread
  mailserver_id?: string;
  limit?: number;
}

export interface DraftApiResponse {
  status: string;
  data: DraftEmail;
  message?: string;
}

export interface DraftsListApiResponse {
  status: string;
  data: DraftEmail[];
  count: number;
}

class EmailDraftService {
  /**
   * Create a new draft
   */
  static async createDraft(
    draftData: CreateDraftRequest | FormData,
    isFormData?: boolean
  ): Promise<DraftApiResponse> {
    try {
      const config =
        isFormData || draftData instanceof FormData
          ? { headers: { 'Content-Type': 'multipart/form-data' } }
          : {};
      const response = await ApiService.fetchDataWithAxios<DraftApiResponse, any>({
        url: '/email-system/drafts',
        method: 'POST',
        data: draftData,
        ...config,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing draft
   */
  static async updateDraft(
    draftId: string,
    updates: UpdateDraftRequest | FormData,
    isFormData?: boolean
  ): Promise<DraftApiResponse> {
    try {
      const config =
        isFormData || updates instanceof FormData
          ? { headers: { 'Content-Type': 'multipart/form-data' } }
          : {};
      const response = await ApiService.fetchDataWithAxios<DraftApiResponse, any>({
        url: `/email-system/drafts/${draftId}`,
        method: 'PUT',
        data: updates,
        ...config,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all drafts with optional filters
   */
  static async getDrafts(filters?: DraftFilters): Promise<DraftsListApiResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/email-system/drafts${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await ApiService.fetchDataWithAxios<DraftsListApiResponse>({
        url: url,
        method: 'GET',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single draft by ID
   */
  static async getDraftById(draftId: string): Promise<DraftApiResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<DraftApiResponse>({
        url: `/email-system/drafts/${draftId}`,
        method: 'GET',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a draft
   */
  static async deleteDraft(draftId: string): Promise<{ status: string; message: string }> {
    try {
      const response = await ApiService.fetchDataWithAxios<{ status: string; message: string }>({
        url: `/email-system/drafts/${draftId}`,
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a draft (converts to email and sends)
   */
  static async sendDraft(draftId: string): Promise<DraftApiResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<DraftApiResponse>({
        url: `/email-system/drafts/${draftId}/send`,
        method: 'POST',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync drafts from IMAP (admin only)
   */
  static async syncDraftsFromIMAP(
    mailServerId: string
  ): Promise<{ status: string; message: string }> {
    try {
      const response = await ApiService.fetchDataWithAxios<{ status: string; message: string }>({
        url: `/email-system/drafts/sync/${mailServerId}`,
        method: 'POST',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save draft to mailserver (standalone/non-reply draft)
   * POST /email-system/drafts/mailserver
   */
  static async saveDraftToMailServer(
    draftData: SaveDraftToMailServerRequest
  ): Promise<DraftApiResponse> {
    try {
      const response = await ApiService.fetchDataWithAxios<DraftApiResponse, any>({
        url: '/email-system/drafts/mailserver',
        method: 'POST',
        data: draftData,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default EmailDraftService;
