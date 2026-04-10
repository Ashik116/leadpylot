'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import TransferTransactionForm from './TransferTransactionForm';
import RefundTransactionForm from './RefundTransactionForm';
import BouncedTransactionForm from './BouncedTransactionForm';
import BulkUpdateTransactionForm from './BulkUpdateTransactionForm';

export type TransactionActionType = 'transfer' | 'refund' | 'bounced' | 'bulk_update';

interface TransactionActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: TransactionActionType;
  selectedRows: any[];
  onSubmit?: (actionType: TransactionActionType, formData: any, selectedRows: any[]) => void;
}

const TransactionActionDialog: React.FC<TransactionActionDialogProps> = ({
  isOpen,
  onClose,
  actionType,
  selectedRows,
  onSubmit,
}) => {
  const handleFormSubmit = (formData: any) => {
    if (onSubmit) {
      onSubmit(actionType, formData, selectedRows);
    }
    onClose();
  };

  const getTitle = () => {
    switch (actionType) {
      case 'transfer':
        return 'Transfer Transactions';
      case 'refund':
        return 'Refund Transactions';
      case 'bounced':
        return 'Bounce Transactions';
      case 'bulk_update':
        return 'Bulk Update Transactions';
      default:
        return 'Transaction Action';
    }
  };

  // Render form content based on action type
  const renderFormContent = () => {
    switch (actionType) {
      case 'transfer':
        return (
          <TransferTransactionForm
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            selectedRows={selectedRows}
          />
        );
      case 'refund':
        return (
          <RefundTransactionForm
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            selectedRows={selectedRows}
          />
        );
      case 'bounced':
        return (
          <BouncedTransactionForm
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            selectedRows={selectedRows}
          />
        );
      case 'bulk_update':
        return (
          <BulkUpdateTransactionForm
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            selectedRows={selectedRows}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="p-1">
        <h2 className="mb-4 text-xl font-semibold">{getTitle()}</h2>

        {renderFormContent()}

        {/* Note: Submit buttons are handled within each form component */}
      </div>
    </Dialog>
  );
};

export default TransactionActionDialog;
