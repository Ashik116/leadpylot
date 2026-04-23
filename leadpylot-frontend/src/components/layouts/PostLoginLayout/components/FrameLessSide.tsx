'use client';

import type { CommonProps } from '@/@types/common';
import LayoutBase from '@/components//template/LayoutBase';
import BulkSearchModal from '@/components/shared/BulkSearchModal/BulkSearchModal';
import HeaderSkeleton from '@/components/shared/SkeletonLoading/HeaderSkeleton';
import FrameLessGap from '@/components/template/FrameLessGap';
import Header from '@/components/template/Header';
import { LAYOUT_FRAMELESS_SIDE } from '@/constants/theme.constant';
import { useAuth } from '@/hooks/useAuth';
import classNames from '@/utils/classNames';
import useScrollTop from '@/utils/hooks/useScrollTop';
import { useCallback, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
// import TaskDrawer from '@/components/shared/TaskDrawer/TaskDrawer';

// Extracted hooks
import { usePageTitle } from '../hooks/usePageTitle';
import { useRouteDetection } from '../hooks/useRouteDetection';
import { useHeaderVisibility } from '../hooks/useHeaderVisibility';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useOpeningsView, OpeningsViewProvider } from '../contexts/OpeningsViewContext';
import { BulkSearchProvider, useBulkSearch } from '../contexts/BulkSearchContext';

// Extracted components
import { HeaderStart } from './HeaderStart';
import { HeaderEnd } from './HeaderEnd';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import GlobalSearch from '@/components/shared/GlobalSearch/GlobalSearch';
import { ActiveCallIndicator } from '@/components/template/Phone/ActiveCallIndicator';
import NavSubTabBar from './Menu/NavSubTabBar';

// Inner component that uses the hook (must be inside provider)
const FrameLessSideContent = ({ children }: CommonProps) => {
  // Local state for modals and UI
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);

  // Get bulk search context - use context state directly
  const bulkSearchContext = useBulkSearch();
  const isBulkSearchOpen = bulkSearchContext?.isBulkSearchOpen || false;

  const { isSticky } = useScrollTop();
  const { user, profile } = useAuth();
  const pathname = usePathname();

  // Use extracted custom hooks
  const finalPageInfo = usePageTitle();
  const routeInfo = useRouteDetection(finalPageInfo);
  const { shouldHideHeaderTitle, shouldHideHeaderSubtitle } = useHeaderVisibility(routeInfo);
  const { onBackClick } = useBackNavigation({ isAgentDetailPage: routeInfo.isAgentDetailPage });
  const { minimized, lastStatus, progressPercentage, openModal, clearMinimize } = useSyncStatus();
  const { viewType: openingsViewType, toggleView: toggleOpeningsView } = useOpeningsView();

  // Check if we're on the openings page
  const isOpeningsPage = useMemo(() => pathname === '/dashboards/openings', [pathname]);

  // Memoized handlers
  const handleBulkSearchOpen = useCallback(() => {
    bulkSearchContext?.setBulkSearchOpen(true);
  }, [bulkSearchContext]);

  const handleBulkSearchClose = useCallback(() => {
    bulkSearchContext?.setBulkSearchOpen(false);
  }, [bulkSearchContext]);

  const handleSyncPillClick = useCallback(() => {
    clearMinimize();
    openModal();
  }, [clearMinimize, openModal]);

  const handleMobileSearchToggle = useCallback(() => {
    setIsMobileSearchOpen((v) => !v);
  }, []);

  const handleTaskDrawerOpen = useCallback(() => {
    setIsTaskDrawerOpen(true);
  }, []);

  // const handleTaskDrawerClose = useCallback(() => {
  //   setIsTaskDrawerOpen(false);
  // }, []);

  // const handlePendingCountChange = useCallback((count: number) => {
  //   setPendingTaskCount(count);
  // }, []);

  return (
    <LayoutBase
      adaptiveCardActive
      type={LAYOUT_FRAMELESS_SIDE}
      className="app-layout-frameless-side flex flex-auto flex-col bg-gray-950 dark:bg-[var(--dm-bg-shell)]"
      pageContainerReassemble={({
        pageContainerType,
        pageBackgroundType,
        pageContainerGutterClass,
        children,
        footer,
        defaultClass,
        pageContainerDefaultClass,
        PageContainerBody,
      }) => (
        <div
          className={classNames(
            defaultClass,
            'rounded-2xl',
            pageBackgroundType === 'plain' && 'bg-white dark:bg-[var(--dm-bg-base)]'
          )}
        >
          <main className="h-full">
            <div
              className={classNames(
                pageContainerDefaultClass,
                pageContainerType !== 'gutterless' && pageContainerGutterClass,
                pageContainerType === 'contained' && 'container mx-auto',
                !footer && 'pb-0 sm:pb-0 md:pb-0'
              )}
            >
              {/* <PageContainerHeader {...header} gutterLess={pageContainerType === 'gutterless'} /> */}
              <PageContainerBody pageContainerType={pageContainerType}>
                {children}
              </PageContainerBody>
            </div>
          </main>
          {/* <PageContainerFooter
            footer={footer}
            pageContainerType={pageContainerType as FooterPageContainerType}
          /> */}
        </div>
      )}
    >
      <div className="flex min-w-0 flex-auto bg-white dark:bg-[var(--dm-bg-base)]">
        {/* <SideNav
          background={true}
          className={classNames(
            'border-border border-r bg-white transition-all duration-800 ease-in-out'
          )}
          contentClass="h-[calc(100vh-8rem)] transition-all duration-800 ease-in-out"
        /> */}
        <FrameLessGap className="relative min-h-screen w-full min-w-0 bg-white transition-all duration-800 ease-in-out dark:bg-[var(--dm-bg-base)]">
          <div className="flex h-screen flex-1 flex-col overflow-hidden rounded-2xl bg-white transition-all duration-800 ease-in-out dark:bg-[var(--dm-bg-surface)]">
            {/* Skeleton loading */}
            {!user ? (
              <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 dark:bg-[var(--dm-bg-surface)]">
                <HeaderSkeleton />
              </div>
            ) : (
              <Header
                className={classNames(
                  'max-h-[64px] rounded-t-2xl shadow',
                  isSticky && 'rounded-none! shadow-sm'
                )}
                headerStart={
                  <HeaderStart
                    onBackClick={onBackClick}
                    isAgentDetailPage={routeInfo.isAgentDetailPage}
                    pageInfo={finalPageInfo}
                    shouldHideHeaderTitle={shouldHideHeaderTitle}
                    shouldHideHeaderSubtitle={shouldHideHeaderSubtitle}
                    onTaskDrawerOpen={handleTaskDrawerOpen}
                    pendingTaskCount={profile?.pendingTodosCount}
                  />
                }
                headerMiddle={
                  <GlobalSearch
                    placeholder="Search globally.."
                    maxWidth="w-full max-w-full sm:max-w-[400px] md:max-w-[50%]"
                    minWidth="min-w-0 sm:min-w-[10rem]"
                    className="flex-1 md:ml-12 lg:ml-2 2xl:ml-20"
                  />
                }
                headerEnd={
                  <>
                    <HeaderEnd
                      syncMinimized={minimized}
                      syncIsRunning={lastStatus?.isRunning || false}
                      syncProgressPercentage={progressPercentage}
                      syncProcessedEmails={lastStatus?.progress?.processedEmails || 0}
                      syncTotalEmails={lastStatus?.progress?.totalEmails || 0}
                      onSyncClick={handleSyncPillClick}
                      isMobileSearchOpen={isMobileSearchOpen}
                      onMobileSearchToggle={handleMobileSearchToggle}
                      onBulkSearchOpen={handleBulkSearchOpen}
                      onTaskDrawerOpen={handleTaskDrawerOpen}
                      pendingTaskCount={profile?.pendingTodosCount}
                      isOpeningsPage={isOpeningsPage}
                      openingsViewType={openingsViewType}
                      onOpeningsViewToggle={toggleOpeningsView}
                    />
                    <MobileSearchOverlay isOpen={isMobileSearchOpen} />
                  </>
                }
              />
            )}

            <NavSubTabBar />
            <div className="flex h-full flex-auto flex-col bg-white transition-all duration-800 ease-in-out dark:bg-[var(--dm-bg-base)]">
              {children}
            </div>
          </div>
        </FrameLessGap>
      </div>

      {/* Bulk Search Modal */}
      <BulkSearchModal isOpen={isBulkSearchOpen} onClose={handleBulkSearchClose} />

      {/* Active Call Indicator - Shows when call is active in popup */}
      <ActiveCallIndicator />

      {/* Task Drawer - Commented out for now, Tickets moved to nav menu */}
      {/* <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={handleTaskDrawerClose}
        onPendingCountChange={handlePendingCountChange}
      /> */}
    </LayoutBase>
  );
};

// Outer component that provides the context
const FrameLessSide = ({ children }: CommonProps) => {
  return (
    <OpeningsViewProvider>
      <BulkSearchProvider>
        <FrameLessSideContent>{children}</FrameLessSideContent>
      </BulkSearchProvider>
    </OpeningsViewProvider>
  );
};

export default FrameLessSide;
