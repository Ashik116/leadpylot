import { useOfferTickets } from '@/services/hooks/useOfferTickets';
import { apiGetOfferTickets, GetOfferTicketsParams } from '@/services/LeadsService';
import { createTransformFunction } from '../../_components/DataTransformUtils';
import { DashboardType } from '../../_components/dashboardTypes';
import OfferShortDetails from '../../offers/_components/OfferShortDetails';

// Transform function for offer tickets - adds ticket-specific fields
export const transformOfferTicketsData = createTransformFunction((item: any) => ({
  email: item?.lead_id?.email_from,
  status: item?.status,
  // Ticket-specific fields
  ticket: item?.ticket,
  ticketMessage: item?.ticket?.message,
  ticketIsDone: item?.ticket?.isDone,
  ticketPriority: item?.ticket?.priority,
  // Workflow status: pending (unassigned), in_progress (assigned), done (completed)
  ticketStatus: item?.ticket?.ticket_status,
  ticketCreatedAt: item?.ticket?.createdAt,
  ticketAssignedAt: item?.ticket?.assignedAt,
  ticketAssignedTo: item?.ticket?.assignedTo,
  ticketAssignedBy: item?.ticket?.assignedBy,
  ticketCreator: item?.ticket?.creator,
  ticketCount: item?.ticketCount,
  pendingTicketCount: item?.pendingTicketCount,
  inProgressTicketCount: item?.inProgressTicketCount,
  doneTicketCount: item?.doneTicketCount,
}));

// Configuration object for offer tickets dashboard
export const offerTicketsConfig = {
  pageSize: 50,
  tableName: 'offer_tickets',
  searchPlaceholder: 'Search offer tickets',
  title: 'Offer Tickets',
  description: 'Total offer tickets',
  invalidateQueries: ['offerTickets', 'offers', 'leads'],
  bulkActionsConfig: {
    entityName: 'offers',
    deleteUrl: '/offers/',
    invalidateQueries: ['offerTickets', 'offers', 'leads'],
  },
  // Action buttons configuration - disable most for tickets view
  showCreateOpening: false,
  showCreateConfirmation: false,
  showCreatePaymentVoucher: false,
  showBulkUpdate: false,
  showNetto: false,
  showBulkNetto: false,
  showProgressFilter: false,
  showRevert: false,
  // Use OFFER_TICKETS dashboard type for ticket-specific columns
  initialProgressFilter: DashboardType?.OFFER_TICKETS,
  // File upload configuration
  fileUploadTableName: 'offers',
  // Row click configuration
  enableRowClick: true,
  getRowClickPath: (row: any) => `/dashboards/leads/${row?.leadId}`,
  defaultColumn: ['pdf', 'source_id', 'createdAt', 'updatedAt'],
  fixedHeight: '90dvh',
  headerSticky: true,
};

// Hook wrapper to make useOfferTickets work with UnifiedDashboard
export const useOfferTicketsHook = (params?: GetOfferTicketsParams) => {
  return useOfferTickets(params, true);
};

// Hook configuration for offer tickets
export const offerTicketsHookConfig = {
  useDataHook: useOfferTicketsHook,
  apiFn: apiGetOfferTickets,
  dataHookParams: {},
  transformData: transformOfferTicketsData,
  ExpandedRowComponent: OfferShortDetails,
  config: offerTicketsConfig,
};
