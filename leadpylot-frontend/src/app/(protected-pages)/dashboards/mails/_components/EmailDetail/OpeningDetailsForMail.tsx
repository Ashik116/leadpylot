'use client';

import React from 'react';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { OpeningDetailsGrid } from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/OpeningDetailsGrid';
import PaymentHistoryModal from '@/app/(protected-pages)/dashboards/openings/_components/PaymentHistoryModal';
import AgentPaymentModal from '@/app/(protected-pages)/dashboards/openings/_components/opening_details/AgentPaymentModal';
import { DashboardType } from '@/app/(protected-pages)/dashboards/_components/dashboardTypes';
import Card from '@/components/ui/Card';
import { useOpeningDetailsForMailData } from './useOpeningDetailsForMailData';
import { OpeningDocumentsView } from './OpeningDocumentsView';
import type { OpeningDetailsForMailProps } from './types';

const OpeningDetailsForMail: React.FC<OpeningDetailsForMailProps> = ({
  opening,
  offer,
  lead,
  openingIdFromProp,
  dashboardType,
  offerIds,
}) => {
  const { data: session } = useSession();

  const {
    modalStates,
    modalSetters,
    offerId,
    fullOpening,
    openingWithFinancials,
    openingData,
    handleRefetchOpening,
    splitPaymentAgentOptions,
    inboundPaymentAgentOptions,
    handleSplitPaymentSubmit,
    handleInboundPaymentSubmit,
    isPaymentMutationPending,
  } = useOpeningDetailsForMailData({ opening, offer, openingIdFromProp });

  if (!openingData) {
    return null;
  }

  const handleOpenPaymentHistory = () => {
    modalSetters.setShouldOpenAddForm(true);
    modalSetters.setIsPaymentHistoryModalOpen(true);
  };

  return (
    <div className="space-y-1">
      {dashboardType === DashboardType.OPENING ? (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          <Card className="border-none">
            <OpeningDetailsGrid
              opening={fullOpening}
              openingData={openingData}
              lead={lead}
              offerId={String(offerId || '')}
              openingIdFromProp={openingIdFromProp}
              session={session}
              hideDuplicateFields={true}
              offer={offer}
              columns={1}
            />
          </Card>
          <Card className="border-none">
            <OpeningDocumentsView
              offerIds={offerIds}
              opening={fullOpening}
              lead={lead}
              session={session}
              fetchedOpening={openingWithFinancials}
              offerId={String(offerId || '')}
              openingIdFromProp={openingIdFromProp}
              refetchOpening={handleRefetchOpening}
              onOpenPaymentHistory={handleOpenPaymentHistory}
            />
          </Card>
        </div>
      ) : (
        <OpeningDetailsGrid
          opening={fullOpening}
          openingData={openingData}
          lead={lead}
          offerId={String(offerId || '')}
          openingIdFromProp={openingIdFromProp}
          session={session}
          hideDuplicateFields={true}
          offer={offer}
        />
      )}

      {/* Payment History Modal */}
      {session?.user?.role === Role.ADMIN && (
        <PaymentHistoryModal
          isOpen={modalStates.isPaymentHistoryModalOpen}
          onClose={() => {
            modalSetters.setIsPaymentHistoryModalOpen(false);
            modalSetters.setShouldOpenAddForm(false);
          }}
          offerId={String(offerId || '')}
          financials={openingWithFinancials?.financials || {}}
          invalidateQueries={['opening', openingIdFromProp]}
          refetch={handleRefetchOpening}
          onSuccess={() => { }}
          openAddFormByDefault={modalStates.shouldOpenAddForm}
        />
      )}

      {/* Split Agent Payment Modal */}
      {session?.user?.role === Role.ADMIN && (
        <AgentPaymentModal
          isOpen={modalStates.isSplitPaymentModalOpen}
          onClose={() => modalSetters.setIsSplitPaymentModalOpen(false)}
          onSubmit={handleSplitPaymentSubmit}
          agentOptions={splitPaymentAgentOptions}
          isLoading={isPaymentMutationPending}
          title="Record Split Agent Payment"
          agentType="split"
        />
      )}

      {/* Inbound Agent Payment Modal */}
      {session?.user?.role === Role.ADMIN && (
        <AgentPaymentModal
          isOpen={modalStates.isInboundPaymentModalOpen}
          onClose={() => modalSetters.setIsInboundPaymentModalOpen(false)}
          onSubmit={handleInboundPaymentSubmit}
          agentOptions={inboundPaymentAgentOptions}
          isLoading={isPaymentMutationPending}
          title="Record Inbound Agent Payment"
          agentType="inbound"
        />
      )}
    </div>
  );
};

export default OpeningDetailsForMail;
