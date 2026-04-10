/**
 * useInfiniteEmailData Hook
 * Infinite scroll implementation for email conversations
 */

import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useSession } from '@/hooks/useSession';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { EmailApiService } from '../_services';
import { useEmailStore } from '../_stores/emailStore';

const PAGE_SIZE = 20;

export function useInfiniteEmailData() {
  const { setConversations, filters } = useEmailStore();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  // Infinite query for conversations
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } =
    useInfiniteQuery({
      queryKey: ['email-conversations-infinite', filters, userRole],
      queryFn: ({ pageParam = 1 }) =>
        EmailApiService.getConversations(filters, pageParam, PAGE_SIZE, userRole),
      getNextPageParam: (lastPage, allPages) => {
        // Check if there are more pages
        const currentPage = allPages.length;
        const totalPages = lastPage.meta?.pages || 0;
        return currentPage < totalPages ? currentPage + 1 : undefined;
      },
      initialPageParam: 1,

      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      enabled: !!userRole,
    });

  // Flatten all pages into single conversations array - memoized to prevent infinite loops
  const conversations = useMemo(() => {
    return data?.pages.flatMap((page) => page.conversations) || [];
  }, [data?.pages]);

  // Update store when data changes
  useEffect(() => {
    if (conversations.length > 0) {
      setConversations(conversations as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]); // setConversations is stable (Zustand), no need in deps

  // Log any errors
  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Email fetch error:', error);
      toast.push(
        <Notification title="Error" type="danger">
          Failed to load emails: {(error as any)?.message || 'Unknown error'}
        </Notification>
      );
    }
  }, [error]);

  // Get pagination metadata from last page
  const pagination = data?.pages[data.pages.length - 1]?.meta;

  return {
    conversations,
    pagination,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  };
}
