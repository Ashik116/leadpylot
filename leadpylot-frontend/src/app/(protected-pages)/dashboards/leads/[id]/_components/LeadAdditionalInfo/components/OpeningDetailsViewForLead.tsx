'use client';

import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import { OpeningDocumentsView } from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/OpeningDocumentsView';
import { openingsConfig } from '@/app/(protected-pages)/dashboards/openings/_components/OpeningsDashboardConfig';
import { OpeningDetailsDialogs } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/OpeningDetailsDialogs';
import { OpeningDetailsGrid } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/OpeningDetailsGrid';
import { useOpeningDetailsData } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/useOpeningDetailsData';
import { useOpeningDetailsDialogs } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/useOpeningDetailsDialogs';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';

interface OpeningDetailsViewForLeadProps {
  openingId: string;
  onBack: () => void;
  onEdit?: (opening: any) => void;
}

export function OpeningDetailsViewForLead({
  openingId,
  onBack,
  onEdit,
}: OpeningDetailsViewForLeadProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const documentHandler = useDocumentHandler();

  // We pass true for isOpen so it fetches
  const {
    opening,
    lead,
    leadId,
    offerId,
    openingIdFromProp,
    fetchedOpening,
    refetchOpening,
    transformedOpeningData,
    splitPaymentAgentOptions,
    inboundPaymentAgentOptions,
    filteredConfig,
    handleSplitPaymentSubmit,
    handleInboundPaymentSubmit,
    isPaymentMutationPending,
  } = useOpeningDetailsData({
    openingData: { _id: openingId },
    isOpen: true,
    dashboardType: DashboardType.OPENING,
    config: openingsConfig, // Use actual openings config
  });

  const { dialogStates, dialogSetters } = useOpeningDetailsDialogs({});

  const taskTypeValue = 'opening';
  const detailsId = openingIdFromProp || opening?._id || openingId;

  const handleOpenOpeningDetails = () => {
    if (!detailsId) return;
    const encodedId = encodeURIComponent(String(detailsId));
    router.push(`/dashboards/openings?detailsType=opening&detailsId=${encodedId}`);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 overflow-y-auto">
        {/* <OpeningDetailsHeader
          title="Opening Details"
          hideActionButtons={false}
          hideViewLead={true}
          hideSwitchTo={false}
          config={filteredConfig}
          selectedRows={openingId ? [openingId] : []}
          selectedItems={opening ? [opening] : []}
          session={session}
          selectedProgressFilter={opening?.current_stage || DashboardType.OPENING}
          dashboardType={DashboardType.OPENING}
          isReverting={false}
          offerId={offerId || ''}
          leadId={leadId || ''}
          dialogSetters={dialogSetters}
        /> */}
        <div className="grid grid-cols-2 py-1">
          <div className="flex items-center justify-between">
            <h6>Opening Details</h6>
            <Button
              size="sm"
              variant="plain"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(opening);
              }}
              className="flex items-center justify-center gap-1 p-2"
              title="Edit Opening"
            >
              <ApolloIcon name="pen" className="text-xs text-black" />
              <span className="text-sm">Edit Opening</span>
            </Button>
          </div>
          <div className="flex items-center justify-end gap-2">
            {/* <Button variant="solid" size="xs" onClick={handleOpenOpeningDetails}>
              Opening Details
            </Button> */}
            <Button variant="plain" size="xs" onClick={onBack} className="flex items-center gap-1">
              <ApolloIcon name="cross" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <Card className="shadow-none">
            <OpeningDetailsGrid
              opening={opening}
              openingData={transformedOpeningData}
              lead={lead}
              offerId={offerId || ''}
              openingIdFromProp={openingIdFromProp || ''}
              session={session}
              hideDuplicateFields={true}
              offer={opening}
              columns={1}
            />
          </Card>
          <Card className="shadow-none">
            <OpeningDocumentsView
              opening={opening}
              lead={lead}
              session={session}
              fetchedOpening={fetchedOpening}
              offerId={offerId || ''}
              openingIdFromProp={openingIdFromProp || ''}
              refetchOpening={refetchOpening}
              onOpenPaymentHistory={() => dialogSetters.setIsPaymentHistoryModalOpen(true)}
            />
          </Card>
        </div>
      </div>

      <OpeningDetailsDialogs
        dialogStates={dialogStates}
        dialogSetters={dialogSetters}
        leadId={leadId || ''}
        offerId={offerId || ''}
        openingIdFromProp={openingIdFromProp || ''}
        opening={opening}
        fetchedOpening={fetchedOpening}
        refetchOpening={refetchOpening}
        dashboardType={DashboardType.OPENING}
        splitPaymentAgentOptions={splitPaymentAgentOptions}
        inboundPaymentAgentOptions={inboundPaymentAgentOptions}
        handleSplitPaymentSubmit={handleSplitPaymentSubmit}
        handleInboundPaymentSubmit={handleInboundPaymentSubmit}
        isPaymentMutationPending={isPaymentMutationPending}
        documentHandler={documentHandler}
        taskTypeValue={taskTypeValue}
        openingData={opening}
        selectedRows={openingId ? [openingId] : []}
        selectedItems={opening ? [opening] : []}
        onCreateItem={async (_type, _data, _outOfferId) => {}}
        onNettoSuccess={() => {}}
        isCreatingConfirmation={false}
        isCreatingPaymentVoucher={false}
        isCreatingLost={false}
        isCreatingOpening={false}
      />
    </div>
  );
}
