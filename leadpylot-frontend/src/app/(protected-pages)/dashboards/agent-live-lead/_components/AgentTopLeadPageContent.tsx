'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTopLead } from '@/utils/hooks/useCurrentTopLead';
import { apiNavigateToLead } from '@/services/LeadsService';
import { LeadDetails } from '../../leads/[id]/_components/LeadDetails';
import LeadContentSkeleton from '../../leads/[id]/_components/LeadDetails/components/LeadContentSkeleton';
import LeadHeader from '../../leads/[id]/_components/LeadDetails/components/LeadHeader';
import LeadsInformationTab from '../../leads/_components/LeadsInformationTab';
import { handleApiError } from '@/utils/errorHandler';
import AccessDenied from '@/components/shared/AccessDenied';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import NotFound from '@/components/shared/NotFound';

interface AgentTopLeadPageContentProps {
  source: 'live' | 'recycle' | 'Live' | 'Recycle';
}

export default function AgentTopLeadPageContent({ source }: AgentTopLeadPageContentProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [isAddOpeningOpen, setIsAddOpeningOpen] = useState(false);
  const { selectedProject } = useSelectedProjectStore();
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null); // null = current top

  // Fetch current top lead (when viewingLeadId is null)
  const currentTopQuery = useCurrentTopLead({
    enabled: session?.user?.role === Role.AGENT && viewingLeadId === null,
    params: {
      project_name: selectedProject?.name,
      source: source,
    },
  });

  // Fetch specific lead via navigate endpoint (when viewingLeadId is set)
  const navigateQuery = useQuery({
    queryKey: ['queue-navigate', viewingLeadId, source, selectedProject?.name],
    queryFn: () =>
      apiNavigateToLead(viewingLeadId!, {
        project_name: selectedProject?.name,
        source: source,
      }),
    enabled: session?.user?.role === Role.AGENT && viewingLeadId !== null,
  });

  // Use the appropriate query based on viewingLeadId
  const lead = viewingLeadId === null ? currentTopQuery.lead : navigateQuery.data?.data;

  const navigation =
    viewingLeadId === null ? currentTopQuery.navigation : navigateQuery.data?.navigation;

  const queueInfo =
    viewingLeadId === null ? currentTopQuery.queueInfo : navigateQuery.data?.queue_info;

  const isLoading = viewingLeadId === null ? currentTopQuery.isLoading : navigateQuery.isLoading;

  const isError = viewingLeadId === null ? currentTopQuery.isError : navigateQuery.isError;

  const error = viewingLeadId === null ? currentTopQuery.error : navigateQuery.error;

  const handleAddOpeningClick = useCallback(() => {
    setIsAddOpeningOpen(!isAddOpeningOpen);
  }, [isAddOpeningOpen]);

  // Navigation handlers that update state without changing URL
  const handleNavigateToPrevious = useCallback(() => {
    if (navigation && 'previous_lead_id' in navigation && navigation.previous_lead_id) {
      setViewingLeadId(navigation.previous_lead_id);
    }
  }, [navigation]);

  const handleNavigateToNext = useCallback(() => {
    if (navigation && 'next_is_current_top' in navigation) {
      if (navigation.next_is_current_top) {
        // Go back to current top
        setViewingLeadId(null);
      } else if (navigation.next_lead_id) {
        setViewingLeadId(navigation.next_lead_id);
      }
    }
  }, [navigation]);

  const handleComplete = useCallback(async () => {
    // After completion, go back to current top
    setViewingLeadId(null);
  }, []);

  const skeletonLeadData = useMemo(
    () =>
      ({
        _id: 'skeleton',
        reclamation_status: 'pending',
      }) as any,
    []
  );

  const skeletonHeaderProps = useMemo(
    () => ({
      currentPosition: 1,
      totalUsers: 1,
      canGoToPrevious: false,
      canGoToNext: false,
      isAdmin: false,
      onPrevious: () => {},
      onNext: () => {},
      onDelete: () => {},
      lead: skeletonLeadData,
      assignment: {},
      hasActiveFilters: false,
      filterState: null,
    }),
    [skeletonLeadData]
  );

  if (sessionStatus === 'loading') {
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 rounded-2xl border-b bg-white shadow-sm">
          <LeadHeader {...skeletonHeaderProps} />
        </div>
        <div className="mt-4 flex-1">
          <LeadContentSkeleton />
        </div>
      </div>
    );
  }

  if (session?.user?.role !== Role.AGENT) {
    return <AccessDenied />;
  }

  if (isError) {
    const errorResult = handleApiError(error);
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 rounded-2xl border-b bg-white shadow-sm">
          <LeadHeader {...skeletonHeaderProps} />
        </div>
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-red-800">Error loading lead</h3>
            <p className="text-red-600">{errorResult.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 rounded-2xl border-b bg-white shadow-sm">
          <LeadHeader {...skeletonHeaderProps} />
        </div>
        <div className="mt-4 flex-1">
          <LeadContentSkeleton />
        </div>
      </div>
    );
  }

  if (!lead && queueInfo?.total_in_queue === 0) {
    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 rounded-2xl border-b bg-white shadow-sm">
          <LeadHeader {...skeletonHeaderProps} />
        </div>
        <div className="mt-4 flex-1 p-6">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">No leads in queue</h3>
            <p className="text-gray-600">Your queue is currently empty.</p>
            {queueInfo && (
              <div className="mt-4 text-sm text-gray-500">
                Total in queue: {queueInfo.total_in_queue}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return <NotFound />;
  }

  return (
    <div>
      <LeadDetails
        lead={lead}
        isAddOpeningOpen={isAddOpeningOpen}
        setIsAddOpeningOpen={setIsAddOpeningOpen}
        queueNavigation={navigation || undefined}
        uiHints={undefined}
        // Pass navigation handlers that update state without changing URL
        onNavigatePrevious={handleNavigateToPrevious}
        onNavigateNext={handleNavigateToNext}
        onNavigateComplete={handleComplete}
        queueInfo={queueInfo || undefined}
      />
      <LeadsInformationTab
        lead={lead as any}
        highlightedOfferId={''}
        handleAddOpeningClick={handleAddOpeningClick}
      />
    </div>
  );
}
