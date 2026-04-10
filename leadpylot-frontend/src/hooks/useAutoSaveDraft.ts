import { useState, useCallback, useEffect, useRef } from 'react';
import EmailDraftService, { CreateDraftRequest, UpdateDraftRequest } from '@/services/emailSystem/EmailDraftService';

interface DraftData {
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
  reply_position?: 'specific' | 'last'; // ✅ NEW: Reply position for threaded conversations
  files?: File[]; // ✅ NEW: Attachments for draft
}

interface UseAutoSaveDraftOptions {
  interval?: number; // Auto-save interval in milliseconds (default: 5000ms = 5 seconds)
  enabled?: boolean; // Enable/disable auto-save (default: true)
  onSaveSuccess?: (draftId: string) => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveDraftReturn {
  draftId: string | null;
  lastSaved: Date | null;
  isSaving: boolean;
  error: Error | null;
  saveDraft: (data: DraftData, isManual?: boolean) => Promise<void>;
  deleteDraft: () => Promise<void>;
  sendDraft: () => Promise<void>;
  setDraftId: (id: string | null) => void;
  resetAutoSave: () => void;
}

/**
 * Hook for auto-saving drafts with debouncing
 * 
 * @param options - Configuration options for auto-save behavior
 * @returns Object with draft state and methods
 * 
 * @example
 * ```tsx
 * const {
 *   draftId,
 *   lastSaved,
 *   isSaving,
 *   saveDraft,
 *   deleteDraft,
 *   sendDraft
 * } = useAutoSaveDraft({
 *   interval: 5000,
 *   enabled: true,
 *   onSaveSuccess: (id) => console.log('Draft saved:', id)
 * });
 * 
 * // Trigger save (will be debounced)
 * saveDraft({ subject: 'Hello', body: 'World' });
 * 
 * // Manual save (immediate)
 * saveDraft({ subject: 'Hello', body: 'World' }, true);
 * ```
 */
export function useAutoSaveDraft(options: UseAutoSaveDraftOptions = {}): UseAutoSaveDraftReturn {
  const {
    interval = 5000, // Default 5 seconds
    enabled = true,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Store pending data to save
  const pendingDataRef = useRef<DraftData | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<DraftData | null>(null);
  const isManualSaveRef = useRef(false);

  /**
   * Save draft to server
   */
  const performSave = useCallback(async (data: DraftData) => {
    try {
      setIsSaving(true);
      setError(null);

      // Check if data has actually changed (excluding files for comparison)
      const dataWithoutFiles = { ...data };
      delete dataWithoutFiles.files;
      if (lastDataRef.current) {
        const lastDataWithoutFiles = { ...lastDataRef.current };
        delete lastDataWithoutFiles.files;
        if (JSON.stringify(lastDataWithoutFiles) === JSON.stringify(dataWithoutFiles) &&
          (!data.files || data.files.length === 0) &&
          (!lastDataRef.current.files || lastDataRef.current.files.length === 0)) {
          console.log('[useAutoSaveDraft] Data unchanged, skipping save');
          setIsSaving(false);
          return;
        }
      }

      const hasFiles = data.files && data.files.length > 0;

      // Always use FormData format
      const formData = new FormData();
      if (data.subject) formData.append('subject', data.subject);
      if (data.to) formData.append('to', data.to);
      if (data.cc) formData.append('cc', data.cc);
      if (data.bcc) formData.append('bcc', data.bcc);
      if (data.body) formData.append('body', data.body);
      if (data.html_body) formData.append('html_body', data.html_body);
      if (data.lead_id) formData.append('lead_id', data.lead_id);

      // Only append files if they exist
      if (hasFiles && data.files) {
        data.files.forEach((file) => {
          formData.append('files', file);
        });
      }

      if (draftId) {
        // Update existing draft
        await EmailDraftService.updateDraft(draftId, formData, true);
        console.log('[useAutoSaveDraft] Draft updated:', draftId);
      } else {
        // Create new draft
        if (data.from) formData.append('from', data.from);
        if (data.from_address) formData.append('from_address', data.from_address);
        if (data.project_id) formData.append('project_id', data.project_id);
        if (data.mailserver_id) formData.append('mailserver_id', data.mailserver_id);
        if (data.parent_email_id) formData.append('parent_email_id', data.parent_email_id);
        if (data.reply_position) formData.append('reply_position', data.reply_position);

        const response = await EmailDraftService.createDraft(formData, true);
        setDraftId(response.data._id);
        console.log('[useAutoSaveDraft] Draft created:', response.data._id);

        if (onSaveSuccess) {
          onSaveSuccess(response.data._id);
        }
      }

      const now = new Date();
      setLastSaved(now);
      lastDataRef.current = data;

      if (onSaveSuccess && draftId) {
        onSaveSuccess(draftId);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save draft');
      console.error('[useAutoSaveDraft] Error saving draft:', error);
      setError(error);

      if (onSaveError) {
        onSaveError(error);
      }
    } finally {
      setIsSaving(false);
      pendingDataRef.current = null;
    }
  }, [draftId, onSaveSuccess, onSaveError]);

  /**
   * Trigger save (debounced for auto-save, immediate for manual save)
   */
  const saveDraft = useCallback(async (data: DraftData, isManual = false) => {
    if (!enabled && !isManual) {
      console.log('[useAutoSaveDraft] Auto-save disabled, skipping');
      return;
    }
    console.log('data', data);
    // Store manual save flag
    isManualSaveRef.current = isManual;

    // Store pending data
    pendingDataRef.current = data;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (isManual) {
      // Manual save: immediate
      console.log('[useAutoSaveDraft] Manual save triggered');
      await performSave(data);
    } else {
      // Auto-save: debounced
      console.log('[useAutoSaveDraft] Auto-save scheduled in', interval, 'ms');
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          performSave(pendingDataRef.current);
        }
      }, interval);
    }
  }, [enabled, interval, performSave]);

  /**
   * Delete draft
   */
  const deleteDraft = useCallback(async () => {
    if (!draftId) {
      console.warn('[useAutoSaveDraft] No draft to delete');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await EmailDraftService.deleteDraft(draftId);
      console.log('[useAutoSaveDraft] Draft deleted:', draftId);

      // Reset state
      setDraftId(null);
      setLastSaved(null);
      lastDataRef.current = null;
      pendingDataRef.current = null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete draft');
      console.error('[useAutoSaveDraft] Error deleting draft:', error);
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [draftId]);

  /**
   * Send draft
   */
  const sendDraft = useCallback(async () => {
    if (!draftId) {
      throw new Error('No draft to send');
    }

    try {
      setIsSaving(true);
      setError(null);

      await EmailDraftService.sendDraft(draftId);
      console.log('[useAutoSaveDraft] Draft sent:', draftId);

      // Reset state
      setDraftId(null);
      setLastSaved(null);
      lastDataRef.current = null;
      pendingDataRef.current = null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send draft');
      console.error('[useAutoSaveDraft] Error sending draft:', error);
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [draftId]);

  /**
   * Reset auto-save state
   */
  const resetAutoSave = useCallback(() => {
    console.log('[useAutoSaveDraft] Resetting auto-save state');

    // Clear timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Reset state
    setDraftId(null);
    setLastSaved(null);
    setError(null);
    setIsSaving(false);
    lastDataRef.current = null;
    pendingDataRef.current = null;
    isManualSaveRef.current = false;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    draftId,
    lastSaved,
    isSaving,
    error,
    saveDraft,
    deleteDraft,
    sendDraft,
    setDraftId,
    resetAutoSave,
  };
}

export default useAutoSaveDraft;

