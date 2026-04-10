import AuthorityCheck from '@/components/shared/AuthorityCheck';
import RoleGuard from '@/components/shared/RoleGuard';
import Notification from '@/components/template/Notification';
import ProjectSelector from '@/components/template/ProjectSelector';
import UserProfileDropdown from '@/components/template/UserProfileDropdown';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { ADMIN_PREFIX_PATH } from '@/constants/route.constant';
import { useAuth } from '@/hooks/useAuth';
import classNames from '@/utils/classNames';
import useNavigation from '@/utils/hooks/useNavigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';
import { ConfigurationMenu } from './ConfigurationMenu';
import DataExchange from './DataExchange';
import { SyncStatusPill } from './SyncStatusPill';
import Phone from '@/components/template/Phone';

export interface HeaderEndProps {
  // Sync status
  syncMinimized: boolean;
  syncIsRunning: boolean;
  syncProgressPercentage: number;
  syncProcessedEmails: number;
  syncTotalEmails: number;
  onSyncClick: () => void;

  // Mobile search
  isMobileSearchOpen: boolean;
  onMobileSearchToggle: () => void;

  // Bulk search
  onBulkSearchOpen: () => void;

  // Task drawer
  onTaskDrawerOpen: () => void;
  pendingTaskCount?: number;

  // Openings view toggle
  isOpeningsPage?: boolean;
  openingsViewType?: 'multi-table' | 'dashboard';
  onOpeningsViewToggle?: () => void;
}

/**
 * Header End Component
 * Right side of the header with actions and utilities
 */
export const HeaderEnd = React.memo<HeaderEndProps>(
  ({
    syncMinimized,
    syncIsRunning,
    syncProgressPercentage,
    syncProcessedEmails,
    syncTotalEmails,
    onSyncClick,
    isMobileSearchOpen,
    onMobileSearchToggle,
    onBulkSearchOpen,
    onTaskDrawerOpen,
    pendingTaskCount = 0,
    isOpeningsPage = false,
    openingsViewType = 'multi-table',
    onOpeningsViewToggle,
  }) => {
    const pathname = usePathname();

    // Hide ProjectSelector on offers and openings pages for agents
    const isOffersPage = pathname?.includes('/offers') || false;
    const isTodoTicketsPage = pathname?.startsWith('/admin/predefined-tasks');
    const shouldHideProjectSelector = isOffersPage || isOpeningsPage || isTodoTicketsPage;
    return (
      <div className="ml-3 flex items-center gap-5 md:ml-4 md:gap-3 lg:gap-4">
        {/* Sync Status Pill - Hidden on mobile */}
        <RoleGuard role={Role.ADMIN}>
          {syncMinimized && syncIsRunning && (
            <div className="hidden md:block">
              <SyncStatusPill
                progressPercentage={syncProgressPercentage}
                processedEmails={syncProcessedEmails}
                totalEmails={syncTotalEmails}
                // onClick={onSyncClick}
              />
            </div>
          )}
        </RoleGuard>

        {/* Mobile Search Toggle */}
        {/* <Button
          variant="default"
          size="md"
          icon={<ApolloIcon name="search" className="text-lg" />}
          className="md:hidden"
          onClick={onMobileSearchToggle}
        /> */}

        {/* Openings View Toggle - Hidden on mobile */}
        {/* {isOpeningsPage && onOpeningsViewToggle && (
          <div className="hidden md:block">
            <Button
              onClick={onOpeningsViewToggle}
              variant="default"
              size="md"
              icon={
                <ApolloIcon
                  name={openingsViewType === 'multi-table' ? 'grid' : 'layout'}
                  className="text-lg"
                />
              }
              className="px-2"
              gapClass="gap-0 2xl:gap-1"
              title={
                openingsViewType === 'multi-table'
                  ? 'Switch to Dashboard View'
                  : 'Switch to Multi Table View'
              }
            >
              <div className="hidden 2xl:block">
                {openingsViewType === 'multi-table' ? 'Multi Table' : 'Dashboard'}
              </div>
            </Button>
          </div>
        )} */}

        {/* Data Exchange Export (Admin only) - Hidden on mobile */}
        <RoleGuard role={Role.ADMIN}>
          <div className="hidden md:block">
            <DataExchange />
          </div>
        </RoleGuard>

        {/* Bulk Search (Admin only) */}
        {/* <RoleGuard role={Role.ADMIN}>
          <Button
            onClick={onBulkSearchOpen}
            variant="solid"
            icon={<ApolloIcon name="search" className="text-lg" />}
            className="px-2"
            gapClass="gap-0 md:gap-1"
          >
            <div className="hidden md:block">Bulk Search</div>
          </Button>
        </RoleGuard> */}

        {/* Project Selector (Agent only) - Hidden on mobile and on offers/openings pages */}
        {!shouldHideProjectSelector && (
          <RoleGuard role={Role.AGENT}>
            <div className="hidden md:block">
              <ProjectSelector />
            </div>
          </RoleGuard>
        )}

        {/* Phone - Available for both Admin and Agent */}
        <Phone hoverable={false} />

        {/* Task Drawer Button */}
        {/* <Badge
          content={pendingTaskCount > 0 ? pendingTaskCount : undefined}
          innerClass="bg-blue-500"
        >
          <Button
            onClick={onTaskDrawerOpen}
            variant="default"
            size="md"
            icon={<ApolloIcon name="checklist" className="text-lg" />}
            className="px-2"
            title="My Tasks"
          >
            <span className="hidden md:block">Tasks</span>
          </Button>
        </Badge> */}

        {/* Settings Menu and Reportings Menu - Hidden on mobile */}
        <RoleGuard role={Role.ADMIN}>
          <div className="hidden md:block">
            <SettingsAndReportingsMenu />
          </div>
        </RoleGuard>
        {/* Communication Widget */}
        {/* <CommWidget /> */}
        {/* Notification */}
        <Notification hoverable={false} />
        {/* User Profile */}
        <UserProfileDropdown hoverable={false} />
      </div>
    );
  }
);

HeaderEnd.displayName = 'HeaderEnd';

/**
 * Settings and Reportings Menu Component
 * Renders Configuration dropdown and Reportings button
 */
const SettingsAndReportingsMenu = () => {
  const pathname = usePathname();
  const { navigationTree } = useNavigation();
  const { user } = useAuth();

  // Get user authority
  const userAuthority = useMemo(() => {
    if (user?.role) {
      return [String(user.role)];
    }
    return [];
  }, [user]);

  // Find Reportings menu item
  const reportingsItem = useMemo(() => {
    return navigationTree.find((nav) => nav.key === 'admin.reportings');
  }, [navigationTree]);

  // Check if reportings is active
  const isReportingsActive = pathname === `${ADMIN_PREFIX_PATH}/reportings`;

  return (
    <div className="flex items-center gap-1">
      {/* Configuration Menu */}
      <ConfigurationMenu />

      {/* Reportings Button */}
      {reportingsItem && (
        <AuthorityCheck userAuthority={userAuthority} authority={reportingsItem.authority}>
          <Link href={reportingsItem.path}>
            <Button
              variant={isReportingsActive ? 'solid' : 'default'}
              icon={<ApolloIcon name="area-chart" className="text-lg" />}
              className={classNames(
                'border-none px-2',
                isReportingsActive && 'bg-sand-1 hover:bg-sand-1 text-white'
              )}
              gapClass="gap-0 2xl:gap-1"
            >
              <div className="hidden 2xl:block">Reportings</div>
            </Button>
          </Link>
        </AuthorityCheck>
      )}
    </div>
  );
};
