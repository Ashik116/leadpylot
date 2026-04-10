'use client';

// import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import ContactAndLeadInfoCards from '../../../mails/_components/EmailDetail/ContactAndLeadInfoCards';
// import SaleDetailsLeads from '../../../leads/[id]/_components/v2/SaleDetailsLeads';
// import { CreateTicketWrapper } from '../../../leads/[id]/_components/CreateTicketWrapper';
// import { OpeningDetailsGrid } from './OpeningDetailsGrid';
// import RightSidebar from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar';
// import EmailViewContent from '../../../mails/_components/EmailDetail/EmailViewContent';
import { useEmailViewStore } from '@/stores/emailViewStore';
import { DashboardType } from '../../../_components/dashboardTypes';
import { OpeningDetailsHeader } from './OpeningDetailsHeader';
import type { OpeningDetailsContentProps } from './types';
import LeadDetailsPage from '../../../leads/[id]/page';

export function OpeningDetailsContent({
  title,
  hideActionButtons,
  config,
  selectedRows,
  selectedItems,
  selectedProgressFilter,
  dialogSetters,
  isReverting,
  opening,
  lead,
  leadId,
  offerId,
  openingIdFromProp,
  transformedOpeningData,
  session,
  dashboardType,
  handleEditOffer,
  taskTypeValue,
  taskType,
  viewState,
  setViewState,
  setIsTicketModalOpen,
  propsClassName,
}: OpeningDetailsContentProps) {
  const hasEmailView = useEmailViewStore((state) => state.data !== null);

  return (
    <div className="flex h-full flex-col">
      {/* Header - Opening Details */}
      <div className="shrink-0 py-1 pl-2">
        <OpeningDetailsHeader
          title={title}
          hideActionButtons={hideActionButtons}
          config={config}
          selectedRows={selectedRows}
          selectedItems={selectedItems}
          session={session}
          selectedProgressFilter={selectedProgressFilter}
          dashboardType={dashboardType}
          isReverting={isReverting}
          offerId={offerId || ''}
          leadId={leadId || ''}
          dialogSetters={dialogSetters}
          hideViewLead={true}
        />
      </div>
      {/* Content Area */}
      <div className="min-h-0 flex-1 pl-2 pb-1">
        <LeadDetailsPage
          leadId={leadId}
          showInDialog
          taskType={taskTypeValue || taskType}
          offerId={offerId || undefined}
          openingId={openingIdFromProp ? String(openingIdFromProp) : opening?._id}
        />
        {/* {dashboardType === DashboardType.OPENING && (
          <ContactAndLeadInfoCards
            lead={lead}
            leadId={leadId}
            showCreateTaskButton={true}
            onCreateTaskClick={() => setIsTicketModalOpen(true)}
          />
        )} */}
        <div className={`flex flex-col ${dashboardType === DashboardType.OPENING ? '' : ''}`}>
          {/* Offers Section */}
          {/* {dashboardType === DashboardType.OPENING && (
            <OfferSectionTable sectionTitle={'Offers'} offers={opening?.offers} />
          )} */}

          {/* Sales Details / Current Offer Section */}
          <div className={`${dashboardType === DashboardType.OPENING ? 'order-2' : 'order-1'}`}>
            {/* {dashboardType === DashboardType.OPENING ? (
              <SaleDetailsLeads
                lead={lead as any}
                className=""
                openingIdToShow={openingIdFromProp ? String(openingIdFromProp) : undefined}
                onEdit={handleEditOffer}
                dashboardType={dashboardType}
              />
            ) : ( */}
              {/* <> */}
                {/* <div className="flex items-center justify-between border-b border-gray-100">
                  <div className="grid w-full grid-cols-2 bg-white">
                    <div className="col-span-1 flex w-full items-center justify-between gap-3">
                      <h6 className="text-base font-medium text-black">Current Offer</h6>
                      <Button
                        size="sm"
                        variant="plain"
                        className="flex items-center gap-1 border-none"
                        onClick={handleEditOffer}
                        title="Edit Offer"
                      >
                        <ApolloIcon name="pen" className="text-black" />
                        <span className="ext-base text-sm font-medium text-black">Edit Offer</span>
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="plain" className="col-span-1 border-none">
                        <ApolloIcon name="mail" className="text-black" />
                      </Button>
                    </div>
                  </div>
                </div> */}
                {/* <Card className="border-none">
                  <OpeningDetailsGrid
                    opening={opening}
                    openingData={transformedOpeningData}
                    lead={lead}
                    offerId={offerId || ''}
                    openingIdFromProp={openingIdFromProp || ''}
                    session={session}
                    hideDuplicateFields={true}
                    offer={opening}
                  />
                </Card> */}
              {/* </> */}
            {/* )} */}
          </div>
        </div>

        {/* Tasks Section */}
        {/* {dashboardType === DashboardType.OPENING && (
          <div className="mt-2">
            <CreateTicketWrapper
              leadId={lead._id}
              viewState={viewState}
              onViewStateChange={(newViewState) => setViewState(newViewState)}
              listHeightClass="max-h-[30%]"
            />
          </div>
        )} */}
      </div>

      {/* Right Panel - Email View or Updates and Notes */}
      {/* {dashboardType === DashboardType.OPENING && (
        <div className="flex flex-col gap-2 overflow-hidden">
          {(leadId || hasEmailView) && (
            <div className="3xl:h-[90vh] h-[50dvh] overflow-hidden xl:h-[80dvh]">
              {hasEmailView ? (
                <EmailViewContent />
              ) : (
                <RightSidebar
                  propsClassName={propsClassName}
                  singleLeadId={leadId}
                  taskType={taskTypeValue || taskType}
                  currentOfferId={offerId}
                />
              )}
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}
