import React from 'react';
import { Role } from '@/configs/navigation.config/auth.route.config';
import ActionButtonsSection from '../ActionButtonsSection';
import { useUnifiedDashboardContext } from './UnifiedDashboardContext';

const UnifiedDashboardActionButtons = () => {
  const context = useUnifiedDashboardContext();

  if (!context) return null;

  const {
    config,
    selectedRows,
    selectedItems,
    session,
    setIsBulkUpdateDialogOpen,
    setCreateOpeningOpen,
    setCreateConfirmationDialogOpen,
    setIsPaymentVoucherDialogOpen,
    setIsNettoDialogOpen,
    setIsBulkNettoDialogOpen,
    setIsLostDialogOpen,
    setIsSendToOutDialogOpen,
    selectedProgressFilter,
    dashboardType,
    handleRevertOffers,
    isReverting,
    handleSelfAssignTickets,
    handleAssignTicketsToOther,
    pathname,
  } = context;

  const allowAgentGroupedActions =
    session?.user?.role === Role.AGENT && pathname?.startsWith('/dashboards/offers');

  return (
    <ActionButtonsSection
      config={config}
      selectedRows={selectedRows}
      selectedItems={selectedItems}
      session={session}
      setIsBulkUpdateDialogOpen={setIsBulkUpdateDialogOpen}
      setCreateOpeningOpen={setCreateOpeningOpen}
      setCreateConfirmationDialogOpen={setCreateConfirmationDialogOpen}
      setIsPaymentVoucherDialogOpen={setIsPaymentVoucherDialogOpen}
      setIsNettoDialogOpen={setIsNettoDialogOpen}
      setIsBulkNettoDialogOpen={setIsBulkNettoDialogOpen}
      setIsLostDialogOpen={setIsLostDialogOpen}
      setIsSendToOutDialogOpen={setIsSendToOutDialogOpen}
      allowAgentGroupedActions={allowAgentGroupedActions}
      selectedProgressFilter={selectedProgressFilter}
      dashboardType={dashboardType}
      onRevertOffers={handleRevertOffers}
      isReverting={isReverting}
      onSelfAssignTickets={handleSelfAssignTickets}
      onAssignTicketsToOther={handleAssignTicketsToOther}
      dropdownButtonSize="xs"
      dropdownIconClassName="text-sm"
      switchMode={false}
    />
  );
};

export default UnifiedDashboardActionButtons;
