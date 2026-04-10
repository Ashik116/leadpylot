import { DOCUMENT_TYPES } from '@/components/shared/DocumentTypeOptions';

const useDocumentUploaderColumns = () => {
  return [
    {
      id: 'offers',
      label: 'Offers',
      columns: [
        { key: 'contract', label: 'Contract', type: DOCUMENT_TYPES.OFFER_CONTRACT },
        { key: 'mail', label: 'Mail', type: DOCUMENT_TYPES.OFFER_EMAIL },
        { key: 'id', label: 'ID', type: '', visible: false }, // Not available for offers
        { key: 'extra', label: 'Extra', type: DOCUMENT_TYPES.OFFER_EXTRA },
      ],
    },
    {
      id: 'openings',
      label: 'Openings',
      columns: [
        { key: 'contract', label: 'Contract', type: DOCUMENT_TYPES.OPENING_CONTRACT },
        { key: 'mail', label: 'Mail', type: DOCUMENT_TYPES.OPENING_EMAIL },
        { key: 'id', label: 'ID', type: DOCUMENT_TYPES.OPENING_ID, visible: true },
        { key: 'extra', label: 'Extra', type: DOCUMENT_TYPES.OPENING_EXTRA },
      ],
    },
    {
      id: 'confirmation',
      label: 'Confirmation',
      columns: [
        { key: 'contract', label: 'Contract', type: DOCUMENT_TYPES.CONFIRMATION_CONTRACT },
        { key: 'mail', label: 'Mail', type: DOCUMENT_TYPES.CONFIRMATION_EMAIL },
        { key: 'id', label: 'ID', type: '', visible: false }, // Not available for confirmations
        { key: 'extra', label: 'Extra', type: DOCUMENT_TYPES.CONFIRMATION_EXTRA },
      ],
    },
    {
      id: 'payment',
      label: 'Payment',
      columns: [
        { key: 'contract', label: 'Contract', type: DOCUMENT_TYPES.PAYMENT_CONTRACT },
        { key: 'mail', label: 'Mail', type: DOCUMENT_TYPES.PAYMENT_EMAIL },
        { key: 'id', label: 'ID', type: '', visible: false }, // Not available for payments
        { key: 'extra', label: 'Extra', type: DOCUMENT_TYPES.PAYMENT_EXTRA },
      ],
    },
    {
      id: 'netto',
      label: 'Netto',
      columns: [
        { key: 'contract', label: 'Contract', type: '', visible: false }, // Not available for netto
        { key: 'mail', label: 'Netto1', type: DOCUMENT_TYPES.NETTO1_EMAIL },
        { key: 'id', label: 'Netto2', type: DOCUMENT_TYPES.NETTO2_EMAIL },
        { key: 'extra', label: 'Extra', type: '', visible: false }, // Not available for netto
      ],
    },
  ];
};

export default useDocumentUploaderColumns;
