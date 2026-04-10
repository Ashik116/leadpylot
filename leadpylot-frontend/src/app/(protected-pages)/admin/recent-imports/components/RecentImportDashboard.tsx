'use client';

import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { toast } from '@/components/ui/toast';
import { useRevertImport } from '@/services/hooks/useLeads';
import Link from 'next/link';
import { useState } from 'react';
import UnifiedImportDashboard from '../../_components/UnifiedImportDashboard';
import { recentImportsHookConfig } from '../../import-leads/_components/RecentImportsConfig';
import RevertImportModal from './RevertImportModal';

interface RecentImportDashboardProps {
  extraPageSize?: number;
  showPagination?: boolean;
  headerTabs?: boolean;
}

const validationName = 'REVERT';

const RecentImportDashboard = ({
  extraPageSize,
  showPagination,
  headerTabs,
}: RecentImportDashboardProps) => {
  // Modal state
  const [revertModal, setRevertModal] = useState<{
    isOpen: boolean;
    objectId: string;
    fileName: string;
  }>({ isOpen: false, objectId: '', fileName: '' });

  const { mutate: revertImport, isPending: revertLoading } = useRevertImport();

  // Modal handlers
  const handleOpenRevertModal = (objectId: string, fileName: string) => {
    setRevertModal({ isOpen: true, objectId, fileName });
  };

  const handleCloseRevertModal = () => {
    setRevertModal({ isOpen: false, objectId: '', fileName: '' });
  };

  const handleRevertImport = (reason: string, objectId: string) => {
    if (reason?.trim() !== validationName) {
      return toast.push(
        <Notification title="Revert Import" type="danger">
          don&apos;t Match the validation name
        </Notification>
      );
    }
    revertImport(
      { objectId, reason },
      {
        onSuccess: () => {
          handleCloseRevertModal();
        },
      }
    );
  };

  // Prepare configuration with revert functionality
  const config = {
    ...recentImportsHookConfig?.config,
    onRevertClick: handleOpenRevertModal,
    ...(extraPageSize && { pageSize: extraPageSize }),
  };

  const dataHookParams = showPagination === false ? { limit: config?.pageSize } : {};

  return (
    <>
      {/* <PageDashboardWrapper pageTitle="Recent Imports"> */}
      <div className="text-sm pt-1">
        <UnifiedImportDashboard
          dashboardType="recent-imports"
          useDataHook={recentImportsHookConfig?.useDataHook}
          dataHookParams={dataHookParams}
          transformData={recentImportsHookConfig?.transformData}
          getColumns={recentImportsHookConfig?.getColumns}
          config={config}
          showPagination={showPagination}
          headerTabs={headerTabs}
        />

        {/* Show All button below table for embedded mode */}
        {showPagination === false && (
          <div className="mt-4 text-center">
            <Link href="/admin/recent-imports">
              <Button
                variant="plain"
                size="sm"
                icon={<ApolloIcon name="arrow-right" className="ml-1" />}
              >
                Show All Recent Imports
              </Button>
            </Link>
          </div>
        )}
      </div>
      {/* </PageDashboardWrapper> */}

      {/* Revert Import Modal */}
      <RevertImportModal
        isOpen={revertModal?.isOpen}
        onClose={handleCloseRevertModal}
        onConfirm={handleRevertImport}
        objectId={revertModal?.objectId}
        fileName={revertModal?.fileName}
        loading={revertLoading}
      />
    </>
  );
};

export default RecentImportDashboard;
