import { TDashboardType } from '../../../_components/dashboardTypes';

export type TaskType = 'lead' | 'offer' | 'opening' | 'email' | 'custom' | 'kanban';

export interface OpeningDetailsPopupProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  openingData: any;
  config: any;
  selectedRows: string[];
  selectedItems: any[];
  onRevertOffers: () => void;
  onCreateItem: (
    type: 'confirmation' | 'payment-voucher' | 'lost' | 'send-to-out' | 'revert-from-out',
    data: { reference_no?: string; notes?: string; files?: File[]; amount?: number },
    outOfferId?: string
  ) => Promise<void>;
  onNettoSuccess: () => void;
  handleDocumentAction: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleFileUpload: (
    id: string,
    files: File[] | null,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => void;
  isReverting: boolean;
  isCreatingConfirmation: boolean;
  isCreatingPaymentVoucher: boolean;
  isCreatingLost: boolean;
  setCreateOpeningOpen?: (open: boolean) => void;
  setIsSendToOutDialogOpen?: (open: boolean) => void;
  setIsLostDialogOpen?: (open: boolean) => void;
  setIsBulkUpdateDialogOpen?: (open: boolean) => void;
  setCreateConfirmationDialogOpen?: (open: boolean) => void;
  setIsPaymentVoucherDialogOpen?: (open: boolean) => void;
  setIsNettoDialogOpen?: (open: boolean) => void;
  setIsBulkNettoDialogOpen?: (open: boolean) => void;
  onCreateOpening?: () => void;
  isCreatingOpening?: boolean;
  dashboardType: TDashboardType;
  selectedProgressFilter: TDashboardType;
  hideActionButtons?: boolean;
  renderWithoutDialog?: boolean;
  className?: string;
  taskType?: TaskType;
}

export interface DialogStates {
  isTicketModalOpen: boolean;
  createConfirmationDialogOpen: boolean;
  isPaymentVoucherDialogOpen: boolean;
  isNettoDialogOpen: boolean;
  isBulkNettoDialogOpen: boolean;
  isLostDialogOpen: boolean;
  isPaymentHistoryModalOpen: boolean;
  isBulkUpdateDialogOpen: boolean;
  isSendToOutDialogOpen: boolean;
  isCreateOpeningDialogOpen: boolean;
  isSplitPaymentModalOpen: boolean;
  isInboundPaymentModalOpen: boolean;
  shouldOpenAddForm: boolean;
}

export interface DialogSetters {
  setIsTicketModalOpen: (open: boolean) => void;
  setCreateConfirmationDialogOpen: (open: boolean) => void;
  setIsPaymentVoucherDialogOpen: (open: boolean) => void;
  setIsNettoDialogOpen: (open: boolean) => void;
  setIsBulkNettoDialogOpen: (open: boolean) => void;
  setIsLostDialogOpen: (open: boolean) => void;
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setIsSendToOutDialogOpen: (open: boolean) => void;
  setIsCreateOpeningDialogOpen: (open: boolean) => void;
  setIsSplitPaymentModalOpen: (open: boolean) => void;
  setIsInboundPaymentModalOpen: (open: boolean) => void;
  setShouldOpenAddForm: (open: boolean) => void;
}

export interface OpeningDetailsDialogsProps {
  dialogStates: DialogStates;
  dialogSetters: DialogSetters;
  leadId: string;
  offerId: string;
  openingIdFromProp: string;
  opening: any;
  openingData: any;
  selectedRows: string[];
  selectedItems: any[];
  fetchedOpening: any;
  refetchOpening: () => void;
  onCreateItem: OpeningDetailsPopupProps['onCreateItem'];
  onNettoSuccess: () => void;
  onCreateOpening?: () => void;
  isCreatingConfirmation: boolean;
  isCreatingPaymentVoucher: boolean;
  isCreatingLost: boolean;
  isCreatingOpening: boolean;
  dashboardType: TDashboardType;
  splitPaymentAgentOptions: { value: string; label: string }[];
  inboundPaymentAgentOptions: { value: string; label: string }[];
  handleSplitPaymentSubmit: (data: { agent_id: string; amount: number }) => Promise<void>;
  handleInboundPaymentSubmit: (data: { agent_id: string; amount: number }) => Promise<void>;
  isPaymentMutationPending: boolean;
  documentHandler: any;
  taskTypeValue: TaskType;
}

export interface OpeningDetailsHeaderProps {
  title: string;
  hideActionButtons: boolean;
  config: any;
  selectedRows: string[];
  selectedItems: any[];
  session: any;
  selectedProgressFilter: TDashboardType;
  dashboardType: TDashboardType;
  isReverting: boolean;
  offerId: string;
  leadId: string;
  dialogSetters: DialogSetters;
}

export interface OpeningDetailsContentProps {
  // Header Props
  title: string;
  hideActionButtons: boolean;
  config: any;
  selectedRows: string[];
  selectedItems: any[];
  selectedProgressFilter: TDashboardType;
  dialogSetters: DialogSetters;
  isReverting: boolean;

  // Content Props
  opening: any;
  lead: any;
  leadId: string;
  offerId: string;
  openingIdFromProp: string;
  transformedOpeningData: any;
  session: any;
  dashboardType: TDashboardType;
  handleEditOffer: () => void;
  taskTypeValue: TaskType;
  taskType?: TaskType;
  viewState: 'table' | 'details' | 'form';
  setViewState: (state: 'table' | 'details' | 'form') => void;
  setIsTicketModalOpen: (open: boolean) => void;
  propsClassName?: string;
}
