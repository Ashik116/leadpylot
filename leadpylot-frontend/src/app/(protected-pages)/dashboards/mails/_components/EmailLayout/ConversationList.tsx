'use client';

/**
 * ConversationList Component - Missive-Style
 * Middle panel showing list of email conversations
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { useEmailStore } from '../../_stores/emailStore';
import { useInfiniteEmailData } from '../../_hooks/useInfiniteEmailData';
import { useEmailNotifications } from '../../_hooks/useEmailNotifications';
import { useOptimisticViewed } from '../../_hooks/useOptimisticViewed';
import { useConversationMerge } from '../../_hooks/useConversationMerge';
import { useDebouncedSearch } from '../../_hooks/useDebouncedSearch';
import { useEmailSelection } from '../../_hooks/useEmailSelection';
import { updateUrlHash } from '../../_hooks/useUrlSync';
import { useStarEmail } from '../../_hooks/useStarEmail';
import ConversationCard from '../Conversation/ConversationCard';
// import DraftCard from '../Conversation/DraftCard';
import AdvancedSearchModal from '../Search/AdvancedSearchModal';
import EmailFilters from '../Filters/EmailFilters';
import MarkAsReadButton from '../Actions/MarkAsReadButton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { EmailFilters as EmailFiltersType, EmailConversation } from '../../_types/email.types';
import useClient from '@/utils/hooks/useClient';
import { useSession } from '@/hooks/useSession';
import CalendarFilterModal from '../Filters/CalendarFilterModal';
import EmailDetailsModal from '../EmailDetail/EmailDetailsModal';
import ConversationListHeader from './ConversationListHeader';

// Constants
const SKELETON_ITEMS = 8;

export default function ConversationList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    filters,
    setFilters,
    selectConversation,
    selectedConversation,
    currentView,
    conversations: storeConversations,
  } = useEmailStore();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalEmailId, setSelectedModalEmailId] = useState<string | null>(null);
  const dateFilterLabel = useMemo(
    () => (filters.date_filter ? dayjs(filters.date_filter).format('MMM D, YYYY') : null),
    [filters.date_filter]
  );

  // Fetch emails with infinite scroll hook
  const {
    conversations: queryConversations,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteEmailData();
  const isClient = useClient();
  const [hasMounted, setHasMounted] = useState(false);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => setHasMounted(true), []);
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  // Optimistic viewed updates management
  const { optimisticViewed, markAsViewed } = useOptimisticViewed(
    queryConversations as any,
    userRole
  );

  // Merge query conversations with store updates and optimistic updates
  const conversations = useConversationMerge(
    queryConversations as any,
    storeConversations,
    optimisticViewed
  );

  // Get the conversation reactively from merged conversations
  // This ensures it updates when cache is updated after assignment
  // The conversations array is reactive because it comes from useConversationMerge which merges query data
  const selectedModalEmail = useMemo(() => {
    if (!selectedModalEmailId) return null;
    // Get from merged conversations - this will update automatically when cache updates
    return conversations.find((conv: any) => conv._id === selectedModalEmailId) || null;
  }, [selectedModalEmailId, conversations]);

  // Email selection management (extracted to custom hook for SRP)
  const {
    selectedEmailIds,
    toggleEmailSelect,
    toggleSelectAll,
    clearSelection,
    isEmailSelected,
    isAllSelected,
    hasSelection,
  } = useEmailSelection(conversations);

  // Star email hook
  const { toggleStar } = useStarEmail();

  const handleStarToggle = useCallback(
    async (emailId: string, isStarred: boolean) => {
      await toggleStar(emailId, isStarred);
    },
    [toggleStar]
  );

  // Debounced search handling
  const { searchTerm, handleSearch, handleClearSearch, setSearchTerm } = useDebouncedSearch(
    filters,
    setFilters
  );

  // Create stable callback for email refresh
  const handleNewEmail = useCallback(
    (notification: any) => {
      // eslint-disable-next-line no-console
      console.log('📧 New email received:', notification.data.subject);
      // Defer refetch to avoid useInsertionEffect timing issues
      setTimeout(() => {
        if (refetch) {
          refetch();
        }
      }, 0);
    },
    [refetch]
  );

  // Listen for real-time new email notifications
  useEmailNotifications({
    onNewEmail: handleNewEmail,
  });

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll — re-run when list is rendered so the sentinel is observed
  useEffect(() => {
    const currentRef = loadMoreRef.current;

    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, root: currentRef.closest('.overflow-y-auto') || undefined }
    );

    observer.observe(currentRef);
    return () => observer.unobserve(currentRef);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, conversations.length]);

  // Advanced search handlers
  const handleAdvancedSearch = useCallback(
    (searchFilters: EmailFiltersType) => {
      setFilters(searchFilters);
      setSearchTerm(searchFilters.search || '');
      setShowAdvancedSearch(false);
    },
    [setFilters, setSearchTerm]
  );

  // Compute header title based on current view
  const headerTitle = useMemo(() => {
    const viewTitles: Record<string, string> = {
      inbox: 'Inbox',
      sent: 'Sent',
      drafts: 'Drafts',
      starred: 'Starred',
      snoozed: 'Snoozed',
      archived: 'Archived',
      all: 'All Mail',
      trash: 'Trash',
      pending: 'Pending',
    };
    return currentView ? viewTitles[currentView] || 'Inbox' : 'Inbox';
  }, [currentView]);

  // Check if we're in drafts view
  const isDraftsView = currentView === 'drafts';

  const skeletons = useMemo(
    () =>
      Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
        <div
          key={`conversation-skeleton-${index}`}
          className="flex cursor-pointer items-stretch gap-3 border-b border-gray-100 bg-white px-4 py-3 transition-colors"
        >
          <div className="flex shrink-0 flex-col items-center gap-3">
            <span className="h-4 w-4 rounded border border-gray-200 bg-gray-100" />
            <span className="h-10 w-10 rounded-full bg-gray-100" />
          </div>
          <div className="flex w-full flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="h-4 w-32 rounded bg-gray-100" />
              <span className="h-3 w-16 rounded bg-gray-100" />
            </div>
            <div className="h-4 w-48 rounded bg-gray-100" />
            <div className="flex gap-2">
              <span className="h-3 flex-1 rounded bg-gray-100" />
              <span className="h-3 w-24 rounded bg-gray-100" />
            </div>
          </div>
        </div>
      )),
    []
  );

  // Handle conversation click - update both store and URL
  const handleConversationClick = useCallback(
    (conversation: EmailConversation) => {
      // Optimistically mark as viewed
      const optimisticUpdate = markAsViewed(conversation);

      if (optimisticUpdate) {
        // Update store with optimistic update
        const { updateConversation } = useEmailStore.getState();
        updateConversation(conversation._id, optimisticUpdate);
      }

      // Defer state updates to avoid useInsertionEffect timing issues
      setTimeout(() => {
        selectConversation(conversation);
        updateUrlHash(currentView, conversation._id);
      }, 0);
    },
    [selectConversation, currentView, markAsViewed]
  );

  const handleClearDateFilter = useCallback(() => {
    if (!filters.date_filter) return;
    const newFilters = { ...filters };
    delete newFilters.date_filter;
    setFilters(newFilters);
  }, [filters, setFilters]);

  const updateModalParams = useCallback(
    (emailId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (emailId) {
        params.set('tabType', 'email');
        params.set('emailId', emailId);
      } else {
        params.delete('tabType');
        params.delete('emailId');
      }
      const query = params.toString();
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      router.replace(`${pathname}${query ? `?${query}` : ''}${hash}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Handle opening modal for email details
  const handleOpenModal = useCallback((conversation: EmailConversation) => {
    setSelectedModalEmailId(conversation._id);
    setIsModalOpen(true);
    updateModalParams(conversation._id);
  }, [updateModalParams]);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ConversationListHeader
        conversationsCount={conversations.length}
        headerTitle={headerTitle}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onOpenCalendarFilter={() => setShowCalendarFilter(true)}
        onOpenAdvancedSearch={() => setShowAdvancedSearch(true)}
        dateFilterLabel={dateFilterLabel}
        onClearDateFilter={handleClearDateFilter}
      />
      {/* Filters */}
      <div className="shrink-0">
        <EmailFilters />
      </div>
      {/* Mark as Read Button */}
      {hasSelection && (
        <div className="shrink-0 border-b border-gray-200 p-2">
          <MarkAsReadButton selectedEmailIds={selectedEmailIds} onClearSelection={clearSelection} />
        </div>
      )}
      {/* Conversation List */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-12">
        {!hasMounted || (isLoading && conversations.length === 0) ? (
          <div className="flex animate-pulse flex-col divide-y divide-gray-100">{skeletons}</div>
        ) : conversations.length === 0 && isClient ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <ApolloIcon
              name={isDraftsView ? 'file' : 'mail'}
              className="mb-4 text-4xl text-gray-300"
            />
            <p className="text-[0.8152375rem] text-gray-500">
              {searchTerm
                ? `No ${isDraftsView ? 'drafts' : 'emails'} match your search`
                : isDraftsView
                  ? 'No drafts yet. Start composing to create a draft.'
                  : 'No emails found'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation._id}
                  conversation={conversation}
                  isSelected={selectedConversation?._id === conversation._id}
                  isChecked={isEmailSelected(conversation._id)}
                  onSelect={toggleEmailSelect}
                  onClick={() => handleConversationClick(conversation)}
                  onStarToggle={handleStarToggle}
                  isDraftsView={isDraftsView}
                  onOpenModal={handleOpenModal}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel + Load more button */}
            <div
              ref={loadMoreRef}
              className="flex min-h-[5rem] flex-col items-center justify-center gap-3 border-t border-gray-100 bg-white py-3 pb-3"
            >
              {hasNextPage && (
                <Button
                  variant="default"
                  size="sm"
                  loading={isFetchingNextPage}
                  disabled={isFetchingNextPage}
                  onClick={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                  }}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              )}

              {!hasNextPage && conversations.length > 0 && (
                <div className="text-sm text-gray-400 ">No more emails</div>
              )}
            </div>
          </>
        )}
      </div>
      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearchModal
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
        />
      )}
      {/* Calendar Filter Modal */}
      {showCalendarFilter && <CalendarFilterModal onClose={() => setShowCalendarFilter(false)} />}

      {/* Email Details Modal */}
      <EmailDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedModalEmailId(null);
          updateModalParams(null);
        }}
        conversation={selectedModalEmail}
      />
    </div>
  );
}
