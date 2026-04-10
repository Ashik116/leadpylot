'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import UnifiedImportDashboard from '../../_components/UnifiedImportDashboard';
import { offersImportHistoryHookConfig } from './OffersImportConfig';
import OffersImportStatusFilter from './OffersImportStatusFilter';
import { useSearchParams } from 'next/navigation';
import { useOffersRevertImport } from '@/services/hooks/useOffersProgress';
import RevertImportModal from '../../recent-imports/components/RevertImportModal';
import Link from 'next/link';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface OffersImportHistoryProps {
  extraPageSize?: number;
  showPagination?: boolean;
  headerTabs?: boolean;
}

const validationName = 'REVERT';

const OffersImportHistory = ({
  extraPageSize,
  showPagination,
  headerTabs,
}: OffersImportHistoryProps) => {
  const searchParams = useSearchParams();
  const status = searchParams?.get('status') || undefined;

  // Modal state
  const [revertModal, setRevertModal] = useState<{
    isOpen: boolean;
    objectId: string;
    fileName: string;
  }>({ isOpen: false, objectId: '', fileName: '' });

  const { mutate: revertImport, isPending: revertLoading } = useOffersRevertImport();

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
      { objectId, params: { reason } },
      {
        onSuccess: () => {
          handleCloseRevertModal();
        },
      }
    );
  };

  // Prepare configuration with revert functionality
  const config = {
    ...offersImportHistoryHookConfig?.config,
    onRevertClick: handleOpenRevertModal,
    ...(extraPageSize && { pageSize: extraPageSize }),
  };

  const dataHookParams = {
    ...(showPagination === false ? { limit: config?.pageSize } : {}),
    ...(status && { status }),
  };

  return (
    <>
      {/* <PageDashboardWrapper pageTitle="Offers Import History"> */}
      <div className="text-sm border-t-2 border-gray-100">
        <UnifiedImportDashboard
          dashboardType="offers-import-history"
          useDataHook={offersImportHistoryHookConfig?.useDataHook}
          dataHookParams={dataHookParams}
          transformData={offersImportHistoryHookConfig?.transformData}
          getColumns={offersImportHistoryHookConfig?.getColumns}
          config={config}
          customActions={<OffersImportStatusFilter />}
          showPagination={showPagination}
          headerTabs={headerTabs}
        />
        {showPagination === false && (
          <div className="mt-4 text-center">
            <Link href="/admin/recent-imports?offer=true">
              <Button
                variant="plain"
                size="sm"
                icon={<ApolloIcon name="arrow-right" className="ml-1" />}
              >
                Show All Offers Imports
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

export default OffersImportHistory;
