'use client';

/**
 * NotificationTableBody Component
 *
 * Compact table view for notifications (Monday.com-style inbox).
 * Features: multi-select, bulk actions, search, sort, quick tabs, and compact rows (40px).
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import classNames from '@/utils/classNames';
import { NotificationData, isNotificationRead } from '@/stores/notificationStore';
import { NotificationCategory } from '@/configs/notification.config';
import { DateRangeFilter } from './NotificationFilter';
import NotificationTableRow from './NotificationTableRow';
import NotificationBulkActions from './NotificationBulkActions';
import NotificationSearch from './NotificationSearch';
import NotificationSort, { SortOption } from './NotificationSort';
import NotificationFilter from './NotificationFilter';
import InboxQuickTabs, { QuickTab } from './InboxQuickTabs';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { HiBell, HiChevronRight } from 'react-icons/hi';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface NotificationTableBodyProps {
  notificationList: NotificationData[];
  notificationHeight: string;
  loading: boolean;
  handleNotificationClick: (item: NotificationData) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onBulkMarkRead: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMute?: (ids: string[]) => void;
  userRole?: string;
  /** Current viewer (name/login); when backend sends "You", show actual name in subtext */
  currentUser?: { name?: string; login?: string } | null;
  selectedCategory?: NotificationCategory | null;
  selectedDateRange?: DateRangeFilter;
  onCategoryChange?: (category: NotificationCategory | null) => void;
  onDateRangeChange?: (range: DateRangeFilter) => void;
  onClearFilters?: () => void;
  /** When provided, search is controlled by parent (backend search) */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  /** When true, backend filters by search; skip client-side filterBySearch */
  useBackendSearch?: boolean;
  showFilters?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  /** Navigate to full notifications page */
  onViewAllActivity?: () => void;
  /** Portal root for popovers (e.g. drawer) - keeps confirm dialogs inside parent */
  portalRoot?: HTMLElement | null;
  /** Optional controlled quick tab state */
  quickTab?: QuickTab;
  onQuickTabChange?: (tab: QuickTab) => void;
  /** Optional controlled sort state */
  sortOption?: SortOption;
  onSortOptionChange?: (option: SortOption) => void;
}

// ============================================
// CONSTANTS
// ============================================

const SCROLL_THRESHOLD = 100;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Filter notifications by search query
 */
function filterBySearch(
  notifications: NotificationData[],
  searchQuery: string
): NotificationData[] {
  if (!searchQuery.trim()) return notifications;

  const query = searchQuery.toLowerCase().trim();

  return notifications.filter((notification) => {
    const description = (notification.description || '').toLowerCase();
    const target = (notification.target || '').toLowerCase();
    const notificationType = (notification.notificationType || '').toLowerCase();
    const leadId = (notification.leadId || '').toLowerCase();
    const projectId = (notification.projectId || '').toLowerCase();
    const offerId = (notification.offerId || '').toLowerCase();
    const metadata = notification.metadata || {};
    const taskId = (metadata.taskId || '').toLowerCase();
    const leadName = (metadata.leadName || metadata.lead_name || '').toLowerCase();
    const projectName = (metadata.projectName || metadata.project_name || '').toLowerCase();

    return (
      description.includes(query) ||
      target.includes(query) ||
      notificationType.includes(query) ||
      leadId.includes(query) ||
      projectId.includes(query) ||
      offerId.includes(query) ||
      taskId.includes(query) ||
      leadName.includes(query) ||
      projectName.includes(query)
    );
  });
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Empty state when no notifications
 */
const EmptyState: React.FC<{ hasFilters?: boolean; onClearFilters?: () => void }> = ({ hasFilters = false, onClearFilters }) => (
  <div className="flex flex-1 items-center justify-center py-16">
    <div className="text-center">
      <HiBell className="mx-auto mb-3 h-14 w-14 text-gray-200" />
      <p className="text-sm font-semibold text-gray-800">
        {hasFilters ? 'No matching notifications' : 'All caught up!'}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {hasFilters ? 'Try adjusting your filters' : 'No notifications to display'}
      </p>
      {hasFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
        >
          Clear filters
        </button>
      )}
    </div>
  </div>
);

/**
 * Loading skeleton: fixed rows + flex filler so the block uses the full list area height
 * (parent already applies notificationHeight, e.g. h-[60vh]).
 */
const LoadingState: React.FC = () => (
  <div className="flex h-full min-h-0 w-full flex-1 flex-col">
    {[...Array(18)].map((_, i) => (
      <div
        key={i}
        className="flex min-h-[48px] shrink-0 items-center gap-3 border-b border-gray-100 px-3 py-1.5"
        style={{ animationDelay: `${i * 75}ms` }}
      >
        <div className="h-3.5 w-3.5 animate-pulse rounded bg-gray-100" />
        <div className="h-7 w-7 animate-pulse rounded-lg bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-50" />
        </div>
        <div className="h-2.5 w-16 animate-pulse rounded bg-gray-50" />
        <div className="h-2.5 w-8 animate-pulse rounded bg-gray-50" />
      </div>
    ))}
    {/* Fills remaining height below the rows so loading state matches full list panel */}
    <div className="min-h-0 flex-1 bg-gray-50/30" aria-hidden />
  </div>
);

/**
 * Load more indicator at bottom of list
 */
const LoadMoreIndicator: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
  <tr>
    <td colSpan={6} className="px-4 py-3">
      <div className="flex items-center justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Spinner size={14} />
            <span className="text-xs">Loading more...</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">Scroll for more</span>
        )}
      </div>
    </td>
  </tr>
);

// ============================================
// MAIN COMPONENT
// ============================================

const NotificationTableBody: React.FC<NotificationTableBodyProps> = ({
  notificationList,
  notificationHeight,
  loading,
  handleNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onBulkMarkRead,
  onBulkDelete,
  onBulkMute,
  userRole = 'Admin',
  currentUser,
  selectedCategory = null,
  selectedDateRange = 'all',
  onCategoryChange,
  onDateRangeChange,
  onClearFilters,
  searchQuery: searchQueryProp,
  onSearchChange,
  useBackendSearch = false,
  showFilters = true,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onViewAllActivity,
  portalRoot,
  quickTab: quickTabProp,
  onQuickTabChange,
  sortOption: sortOptionProp,
  onSortOptionChange,
}) => {
  // ----------------------------------------
  // State
  // ----------------------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const searchQuery = searchQueryProp ?? searchQueryLocal;
  const setSearchQuery = onSearchChange ?? setSearchQueryLocal;
  const [sortOptionLocal, setSortOptionLocal] = useState<SortOption>('newest');
  const sortOption = sortOptionProp ?? sortOptionLocal;
  const setSortOption = onSortOptionChange ?? setSortOptionLocal;
  const [quickTabLocal, setQuickTabLocal] = useState<QuickTab>('all');
  const quickTab = quickTabProp ?? quickTabLocal;
  const setQuickTab = onQuickTabChange ?? setQuickTabLocal;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const throttleRafRef = useRef<number | null>(null);
  const hasCheckedInitialPositionRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(hasMore);
  const isLoadingMoreRef = useRef<boolean>(isLoadingMore);

  // ----------------------------------------
  // Memoized Data Processing
  // ----------------------------------------

  const filteredBySearch = useMemo(() => {
    if (useBackendSearch && searchQuery.trim()) {
      return notificationList; // Backend already filtered
    }
    return filterBySearch(notificationList, searchQuery);
  }, [notificationList, searchQuery, useBackendSearch]);

  const filteredByTab = useMemo(() => {
    // Quick tab filtering is handled by backend (unread/assigned params).
    return filteredBySearch;
  }, [filteredBySearch, quickTab]);

  const visibleNotifications = useMemo(() => {
    // Sorting is handled by backend (sort/order params).
    return filteredByTab;
  }, [filteredByTab]);

  const unreadCount = useMemo(() => {
    return filteredBySearch.filter((n) => !isNotificationRead(n)).length;
  }, [filteredBySearch]);

  const assignedCount = useMemo(() => {
    return filteredBySearch.filter(
      (n) => n.notificationType?.includes('assigned') || n.notificationType?.includes('assignment')
    ).length;
  }, [filteredBySearch]);

  const mentionsCount = useMemo(() => {
    return filteredBySearch.filter((n) => n.notificationType?.includes('mention')).length;
  }, [filteredBySearch]);

  const selectedNotifications = useMemo(() => {
    return visibleNotifications.filter((n) => selectedIds.has(n.id));
  }, [visibleNotifications, selectedIds]);

  const hasUnreadSelected = useMemo(() => {
    return selectedNotifications.some((n) => !isNotificationRead(n));
  }, [selectedNotifications]);

  const hasReadSelected = useMemo(() => {
    return selectedNotifications.some((n) => isNotificationRead(n));
  }, [selectedNotifications]);

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(visibleNotifications.map((n) => n.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [visibleNotifications]
  );

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(selectedIds);
    onBulkMarkRead(ids);
    setSelectedIds(new Set());
  }, [selectedIds, onBulkMarkRead]);

  const handleBulkMarkUnread = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    onBulkDelete(ids);
    setSelectedIds(new Set());
  }, [selectedIds, onBulkDelete]);

  const handleBulkMute = useCallback(() => {
    if (onBulkMute) {
      const ids = Array.from(selectedIds);
      onBulkMute(ids);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onBulkMute]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleScroll = useCallback(() => {
    if (throttleRafRef.current !== null) {
      return;
    }

    throttleRafRef.current = requestAnimationFrame(() => {
      throttleRafRef.current = null;

      if (!scrollContainerRef.current || !hasMoreRef.current || isLoadingMoreRef.current || !onLoadMore) {
        return;
      }

      const container = scrollContainerRef.current;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      const isScrollingDown = scrollTop > lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (!isScrollingDown) {
        return;
      }

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < SCROLL_THRESHOLD) {
        onLoadMore();
      }
    });
  }, [onLoadMore]);

  const checkInitialScrollPosition = useCallback(() => {
    if (hasCheckedInitialPositionRef.current) {
      return;
    }

    if (!scrollContainerRef.current || !hasMore || isLoadingMore || !onLoadMore) {
      return;
    }

    const { scrollHeight, clientHeight } = scrollContainerRef.current;

    if (scrollHeight <= clientHeight && scrollHeight > 0) {
      hasCheckedInitialPositionRef.current = true;
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // ----------------------------------------
  // Effects
  // ----------------------------------------

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    lastScrollTopRef.current = scrollContainer.scrollTop;

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkInitialScrollPosition();
      });
    });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
      if (throttleRafRef.current !== null) {
        cancelAnimationFrame(throttleRafRef.current);
        throttleRafRef.current = null;
      }
    };
  }, [handleScroll, checkInitialScrollPosition]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds(new Set());
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedCategory, selectedDateRange, searchQuery]);

  // ----------------------------------------
  // Computed Values
  // ----------------------------------------

  const isAllSelected =
    visibleNotifications.length > 0 && visibleNotifications.every((n) => selectedIds.has(n.id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <div className="flex w-full flex-col min-h-0 flex-1 overflow-hidden">
      {/* Sticky Header Container - always visible (filters, tabs, search, sort) */}
      <div className="sticky top-0 z-20 bg-white shrink-0">
        {/* Filter Bar */}
        {showFilters && onCategoryChange && onDateRangeChange && onClearFilters && (
          <NotificationFilter
            selectedCategory={selectedCategory}
            selectedDateRange={selectedDateRange}
            onCategoryChange={onCategoryChange}
            onDateRangeChange={onDateRangeChange}
            onClearFilters={onClearFilters}
            portalRoot={portalRoot}
          />
        )}

        {/* Row 2: Quick Tabs + Mark all read */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3 py-1.5">
          <InboxQuickTabs
            activeTab={quickTab}
            onTabChange={setQuickTab}
            unreadCount={unreadCount}
            assignedCount={assignedCount}
            mentionsCount={mentionsCount}
          />
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold text-green-600 transition-all hover:bg-green-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Row 3: Select all checkbox + Search + Sort */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-3 py-1.5">
          <div className="shrink-0 flex items-center justify-center w-6">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-1 focus:ring-green-500 focus:outline-none"
              aria-label="Select all notifications"
            />
          </div>
          <NotificationSearch value={searchQuery} onChange={setSearchQuery} />
          <NotificationSort value={sortOption} onChange={setSortOption} portalRoot={portalRoot} />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <NotificationBulkActions
        selectedCount={selectedIds.size}
        hasUnreadSelected={hasUnreadSelected}
        hasReadSelected={hasReadSelected}
        onMarkAsRead={handleBulkMarkRead}
        onMarkAsUnread={handleBulkMarkUnread}
        onDelete={handleBulkDelete}
        onMute={onBulkMute ? handleBulkMute : undefined}
        onClearSelection={handleClearSelection}
      />

      {/* Content area - skeleton only inside when loading */}
      <div
        className={classNames(
          'flex min-h-0 flex-1 flex-col overflow-y-auto',
          notificationHeight
        )}
      >
        {loading ? (
          <LoadingState />
        ) : visibleNotifications.length > 0 ? (
          <div ref={scrollContainerRef} className="overflow-y-auto flex-1 min-h-0 w-full">
            <table
              className="w-full"
              role="table"
              aria-label="Notifications"
              aria-rowcount={visibleNotifications.length}
            >
              <tbody>
                {visibleNotifications.map((notification) => (
                  <NotificationTableRow
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedIds.has(notification.id)}
                    onSelect={(checked) => handleSelectRow(notification.id, checked)}
                    onClick={() => handleNotificationClick(notification)}
                    onMarkAsRead={onMarkAsRead}
                    onDelete={onBulkDelete ? () => onBulkDelete([notification.id]) : undefined}
                    onMute={onBulkMute ? () => onBulkMute([notification.id]) : undefined}
                    userRole={userRole}
                    currentUser={currentUser}
                    portalRoot={portalRoot}
                  />
                ))}
                {(hasMore || isLoadingMore) && <LoadMoreIndicator isLoading={isLoadingMore} />}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            hasFilters={
              selectedCategory !== null || selectedDateRange !== 'all' || searchQuery.trim() !== ''
            }
            onClearFilters={onClearFilters}
          />
        )}
      </div>

      {/* View All - fixed footer outside scroll */}
      {onViewAllActivity && (
        <div className="border-t border-gray-100 bg-white px-3 py-1.5 shrink-0">
          <Button
            variant="plain"
            size="xs"
            block
            onClick={onViewAllActivity}
            icon={<HiChevronRight className="h-4 w-4" />}
            iconAlignment="end"
            className="w-full !py-1.5 !text-sm font-semibold !text-green-600 hover:!bg-green-50 rounded-lg"
          >
            View All Notifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationTableBody;
