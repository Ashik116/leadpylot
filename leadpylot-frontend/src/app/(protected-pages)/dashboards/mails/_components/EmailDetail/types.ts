export interface OpeningDetailsForMailProps {
  opening: any;
  offer: any;
  lead: any;
  openingIdFromProp: string;
  dashboardType?: any;
  offerIds?: string[];
}

export interface OpeningDocumentsViewProps {
  opening: any;
  lead: any;
  session: any;
  fetchedOpening: any;
  offerId: string;
  offerIds?: string[];
  openingIdFromProp: string;
  refetchOpening: () => Promise<any>;
  onOpenPaymentHistory: () => void;
}

export interface PaymentModalStates {
  isPaymentHistoryModalOpen: boolean;
  shouldOpenAddForm: boolean;
  isSplitPaymentModalOpen: boolean;
  isInboundPaymentModalOpen: boolean;
}

export interface PaymentModalSetters {
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
  setShouldOpenAddForm: (open: boolean) => void;
  setIsSplitPaymentModalOpen: (open: boolean) => void;
  setIsInboundPaymentModalOpen: (open: boolean) => void;
}
