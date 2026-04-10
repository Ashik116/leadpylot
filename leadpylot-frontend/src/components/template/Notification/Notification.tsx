'use client';

/**
 * Notification Component (Drawer)
 *
 * Main notification center that displays in a slide-out drawer from the right.
 * Triggered by clicking the bell icon in the header.
 *
 * Features:
 * - Slide-in drawer animation from right
 * - Purple gradient header
 * - Real-time notification sync
 * - Mark all as read functionality
 * - Click notification to navigate to related page
 * - Unread count badge on bell icon
 *
 * Architecture:
 * - Uses Zustand store for notification state (notificationStore)
 * - Uses custom hooks for actions and sync (useNotificationActions, useNotificationSync)
 * - Wrapped with withHeaderItem HOC for header positioning
 *
 * @example
 * // In header component
 * <Notification className="header-action-item" />
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Drawer from '@/components/ui/Drawer';
import withHeaderItem from '@/utils/hoc/withHeaderItem';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { HiX, HiBell, HiChevronRight } from 'react-icons/hi';
import NotificationToggle from './NotificationToggle';
import NotificationTableBody from './_components/NotificationTableBody';
import { QuickTab } from './_components/InboxQuickTabs';
import type { SortOption } from './_components/NotificationSort';
import type { DateRangeFilter } from './_components/NotificationFilter';
import type { NotificationCategory } from '@/configs/notification.config';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import {
  useNotifications,
  useUnreadCount,
  useIsUpdating,
  useNotificationLoading,
} from '@/stores/notificationStore';
import Button from '@/components/ui/Button';

// ============================================
// CONSTANTS
// ============================================

/** Drawer width in pixels */
const DRAWER_WIDTH = 740;

/**
 * Fixed height for notification list (uses vh for consistent size).
 * Prevents drawer from growing/shrinking when switching between loading and content states.
 */
const NOTIFICATION_LIST_HEIGHT = 'h-[60vh]';

/** ID of the portal root (in root layout) so the notification drawer stacks above Applied Filters popover */
const NOTIFICATION_DRAWER_PORTAL_ID = 'notification-drawer-portal-root';

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Drawer Header Component
 * Purple gradient with bell icon, title, unread count, and close button
 */
interface DrawerHeaderProps {
  unreadCount: number;
  isUpdating: boolean;
  onClose: () => void;
}

const DrawerHeader: React.FC<DrawerHeaderProps> = ({ unreadCount, isUpdating, onClose }) => (
  <div className="flex w-full items-center justify-between">
    {/* Left: Icon + Title + Badge */}
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">
        <HiBell className="h-4 w-4 text-white" />
      </div>
      <div className="flex flex-col">
        <h4 className="text-sm font-bold tracking-tight text-white">Notifications</h4>
        {unreadCount > 0 && (
          <span className="text-[10px] font-semibold tracking-wider text-green-300/90 uppercase">
            {unreadCount} unread
          </span>
        )}
      </div>
    </div>

    {/* Right: Loading Spinner + Close Button */}
    <div className="flex items-center gap-3">
      {isUpdating && (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      <button
        onClick={onClose}
        className="group rounded-lg p-1.5 transition-all hover:bg-white/10 active:scale-95"
        aria-label="Close notifications"
      >
        <HiX className="h-4 w-4 text-white/60 transition-colors group-hover:text-white" />
      </button>
    </div>
  </div>
);

/**
 * Drawer Footer Component
 * View All button with gradient styling
 */
interface DrawerFooterProps {
  onViewAll: () => void;
}

const DrawerFooter: React.FC<DrawerFooterProps> = ({ onViewAll }) => (
  <div className="flex justify-center p-2">
    <Button
      variant="secondary"
      size="xs"
      block
      onClick={onViewAll}
      icon={<HiChevronRight className="h-4 w-4" />}
      iconAlignment="end"
      className="w-full !py-1.5 !text-sm !font-bold"
    >
      View All Notifications
    </Button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

interface NotificationBeforeProps {
  className?: string;
}

const NotificationBefore: React.FC<NotificationBeforeProps> = ({ className }) => {
  const router = useRouter();
  const { data: session } = useSession();

  // ----------------------------------------
  // Local State
  // ----------------------------------------
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTab, setQuickTab] = useState<QuickTab>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const wasDrawerOpenRef = useRef(false);

  // ----------------------------------------
  // Store Selectors (optimized re-renders)
  // ----------------------------------------
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const isUpdating = useIsUpdating();
  const loading = useNotificationLoading();

  // ----------------------------------------
  // Custom Hooks
  // ----------------------------------------
  const { refreshNotifications, loadAllNotifications, loadMoreNotifications, pagination } =
    useNotificationSync();
  const {
    markAsRead,
    markAllAsRead,
    bulkMarkAsRead,
    bulkDelete,
    bulkMute,
    handleNotificationClick,
  } = useNotificationActions();

  // ----------------------------------------
  // Drawer Controls
  // ----------------------------------------
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // ----------------------------------------
  // Effects
  // ----------------------------------------

  useEffect(() => {
    if (!isDrawerOpen) {
      wasDrawerOpenRef.current = false;
      return;
    }

    // Filter out 'other' category as it's not supported by API
    const category =
      selectedCategory && selectedCategory !== 'other'
        ? (selectedCategory as Exclude<NotificationCategory, 'other'>)
        : undefined;
    const order: 'asc' | 'desc' = sortOption === 'oldest' ? 'asc' : 'desc';

    const requestFilters = {
      category,
      dateRange: selectedDateRange,
      search: searchQuery.trim() || undefined,
      sort: 'createdAt',
      order,
      unread: quickTab === 'unread' || sortOption === 'unread' ? true : undefined,
      assigned: quickTab === 'assigned' ? true : undefined,
    };

    // On drawer-open transition, refresh notifications + unread count.
    // While drawer stays open, only reload list for filter/search/tab changes.
    if (!wasDrawerOpenRef.current) {
      wasDrawerOpenRef.current = true;
      refreshNotifications(requestFilters);
      return;
    }

    loadAllNotifications(requestFilters);
  }, [
    selectedCategory,
    selectedDateRange,
    searchQuery,
    isDrawerOpen,
    loadAllNotifications,
    refreshNotifications,
    quickTab,
    sortOption,
  ]);

  /**
   * Close drawer when clicking outside
   * Clicks pass through to background AND close the drawer
   */
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Find the drawer content element
      const drawerContent = document.querySelector('.notification-drawer .drawer-content');
      const bellIcon = document.querySelector('[data-notification-toggle]');

      // If click is outside drawer content and not on bell icon, close drawer
      if (
        drawerContent &&
        !drawerContent.contains(event.target as Node) &&
        bellIcon &&
        !bellIcon.contains(event.target as Node)
      ) {
        closeDrawer();
      }
    };

    // Use capture phase to detect click before it's processed
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isDrawerOpen, closeDrawer]);

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  /**
   * Mark all notifications as read
   */
  const onMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  /**
   * Handle notification click - navigate and close drawer
   */
  const onNotificationClick = useCallback(
    (notification: any) => {
      handleNotificationClick(notification);
      closeDrawer();
    },
    [handleNotificationClick, closeDrawer]
  );

  /**
   * Navigate to full notifications page
   */
  const handleViewAllActivity = useCallback(() => {
    router.push('/accounts/all-notifications');
    closeDrawer();
  }, [router, closeDrawer]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedDateRange('all');
    setSearchQuery('');
    setQuickTab('all');
  }, []);

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <>
      {/* Bell Icon Trigger */}
      <div onClick={openDrawer} className="cursor-pointer" data-notification-toggle>
        <NotificationToggle count={unreadCount} className={className} />
      </div>

      {/* Notification Drawer - rendered into portal root (z 100001) so it stays above Applied Filters */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onRequestClose={() => {}} // Prevent closing on outside click
        placement="right"
        width={DRAWER_WIDTH}
        parentSelector={() =>
          document.getElementById(NOTIFICATION_DRAWER_PORTAL_ID) || document.body
        }
        title={
          <DrawerHeader unreadCount={unreadCount} isUpdating={isUpdating} onClose={closeDrawer} />
        }
        footer={null}
        closable={false}
        showBackdrop={false}
        lockScroll={false}
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        overlayClassName="notification-drawer-overlay"
        portalClassName="notification-drawer-portal"
        headerClass="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 !border-0"
        bodyClass="!p-0"
        footerClass="!p-0"
        className="notification-drawer"
      >
        <NotificationTableBody
          notificationList={notifications}
          notificationHeight={NOTIFICATION_LIST_HEIGHT}
          loading={loading}
          handleNotificationClick={onNotificationClick}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onBulkMarkRead={bulkMarkAsRead}
          onBulkDelete={bulkDelete}
          onBulkMute={bulkMute}
          userRole={session?.user?.role || 'Admin'}
          currentUser={
            session?.user
              ? {
                  name: (session.user as { name?: string })?.name,
                  login: (session.user as { login?: string })?.login,
                }
              : undefined
          }
          selectedCategory={selectedCategory}
          selectedDateRange={selectedDateRange}
          onCategoryChange={setSelectedCategory}
          onDateRangeChange={setSelectedDateRange}
          onClearFilters={handleClearFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          useBackendSearch={true}
          showFilters={true}
          hasMore={pagination.hasMore}
          isLoadingMore={pagination.isLoadingMore}
          onLoadMore={loadMoreNotifications}
          onViewAllActivity={handleViewAllActivity}
          portalRoot={
            typeof document !== 'undefined'
              ? (document.querySelector('.notification-drawer .drawer-content') as HTMLElement | null) ||
                document.getElementById(NOTIFICATION_DRAWER_PORTAL_ID)
              : null
          }
          quickTab={quickTab}
          onQuickTabChange={setQuickTab}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
        />
      </Drawer>
    </>
  );
};

// ============================================
// EXPORT
// ============================================

/**
 * Wrapped with withHeaderItem HOC for proper header positioning
 */
const Notification = withHeaderItem(NotificationBefore);

export default Notification;
