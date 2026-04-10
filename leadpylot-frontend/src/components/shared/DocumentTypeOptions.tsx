import { useMemo } from 'react';

export interface DocumentTypeOption {
  value: string;
  label: string;
}

export interface DocumentTypeOptionsProps {
  hasOpening?: boolean;
  hasConfirmation?: boolean;
  hasPaymentVoucher?: boolean;
  dashboardType?: string;
  selectedProgressFilter?: string;
}

/**
 * Shared component for document type options
 * Can be used in UploadFilesModal and other components that need document type selection
 */
export const useDocumentTypeOptions = ({
  hasOpening,
  hasConfirmation,
  hasPaymentVoucher,
  dashboardType,
  selectedProgressFilter,
}: DocumentTypeOptionsProps = {}): DocumentTypeOption[] => {
  return useMemo(() => {
    const options: DocumentTypeOption[] = [
      { value: 'offer-extra', label: 'Offer Extra' },
      { value: 'offer-email', label: 'Offer Mail' },
      { value: 'opening-contract', label: 'Opening Contract' },
      { value: 'opening-id', label: 'Opening ID' },
      { value: 'opening-extra', label: 'Opening Extra' },
      { value: 'opening-email', label: 'Opening Email' },
      { value: 'confirmation-contract', label: 'Confirmation Contract' },
      { value: 'confirmation-extra', label: 'Confirmation Extra' },
      { value: 'confirmation-email', label: 'Confirmation Email' },
      { value: 'payment-contract', label: 'Payment Contract' },
      { value: 'payment-extra', label: 'Payment Extra' },
      { value: 'payment-email', label: 'Payment Email' },
      { value: 'netto1-mail', label: 'Netto1 Email' },
      { value: 'netto2-mail', label: 'Netto2 Email' },
    ];

    // Filter options based on context if needed
    // This can be extended based on business logic
    return options;
  }, [hasOpening, hasConfirmation, hasPaymentVoucher, dashboardType, selectedProgressFilter]);
};

/**
 * Document type constants for easy reference
 */
export const DOCUMENT_TYPES = {
  OFFER_EXTRA: 'offer-extra',
  OFFER_EMAIL: 'offer-email',
  OFFER_CONTRACT: 'offer-contract',
  OPENING_CONTRACT: 'opening-contract',
  OPENING_ID: 'opening-id',
  OPENING_EXTRA: 'opening-extra',
  OPENING_EMAIL: 'opening-email',
  CONFIRMATION_CONTRACT: 'confirmation-contract',
  CONFIRMATION_EXTRA: 'confirmation-extra',
  CONFIRMATION_EMAIL: 'confirmation-email',
  PAYMENT_CONTRACT: 'payment-contract',
  PAYMENT_EXTRA: 'payment-extra',
  PAYMENT_EMAIL: 'payment-email',
  NETTO1_EMAIL: 'netto1-mail',
  NETTO2_EMAIL: 'netto2-mail',
} as const;

/**
 * Static document type options for cases where filtering is not needed
 */
export const STATIC_DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  { value: DOCUMENT_TYPES.OFFER_EXTRA, label: 'Offer Extra' },
  { value: DOCUMENT_TYPES.OFFER_EMAIL, label: 'Offer Mail' },
  { value: DOCUMENT_TYPES.OFFER_CONTRACT, label: 'Offer Contract' },
  { value: DOCUMENT_TYPES.OPENING_CONTRACT, label: 'Opening Contract' },
  { value: DOCUMENT_TYPES.OPENING_ID, label: 'Opening ID' },
  { value: DOCUMENT_TYPES.OPENING_EXTRA, label: 'Opening Extra' },
  { value: DOCUMENT_TYPES.OPENING_EMAIL, label: 'Opening Email' },
  { value: DOCUMENT_TYPES.CONFIRMATION_CONTRACT, label: 'Confirmation Contract' },
  { value: DOCUMENT_TYPES.CONFIRMATION_EXTRA, label: 'Confirmation Extra' },
  { value: DOCUMENT_TYPES.CONFIRMATION_EMAIL, label: 'Confirmation Email' },
  { value: DOCUMENT_TYPES.PAYMENT_CONTRACT, label: 'Payment Contract' },
  { value: DOCUMENT_TYPES.PAYMENT_EXTRA, label: 'Payment Extra' },
  { value: DOCUMENT_TYPES.PAYMENT_EMAIL, label: 'Payment Email' },
  { value: DOCUMENT_TYPES.NETTO1_EMAIL, label: 'Netto1 Email' },
  { value: DOCUMENT_TYPES.NETTO2_EMAIL, label: 'Netto2 Email' },
];

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];
