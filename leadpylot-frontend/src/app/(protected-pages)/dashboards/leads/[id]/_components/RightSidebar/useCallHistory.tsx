import { useInfiniteCallHistory } from '@/services/hooks/useCalls';
import { useInView } from 'react-intersection-observer';
import { useEffect, useMemo } from 'react';

export const useCallHistory = (leadId: string | undefined) => {
  // Setup react-intersection-observer for phone calls
  const { ref: loadMorePhoneRef, inView: phoneInView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Use infinite query for call history
  const {
    data: infiniteCallHistoryData,
    isLoading: callHistoryLoading,
    error: callHistoryError,
    fetchNextPage: fetchNextCallPage,
    hasNextPage: hasNextCallPage,
    isFetchingNextPage: isFetchingNextCallPage,
  } = useInfiniteCallHistory({ lead_id: leadId, limit: 10 });

  // Load more call history when the load more element comes into view
  useEffect(() => {
    if (phoneInView && hasNextCallPage && !isFetchingNextCallPage) {
      fetchNextCallPage();
    }
  }, [phoneInView, hasNextCallPage, isFetchingNextCallPage, fetchNextCallPage]);

  // Transform real call history data for UI from infinite query
  const transformedCallHistory = useMemo(() => {
    const result: any[] = [];

    if (!infiniteCallHistoryData?.pages) {
      return result;
    }

    // Process all pages of call history
    infiniteCallHistoryData.pages.forEach((page) => {
      if (!page.callHistory) return;

      page.callHistory.forEach((call) => {
        const date = new Date(call.created_at).toISOString().split('T')[0];
        const existingDate = result.find((item) => item.date === date);

        const activity = {
          id: call._id,
          actor: call.info.agent_id?.login || call.info.user_id?.login || 'Unknown',
          timestamp: new Date(call.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          type: call.inbox === 'incoming' ? 'call_inbound' : 'call_outbound',
          details: {
            duration: call.metadata.formatted_duration || call.metadata.call_duration || '-',
            notes: call.metadata.notes || '',
            status: call.metadata.call_status,
          },
        };

        if (existingDate) {
          existingDate.activities.push(activity);
        } else {
          result.push({
            id: `date-${date}`,
            date,
            activities: [activity],
          });
        }
      });
    });

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return result;
  }, [infiniteCallHistoryData?.pages]);

  return {
    transformedCallHistory,
    callHistoryLoading,
    callHistoryError,
    hasNextCallPage,
    isFetchingNextCallPage,
    loadMorePhoneRef,
  };
}; 