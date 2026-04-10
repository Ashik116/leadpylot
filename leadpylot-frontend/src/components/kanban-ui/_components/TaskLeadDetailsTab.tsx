'use client';

import React, { useEffect, useMemo } from 'react';
import { ApiTask } from '@/services/TaskService';
import OpeningDetailsPopup from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/OpeningDetailsPopup';
import LeadDetailsPage from '@/app/(protected-pages)/dashboards/leads/[id]/page';
import { useCurrentOfferId } from '@/hooks/useCurrentOfferId';
import { DashboardType, TDashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import { DetailsTabSkeleton } from './DetailsTabSkeleton';

interface TaskLeadDetailsTabProps {
  task: ApiTask;
  taskLeadDetails: ReturnType<typeof import('../_hooks/useTaskLeadDetails').useTaskLeadDetails>;
}

const TaskLeadDetailsTab: React.FC<TaskLeadDetailsTabProps> = ({ task, taskLeadDetails }) => {
  const { setOfferId } = useCurrentOfferId();

  // Map task_type to DashboardType for consistency with OpeningDetailsPopup
  const dashboardType: TDashboardType = useMemo(() => {
    if (task?.task_type === 'opening') {
      return DashboardType.OPENING;
    }
    if (task?.task_type === 'offer') {
      return DashboardType.OFFER;
    }
    return DashboardType.OPENING; // Default fallback
  }, [task?.task_type]);

  // Extract data from taskLeadDetails
  const {
    leadId,
    offerId,
    emailId,
    offerData,
    isEmailTaskType,
  } = taskLeadDetails;

  const normalizedTaskType = (task?.task_type || '').toLowerCase();
  const resolvedEmailId = useMemo(() => {
    if (emailId) return String(emailId);
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
    return candidate ? String(candidate) : undefined;
  }, [emailId, task]);

  const isOfferOrOpening =
    task?.task_type === 'opening' || task?.task_type === 'offer';
  const isEmailTask =
    isEmailTaskType ||
    (!!resolvedEmailId && !isOfferOrOpening);
  const leadDetailsType = isOfferOrOpening
    ? task?.task_type
    : isEmailTask
      ? 'email'
      : undefined;

  const leadDetailsId = useMemo(() => {
    if (isEmailTask) {
      return resolvedEmailId;
    }
    if (task?.task_type === 'opening' || task?.task_type === 'offer') {
      return offerId ? String(offerId) : undefined;
    }
    return undefined;
  }, [isEmailTask, offerId, resolvedEmailId, task?.task_type]);

  const leadDetailsDefaultTab = useMemo(() => {
    if (task?.task_type === 'opening') return 'openings';
    if (task?.task_type === 'offer') return 'offers';
    return undefined;
  }, [task?.task_type]);

  // Set offer ID in context when we have it (for ticket creation)
  useEffect(() => {
    if ((task?.task_type === 'opening' || task?.task_type === 'offer') && offerId) {
      setOfferId(String(offerId));
    } else {
      setOfferId(null);
    }
    return () => {
      // Cleanup: clear offer ID when component unmounts
      setOfferId(null);
    };
  }, [task?.task_type, offerId, setOfferId]);

  // Extract lead ID for UpdatesPanel (for 'lead' and 'email' types)
  // Must be declared before any early returns to satisfy React Hooks rules
  const updatesPanelLeadId = useMemo(() => {
    return leadId || undefined;
  }, [leadId]);
  if (task?.task_type === 'lead' || task?.task_type === 'email' || task?.task_type === 'opening' || task?.task_type === 'offer') {
    if (!updatesPanelLeadId) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-gray-500">
          <p className="text-sm">No lead associated</p>
        </div>
      );
    }

    return (
      <div className="h-full overflow-hidden p-2">
        <LeadDetailsPage
          leadId={updatesPanelLeadId}
          showInDialog
          detailsType={leadDetailsType}
          detailsId={leadDetailsId}
          defaultActiveTab={leadDetailsDefaultTab}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-6 text-gray-500">
      <p className="text-sm">No data available</p>
    </div>
  );
};

export default TaskLeadDetailsTab;
