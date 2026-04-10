import React from 'react';
import { usePathname } from 'next/navigation';
import MobileNav from '@/components/template/MobileNav';
import RoleGuard from '@/components/shared/RoleGuard';
import AgentAliasDisplay from '@/components/template/AgentAliasDisplay';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { PageInfo } from '../hooks/usePageTitle';
import NavMenu from './Menu/NavMenu';

export interface HeaderStartProps {
  onBackClick: () => void;
  isAgentDetailPage: boolean;
  pageInfo?: PageInfo;
  shouldHideHeaderTitle: boolean;
  shouldHideHeaderSubtitle: boolean;
  onTaskDrawerOpen?: () => void;
  pendingTaskCount?: number;
}

/**
 * Header Start Component
 * Left side of the header with back button, title, and search
 */
export const HeaderStart = React.memo<HeaderStartProps>(
  ({
    onBackClick,
    isAgentDetailPage,
    pageInfo,
    shouldHideHeaderTitle,
    shouldHideHeaderSubtitle,
    onTaskDrawerOpen,
    pendingTaskCount,
  }) => {
    const pathname = usePathname();
    const shouldHideAgentAlias = pathname?.startsWith('/admin/predefined-tasks');
    return (
      <>
        <MobileNav />
        {/* Back button */}
        {/* <div className="block">
          <Button
            variant="default"
            size="md"
            icon={<ApolloIcon name="reply" className="text-lg" />}
            onClick={onBackClick}
            className="mr-0 md:mr-2 xl:mr-3"
          >
            <span className="hidden md:block">{isAgentDetailPage ? 'Back to Agents' : 'Back'}</span>
          </Button>
        </div> */}
        {!shouldHideAgentAlias && (
          <RoleGuard role={Role.AGENT}>
            <AgentAliasDisplay />
          </RoleGuard>
        )}
        <div className="flex flex-1 items-center gap-1 md:gap-2 xl:gap-2">
          {/* <PageTitleDisplay
            pageInfo={pageInfo}
            shouldHideHeaderTitle={shouldHideHeaderTitle}
            shouldHideHeaderSubtitle={shouldHideHeaderSubtitle}
          /> */}

          <NavMenu onTaskDrawerOpen={onTaskDrawerOpen} pendingTaskCount={pendingTaskCount} />
        </div>
      </>
    );
  }
);

HeaderStart.displayName = 'HeaderStart';
