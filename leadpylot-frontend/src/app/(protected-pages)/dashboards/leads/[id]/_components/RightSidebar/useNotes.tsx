import { useLead, useUpdateLead } from '@/services/hooks/useLeads';

import { useEffect, useRef, useState } from 'react';

// Helper function to check if HTML content is empty or just whitespace/tags
const isEmptyContent = (html: string): boolean => {
  if (!html) return true;
  // Strip HTML tags and check if remaining text is empty or just whitespace
  const textContent = html.replace(/<[^>]+>/g, '').trim();
  return textContent === '';
};

export const useNotes = (leadId: string | undefined) => {
  const currentNotesRef = useRef<string>('');
  const originalNotesRef = useRef<string>('');
  const shouldIgnoreNextUpdateRef = useRef<boolean>(false); // Flag to ignore server update after save
  const [hasChanges, setHasChanges] = useState(false);
  const [editorContent, setEditorContent] = useState<string>(''); // Local state for editor content
  const updateLeadMutation = useUpdateLead(leadId || '');
  const { data: leadData, status: leadStatus } = useLead(leadId || '');
 

  // Initialize currentNotesRef and originalNotesRef when leadData loads
  // This effect syncs server data to local editor state when lead data changes
  useEffect(() => {
    const notes = leadData?.notes || '';
    const previousOriginalNotes = originalNotesRef.current;
    originalNotesRef.current = notes;

    // If we just saved and cleared, ignore this update and reset the flag
    if (shouldIgnoreNextUpdateRef.current) {
      shouldIgnoreNextUpdateRef.current = false;
      return;
    }

    // Only sync from server if:
    // 1. Editor is currently empty (initial load or after clear), OR
    // 2. The original notes changed from server (different lead loaded)
    const shouldSyncFromServer = currentNotesRef.current === '' || previousOriginalNotes !== notes;

    if (shouldSyncFromServer) {
      currentNotesRef.current = notes;
      // Sync server data to editor - this is a valid use case for setState in useEffect

      setEditorContent(notes);
      setHasChanges(false);
    }
  }, [leadData?.notes]);

  // Handle manual save button click
  const handleSaveNotes = (options?: { onSuccess?: () => void }) => {
    updateLeadMutation.mutate(
      {
        notes: currentNotesRef.current,
      },
      {
        onSuccess: () => {
          // Keep the saved notes visible after successful save
          const savedNotes = currentNotesRef.current;
          originalNotesRef.current = savedNotes;
          currentNotesRef.current = savedNotes;
          setEditorContent(savedNotes);
          setHasChanges(false);
          // Ignore the next server update (which will have the saved notes)
          shouldIgnoreNextUpdateRef.current = true;
          options?.onSuccess?.();
        },
      }
    );
  };

  // Handle notes change
  const handleNotesChange = ({ html }: { html: string }) => {
    currentNotesRef.current = html;
    setEditorContent(html); // Update local editor state
    // Check if content has changed from original
    const hasContent = !isEmptyContent(html);
    const isDifferent = html !== originalNotesRef.current;
    setHasChanges(hasContent && isDifferent);
  };

  return {
    leadData,
    leadStatus,
    currentNotesRef,
    updateLeadMutation,
    handleSaveNotes,
    handleNotesChange,
    hasChanges,
    editorContent, // Return editor content for controlled component
  };
};
