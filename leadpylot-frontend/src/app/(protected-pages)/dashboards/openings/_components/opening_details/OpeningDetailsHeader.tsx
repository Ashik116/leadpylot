import Link from 'next/link';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ActionButtonsSection from '../../../_components/ActionButtonsSection';
import type { OpeningDetailsHeaderProps } from './types';

export function OpeningDetailsHeader({
  title,
  hideActionButtons,
  config,
  selectedRows,
  selectedItems,
  session,
  selectedProgressFilter,
  dashboardType,
  isReverting,
  offerId,
  leadId,
  dialogSetters,
  hideViewLead,
  hideSwitchTo,
}: OpeningDetailsHeaderProps & { hideViewLead?: boolean; hideSwitchTo?: boolean }) {
  if (hideActionButtons) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white">
      <div className="flex items-center gap-5">
        <h2 className="mb-[6px] text-base font-semibold text-nowrap xl:text-xl">
          {title || 'Opening Details'}
        </h2>
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <ActionButtonsSection
            config={config}
            selectedRows={selectedRows}
            selectedItems={selectedItems}
            session={session}
            setIsBulkUpdateDialogOpen={dialogSetters.setIsBulkUpdateDialogOpen}
            setCreateOpeningOpen={dialogSetters.setIsCreateOpeningDialogOpen}
            setCreateConfirmationDialogOpen={dialogSetters.setCreateConfirmationDialogOpen}
            setIsPaymentVoucherDialogOpen={dialogSetters.setIsPaymentVoucherDialogOpen}
            setIsNettoDialogOpen={dialogSetters.setIsNettoDialogOpen}
            setIsBulkNettoDialogOpen={dialogSetters.setIsBulkNettoDialogOpen}
            setIsLostDialogOpen={dialogSetters.setIsLostDialogOpen}
            setIsSendToOutDialogOpen={dialogSetters.setIsSendToOutDialogOpen}
            selectedProgressFilter={selectedProgressFilter}
            dashboardType={dashboardType}
            isReverting={isReverting}
            offerId={offerId}
            className="flex-wrap"
            dropdownButtonSize="xs"
            dropdownIconClassName="text-sm"
            hideSwitchTo={hideSwitchTo}
          />
        </div>
      </div>
      {/* One column: extra right margin so close modal (X) has room; two columns: top-right of left panel */}
      {!hideViewLead && (
        <Link
          href={`/dashboards/leads/${leadId}`}
          className="shrink-0 ltr:mr-7 lg:ltr:mr-0 rtl:ml-7 lg:rtl:ml-0"
        >
          <Button
            size="xs"
            variant="default"
            icon={<ApolloIcon name="arrow-right" className="text-sm" />}
            title="Navigate to Lead Details Page"
          >
            <span>View Lead</span>
          </Button>
        </Link>
      )}
    </div>
  );
}
