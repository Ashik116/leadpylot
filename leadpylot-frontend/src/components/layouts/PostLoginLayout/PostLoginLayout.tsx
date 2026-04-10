'use client';

import type { CommonProps } from '@/@types/common';
import type { LayoutType } from '@/@types/theme';
import PageContainer from '@/components/template/PageContainer';
import { LAYOUT_FRAMELESS_SIDE } from '@/constants/theme.constant';
import useTheme from '@/utils/hooks/useTheme';
import queryRoute from '@/utils/queryRoute';
import { usePathname } from 'next/navigation';
import { useRouteChangeHandler } from '@/hooks/useRouteChangeHandler';
import FrameLessSide from './components/FrameLessSide';
import { GlobalAssignmentModal } from '@/components/shared/AssignmentDoubleClickModal';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';
import LayoutBase from '@/components/template/LayoutBase';
import { useFetchStages } from '@/stores/stagesStore';
import { useEffect } from 'react';
import RouteGuard from '@/components/shared/RouteGuard';

interface PostLoginLayoutProps extends CommonProps {
  layoutType: LayoutType;
}

const Layout = ({ children, layoutType }: PostLoginLayoutProps) => {
  const layoutContent = (() => {
    switch (layoutType) {
      case LAYOUT_FRAMELESS_SIDE:
        return <FrameLessSide>{children}</FrameLessSide>;
      default:
        return <>{children}</>;
    }
  })();

  return <LayoutBase type={layoutType}>{layoutContent}</LayoutBase>;
};

const PostLoginLayout = ({ children }: CommonProps) => {
  const layoutType = useTheme((state) => state.layout.type);

  const pathname = usePathname();

  const route = queryRoute(pathname);

  // Reset drawer state when route changes
  useRouteChangeHandler();

  // Initialize global admin SIP connection (runs on all protected pages)
  useGlobalAdminSIP();

  // Initialize stages data globally (fetches only once due to store logic)
  const fetchStages = useFetchStages();
  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return (
    <RouteGuard>
      <Layout layoutType={route?.meta?.layout ? route?.meta?.layout : layoutType}>
        <PageContainer {...route?.meta}>{children}</PageContainer>
        <GlobalAssignmentModal />
      </Layout>
    </RouteGuard>
  );
};

export default PostLoginLayout;
