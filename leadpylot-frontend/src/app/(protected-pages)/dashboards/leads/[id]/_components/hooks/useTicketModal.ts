/**
 * Custom hook for TicketModal business logic
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePredefinedSubtasks } from '@/services/hooks/usePredefinedSubtasks';
import { useCreateTaskFromEmail } from '@/services/hooks/useToDo';
import { useCreateTask } from '@/hooks/useTasks';
import type { CreateTaskRequest } from '@/services/TaskService';
import { MAX_DESCRIPTION_LENGTH } from '../TicketModal.constants';
import { extractErrorMessage } from '../TicketModal.utils';
import useNotification from '@/utils/hooks/useNotification';
import { useCurrentOfferId } from '@/hooks/useCurrentOfferId';
import { useQueryClient } from '@tanstack/react-query';

interface UseTicketModalProps {
  isOpen: boolean;
  leadId: string;
  onClose: () => void;
  offers: any[];
  opening?: any; // Optional opening data to get default agent
  dashboardType?: 'offer' | 'opening' | 'lead'; // Dashboard type to determine entity ID field
  taskType?: string;
  emailId?: string; // Email ID for email task type
}

export const useTicketModal = ({ isOpen, leadId, onClose, offers, opening, dashboardType, taskType, emailId }: UseTicketModalProps) => {
  // State
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<string[]>([]);
  const [selectedOfferFiles, setSelectedOfferFiles] = useState<string[]>([]);
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([]);
  const autoTitleRef = useRef<string | null>(null);

  // Track if default files have been set to avoid setting them multiple times
  const defaultFilesSetRef = useRef(false);

  // Get current offer ID from context (set when OpeningDetailsPopup is open)
  const { offerId: currentOfferId } = useCurrentOfferId();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const emailIdFromUrl = searchParams.get('emailId') || undefined;
  const resolvedEmailId = emailId || emailIdFromUrl || undefined;

  // Hooks - conditionally use email mutation for email tasks
  const createTaskMutation = useCreateTask();
  const createTaskFromEmailMutation = useCreateTaskFromEmail(resolvedEmailId || '', leadId);
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  const entityParam = useMemo(() => {
    const deriveEntityFromPath = (path?: string | null) => {
      if (!path) return undefined;
      if (/^\/dashboards\/leads\/[a-f0-9]{24}$/i.test(path)) return 'lead';
      if (path.startsWith('/dashboards/mails')) return 'email';
      if (path.startsWith('/dashboards/offers')) return 'offer';
      if (
        path.startsWith('/dashboards/openings') ||
        path.startsWith('/dashboards/confirmation') ||
        path.startsWith('/dashboards/payment') ||
        path.startsWith('/dashboards/netto') ||
        path.startsWith('/dashboards/payment-vouchers')
      ) {
        return 'opening';
      }
      return undefined;
    };

    const normalizeEntityInput = (value?: string) => {
      if (!value) return undefined;
      const normalized = value.toLowerCase();
      if (['lead', 'offer', 'opening', 'email'].includes(normalized)) return normalized;
      if (['confirmation', 'payment', 'netto', 'netto1', 'netto2', 'lost'].includes(normalized)) {
        return 'opening';
      }
      if (normalized === 'offer_tickets' || normalized === 'offers') return 'offer';
      if (normalized === 'mails' || normalized === 'mail') return 'email';
      return undefined;
    };

    const derivedFromPath = deriveEntityFromPath(pathname);
    const normalizedTaskType = normalizeEntityInput(taskType);
    const normalizedDashboardType = normalizeEntityInput(dashboardType);

    const rawEntity =
      derivedFromPath ||
      normalizedTaskType ||
      normalizedDashboardType ||
      (resolvedEmailId ? 'email' : undefined) ||
      'lead';
    return rawEntity;
  }, [taskType, dashboardType, resolvedEmailId, pathname]);
  const {
    data: predefinedSubtasksData,
    isLoading: isLoadingTicketTypes,
    refetch: refetchTodoTypes,
  } = usePredefinedSubtasks({
    isActive: true,
    entity: entityParam,
    enabled: isOpen,
  });

  // Memoized data
  const activeTicketTypes = useMemo(() => {
    return predefinedSubtasksData?.data || [];
  }, [predefinedSubtasksData]);

  const documentIds = useMemo(() => {
    // Merge uploaded document IDs with selected offer file IDs
    return [...uploadedDocumentIds, ...selectedOfferFiles];
  }, [uploadedDocumentIds, selectedOfferFiles]);

  const isValid = useMemo(() => {
    if (selectedTicketTypes.length === 1) return true;
    return description.trim().length > 0;
  }, [description, selectedTicketTypes.length]);

  const isCreating = useMemo(() => {
    return createTaskMutation.isPending || createTaskFromEmailMutation.isPending;
  }, [createTaskMutation.isPending, createTaskFromEmailMutation.isPending]);

  // Extract all files from all offers
  const offerFiles = useMemo(() => {
    if (!offers || !Array.isArray(offers) || offers.length === 0) return [];

    const allFiles: Array<{
      _id: string;
      filename: string;
      filetype: string;
      size: number;
      type: string;
      offerId: string;
      offerReference?: string;
    }> = [];

    offers.forEach((offer: any) => {
      if (offer.files && Array.isArray(offer.files)) {
        offer.files.forEach((file: any) => {
          if (file._id && file.filename) {
            // Extract offer reference from title (format: "Name - Amount - Bank")
            // or use investment_volume as reference
            const offerReference =
              offer.reference_no ||
              (offer.title ? offer.title.split(' - ')[1] : undefined) ||
              offer.investment_volume?.toString();

            allFiles.push({
              _id: file._id,
              filename: file.filename,
              filetype: file.filetype || 'application/octet-stream',
              size: file.size || 0,
              type: file.type || 'extra',
              offerId: offer._id,
              offerReference,
            });
          }
        });
      }
    });

    return allFiles;
  }, [offers]);


  // Set default selected offer files when modal opens
  useEffect(() => {
    if (isOpen && offerFiles.length > 0 && !defaultFilesSetRef.current) {
      // Select all offer files by default
      const allFileIds = offerFiles.map((file) => file._id);
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setSelectedOfferFiles(allFileIds);
        defaultFilesSetRef.current = true;
      }, 0);
    }
    // Reset the ref when modal closes
    if (!isOpen) {
      defaultFilesSetRef.current = false;
    }
  }, [isOpen, offerFiles]);

  // Handlers
  const handleTicketTypeToggle = useCallback((ticketTypeId: string) => {
    setSelectedTicketTypes((prev) =>
      prev.includes(ticketTypeId)
        ? prev.filter((id) => id !== ticketTypeId)
        : [...prev, ticketTypeId]
    );
  }, []);

  const handleDocumentIdsChange = useCallback((documentIds: string[]) => {
    setUploadedDocumentIds(documentIds);
  }, []);

  const handleOfferFileToggle = useCallback((fileId: string) => {
    setSelectedOfferFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  }, []);

  const handleOfferFilesChange = useCallback((selectedFileIds: string[]) => {
    setSelectedOfferFiles(selectedFileIds);
  }, []);

  const handleAssignedChange = useCallback((ids: string[]) => {
    setSelectedAssignedIds(ids);
  }, []);

  const resetForm = useCallback(() => {
    setSelectedTicketTypes([]);
    setDescription('');
    setUploadedDocumentIds([]);
    setSelectedOfferFiles([]);
    setTaskDescription('');
    setSelectedAssignedIds([]);
    defaultFilesSetRef.current = false;
    autoTitleRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSave = useCallback(async () => {
    if (selectedTicketTypes.length !== 1 && !description.trim()) {
      openNotification({ type: 'warning', massage: 'Please enter a title' });
      return;
    }

    const hasSingleSelection = selectedTicketTypes.length === 1;

    const handleSuccess = () => {
      openNotification({ type: 'success', massage: 'Ticket created successfully' });
      handleDiscard();
    };
    const handleError = (error: unknown) => {
      const errorMsg = extractErrorMessage(error) || 'Failed to create ticket. Please try again.';
      openNotification({ type: 'danger', massage: errorMsg });
    };
    // Handle email task type
    if (taskType === 'email' && resolvedEmailId) {
      createTaskFromEmailMutation.mutate(
        { taskTitle: description.trim() },
        { onSuccess: handleSuccess, onError: handleError }
      );
      return;
    }

    const subTaskIds = selectedTicketTypes.length > 0 ? selectedTicketTypes : undefined;
    const selectedType = hasSingleSelection
      ? activeTicketTypes.find((item: any) => item?._id === selectedTicketTypes[0])
      : null;
    const resolvedTitle =
      description.trim() || selectedType?.taskTitle?.trim() || '';

    const payload: CreateTaskRequest = {
      lead_id: leadId,
      task_type: entityParam,
      taskTitle: resolvedTitle,
      taskDescription:
        selectedTicketTypes.length > 1 || selectedTicketTypes.length === 0
          ? taskDescription.trim() || undefined
          : undefined,
      ...(subTaskIds && { subTask: subTaskIds }),
      attachment:
        selectedTicketTypes.length > 1 || selectedTicketTypes.length === 0
          ? documentIds.length > 0
            ? documentIds
            : undefined
          : undefined,
      // Add offer_id if available (from OpeningDetailsPopup context)
      ...(currentOfferId && { offer_id: currentOfferId }),
      ...(entityParam === 'email' && resolvedEmailId ? { email_id: resolvedEmailId } : undefined),
      ...(selectedTicketTypes.length > 1 || selectedTicketTypes.length === 0
        ? selectedAssignedIds.length > 0
          ? { assigned: selectedAssignedIds }
          : undefined
        : undefined),
    };

    createTaskMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasksByEntity'] });
        queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
        handleSuccess();
      },
      onError: handleError,
    });
  }, [
    description,
    selectedTicketTypes,
    activeTicketTypes,
    taskDescription,
    documentIds,
    leadId,
    taskType,
    entityParam,
    resolvedEmailId,
    currentOfferId,
    selectedAssignedIds,
    createTaskMutation,
    createTaskFromEmailMutation,
    handleDiscard,
    openNotification,
    queryClient,
  ]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  }, []);

  const handleTaskDescriptionChange = useCallback((html: string) => {
    setTaskDescription(html);
  }, []);

  useEffect(() => {
    if (selectedTicketTypes.length === 1) {
      const selectedType = activeTicketTypes.find(
        (item: any) => item?._id === selectedTicketTypes[0]
      );
      const title = selectedType?.taskTitle || '';
      if (title && description !== title) {
        setTimeout(() => {
          setDescription(title);
        }, 0);
      }
      autoTitleRef.current = title || null;
      return;
    }

    if (autoTitleRef.current !== null) {
      setTimeout(() => {
        setDescription('');
      }, 0);
      autoTitleRef.current = null;
    }
  }, [activeTicketTypes, selectedTicketTypes, description]);

  return {
    // State
    selectedTicketTypes,
    description,
    uploadedDocumentIds,
    selectedOfferFiles,
    taskDescription,
    selectedAssignedIds,

    // Loading states
    isLoadingTicketTypes,
    isCreating,

    // Data
    activeTicketTypes,
    offerFiles,

    // Validation
    isValid,

    // Handlers
    handleTicketTypeToggle,
    handleDocumentIdsChange,
    handleOfferFileToggle,
    handleOfferFilesChange,
    handleAssignedChange,
    handleDescriptionChange,
    handleTaskDescriptionChange,
    handleSave,
    handleDiscard,
    resetForm,

    // Mutation
    createTaskMutation,
    createTaskFromEmailMutation,

    // Refetch
    refetchTodoTypes,
  };
};
