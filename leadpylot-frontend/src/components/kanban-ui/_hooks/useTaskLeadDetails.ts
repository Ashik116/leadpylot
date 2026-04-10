import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiTask } from '@/services/TaskService';
import { useOpeningById } from '@/services/hooks/useOffersProgress';
import { useLeadDetails } from '@/app/(protected-pages)/dashboards/mails/_hooks/useEmailData';
import emailApiService from '@/app/(protected-pages)/dashboards/mails/_services/EmailApiService';

interface UseTaskLeadDetailsProps {
  task: ApiTask | undefined;
  activeTab: 'details' | 'kanban';
  forceEmailTask?: boolean;
}

export const useTaskLeadDetails = ({ task, activeTab, forceEmailTask }: UseTaskLeadDetailsProps) => {
  const normalizedTaskType = (task?.task_type || '').toLowerCase();
  const isEmailTaskType = normalizedTaskType.includes('email') || !!forceEmailTask;
  const isOpeningTask = normalizedTaskType === 'opening';
  const isOfferTask = normalizedTaskType === 'offer';

  // Check if tabs should be shown (only for "opening", "lead", "offer", or "email" task types)
  const shouldShowTabs = 
    isOpeningTask || 
    task?.task_type === 'lead' || 
    isOfferTask || 
    isEmailTaskType;

  // Extract lead ID from task - can be object with _id or string
  const leadId = useMemo(() => {
    if (!task?.lead_id) return null;
    if (typeof task.lead_id === 'string') {
      return task.lead_id;
    }
    if (typeof task.lead_id === 'object' && task.lead_id !== null && '_id' in task.lead_id) {
      return (task.lead_id as { _id: string })._id || null;
    }
    return null;
  }, [task?.lead_id]);

  // Extract offer ID from task - can be object with _id or string
  // For 'opening' task type: fallback to opening_id if offer_id is not found
  const offerId = useMemo(() => {
    // First try to get offer_id
    if (task?.offer_id) {
      if (typeof task.offer_id === 'string') {
        return task.offer_id;
      }
      if (typeof task.offer_id === 'object' && task.offer_id !== null && '_id' in task.offer_id) {
        return (task.offer_id as { _id: string })._id || null;
      }
    }
    
    // For 'opening' task type: fallback to opening_id if offer_id is not found
    if (isOpeningTask && task?.opening_id) {
      if (typeof task.opening_id === 'string') {
        return task.opening_id;
      }
      if (typeof task.opening_id === 'object' && task.opening_id !== null && '_id' in task.opening_id) {
        return (task.opening_id as { _id: string })._id || null;
      }
      // If opening_id is an object but doesn't have _id, try to get it directly
      if (typeof task.opening_id === 'object' && task.opening_id !== null) {
        return (task.opening_id as any)._id || null;
      }
    }
    
    return null;
  }, [task]);

  // Extract email ID from task - can be object with _id or string
  const emailId = useMemo(() => {
    const rawTask = task as any;
    const subjectEmailId = rawTask?.subject_type === 'Email' ? rawTask?.subject_id : null;
    const candidate =
      rawTask?.email_id?._id ||
      rawTask?.email_id ||
      rawTask?.emailId ||
      rawTask?.metadata?.email_id?._id ||
      rawTask?.metadata?.email_id ||
      rawTask?.metadata?.email?._id ||
      rawTask?.metadata?.email ||
      rawTask?.details?.email_id?._id ||
      rawTask?.details?.email_id ||
      subjectEmailId;
    return candidate ? String(candidate) : null;
  }, [task]);

  const shouldFetchEmailTaskDetails =
    isEmailTaskType && activeTab === 'details' && !!task?._id && (!emailId || !leadId);

  const { data: emailTaskDetails } = useQuery({
    queryKey: ['email-task-details', task?._id],
    queryFn: async () => {
      if (!task?._id) return null;
      const response = await emailApiService.getTaskDetails(task._id);
      return response?.data || null;
    },
    enabled: shouldFetchEmailTaskDetails,
    staleTime: 0,
  });

  const emailIdFromTaskDetails = useMemo(() => {
    const rawEmail = (emailTaskDetails as any)?.task?.email_id;
    const candidate = rawEmail?._id || rawEmail || null;
    return candidate ? String(candidate) : null;
  }, [emailTaskDetails]);

  const leadIdFromTaskDetails = useMemo(() => {
    const details = emailTaskDetails as any;
    const leadCandidate =
      details?.leadDetails?._id ||
      details?.task?.lead_id?._id ||
      details?.task?.lead_id ||
      null;
    return leadCandidate ? String(leadCandidate) : null;
  }, [emailTaskDetails]);

  const resolvedEmailId = emailId || emailIdFromTaskDetails;
  const resolvedLeadId = leadId || leadIdFromTaskDetails;

  // Fetch offer data for 'opening' and 'offer' task types when Details tab is active
  const { data: offerData, isLoading: isLoadingOffer, error: offerError } = useOpeningById(
    activeTab === 'details' && (isOpeningTask || isOfferTask) && offerId
      ? offerId
      : undefined,
    activeTab === 'details' && (isOpeningTask || isOfferTask)
  );

  // Fetch lead data for all task types when Details tab is active and we have leadId
  const { data: leadData, isLoading: isLoadingLead, error: leadError } = useLeadDetails(
    activeTab === 'details' && resolvedLeadId ? resolvedLeadId : null
  );

  // Create conversation-like object for LeadDetailsForMail component (for 'lead' and 'email' types)
  const conversationForLeadDetails = useMemo(() => {
    if ((task?.task_type === 'lead' || isEmailTaskType) && resolvedLeadId) {
      return {
        lead_id: resolvedLeadId,
      } as any;
    }
    return null;
  }, [task?.task_type, resolvedLeadId, isEmailTaskType]);

  // Extract lead from offer data (for 'opening' and 'offer' types)
  const leadFromOffer = useMemo(() => {
    if ((isOpeningTask || isOfferTask) && offerData) {
      const lead = offerData.lead_id || null;
      if (lead && offerData.project_id) {
        return {
          ...lead,
          project: offerData.project_id,
          project_id: offerData.project_id,
        };
      }
      return lead;
    }
    return null;
  }, [task?.task_type, offerData]);

  // Extract offers array from offer data
  const offersFromOfferData = useMemo(() => {
    if ((isOpeningTask || isOfferTask) && offerData) {
      if (Array.isArray((offerData as any).offers)) {
        return (offerData as any).offers;
      }
      return offerData ? [offerData] : [];
    }
    return [];
  }, [task?.task_type, offerData]);

  // Extract opening data from offer (for 'opening' task type)
  const openingFromOffer = useMemo(() => {
    if ((isOpeningTask || isOfferTask) && offerData) {
      return {
        ...offerData,
        _id: offerData._id,
        offer_id: offerData._id,
        ...offerData.progression?.opening,
      };
    }
    return null;
  }, [task?.task_type, offerData]);

  // Extract documents from offer data
  const documentsFromOffer = useMemo(() => {
    if ((isOpeningTask || isOfferTask) && offerData) {
      const allFiles: any[] = [];
      if (offerData.files && Array.isArray(offerData.files)) {
        allFiles.push(...offerData.files);
      }
      if (offerData.progression?.opening?.files && Array.isArray(offerData.progression.opening.files)) {
        allFiles.push(...offerData.progression.opening.files);
      }
      const uniqueFiles = Array.from(
        new Map(allFiles.map((file) => [file?._id || file?.document?._id, file])).values()
      );
      return uniqueFiles;
    }
    return [];
  }, [task?.task_type, offerData]);

  // Extract lead from leadData (for 'lead' and 'email' types)
  const lead = useMemo(() => {
    if (leadData) {
      return leadData?.lead || leadData?.data?.lead || leadData?.data || leadData;
    }
    return null;
  }, [leadData]);

  // Extract offers from leadData (for 'lead' and 'email' types)
  const offers = useMemo(() => {
    if (leadData) {
      return leadData?.offers || leadData?.data?.offers || [];
    }
    return [];
  }, [leadData]);

  // Extract all documents from leadData (for 'lead' and 'email' types)
  const allDocuments = useMemo(() => {
    if (leadData) {
      const allFiles: any[] = [];
      const offers = leadData?.offers || leadData?.data?.offers || [];
      offers.forEach((offer: any) => {
        if (offer?.files && Array.isArray(offer.files)) {
          allFiles.push(...offer.files);
        }
      });
      const topLevelDocs = leadData?.documents?.all || leadData?.data?.documents?.all || [];
      if (Array.isArray(topLevelDocs)) {
        allFiles.push(...topLevelDocs);
      }
      const uniqueFiles = Array.from(
        new Map(allFiles.map((file) => [file?._id || file?.document?._id, file])).values()
      );
      return uniqueFiles;
    }
    return [];
  }, [leadData]);

  return {
    shouldShowTabs,
    // IDs
    leadId: resolvedLeadId,
    offerId,
    emailId: resolvedEmailId,
    isEmailTaskType,
    // Data
    offerData,
    leadData,
    lead,
    leadFromOffer,
    offers,
    offersFromOfferData,
    openingFromOffer,
    documentsFromOffer,
    allDocuments,
    // Loading states
    isLoadingOffer,
    isLoadingLead,
    // Errors
    offerError,
    leadError,
    // Conversation object for LeadDetailsForMail
    conversationForLeadDetails,
  };
};
