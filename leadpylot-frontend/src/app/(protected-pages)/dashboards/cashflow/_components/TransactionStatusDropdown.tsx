'use client';

import { memo } from 'react';
import Select from '@/components/ui/Select';
import { useMarkTransactionReceived } from '@/services/hooks/useCashflow';

interface TransactionStatusDropdownProps {
  transactionId: string;
  currentStatus: string;
}

export const TransactionStatusDropdown = memo<TransactionStatusDropdownProps>(
  ({ transactionId, currentStatus }) => {
    const markReceivedMutation = useMarkTransactionReceived();
    const status = currentStatus || 'sent';

    const handleStatusChange = (selectedOption: { value: string; label: string } | null) => {
      if (!selectedOption) return;
      const newStatus = selectedOption.value;

      // Only allow changing from "sent" to "received"
      if (newStatus === 'received' && status === 'sent') {
        markReceivedMutation.mutate({
          transactionId,
          notes: undefined, // API doesn't require notes, but accepts optional notes
        });
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    // Options: only show "received" if status is "sent", otherwise just show current status
    const options = [
      { value: 'sent', label: 'Sent' },
      { value: 'received', label: 'Received' },
    ];

    const selectedOption = options.find((opt) => opt.value === status) || options[0];
    const isDisabled = status === 'received' || markReceivedMutation.isPending;

    // Color mapping for status display
    const getTextColorClass = (value: string) => {
      switch (value?.toLowerCase()) {
        case 'received':
          return 'text-green-600 font-medium';
        case 'sent':
          return 'text-yellow-600 font-medium';
        default:
          return 'text-gray-700';
      }
    };

    const textColorClass = getTextColorClass(status);

    return (
      <div className="min-w-[100px] overflow-hidden" onClick={handleClick}>
        <Select
          value={selectedOption}
          onChange={handleStatusChange}
          options={options}
          isDisabled={isDisabled}
          isClearable={false}
          className={`w-full ${textColorClass}`}
          classNamePrefix="transaction-status-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            menuPortal: (base) => ({
              ...base,
              zIndex: 99999,
            }),
            menu: (base) => ({
              ...base,
              zIndex: 99999,
            }),
          }}
          size="xs"
        />
      </div>
    );
  }
);

TransactionStatusDropdown.displayName = 'TransactionStatusDropdown';
