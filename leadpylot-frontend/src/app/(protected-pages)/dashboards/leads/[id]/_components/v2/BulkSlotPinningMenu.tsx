'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDocumentSlotsMetadata, usePinToSlotBulk } from '@/services/hooks/useDocumentSlots';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface BulkSlotPinningMenuProps {
  offerIds: string[];
  documentIds: string[];
  onSuccess?: () => void;
  disabled?: boolean;
  title?: string;
}

export const BulkSlotPinningMenu: React.FC<BulkSlotPinningMenuProps> = ({
  offerIds,
  documentIds,
  onSuccess,
  disabled = false,
  title = 'Pin to Slot',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: metadata, isLoading } = useDocumentSlotsMetadata();
  const pinToSlotMutation = usePinToSlotBulk();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const handlePinToSlot = async (slotName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!offerIds?.length || !documentIds?.length) return;
    await pinToSlotMutation.mutateAsync({
      slotName,
      offerIds,
      documentIds,
    });
    setIsOpen(false);
    onSuccess?.();
  };

  if (isLoading || !offerIds?.length || !documentIds?.length) return null;

  const slotListContent = (
    <div
      data-slot-pinning-popover
      className="ring-opacity-5 max-w-80 min-w-56 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1.5">
        <h3 className="text-xxs mb-1.5 px-2 font-semibold tracking-wider text-gray-500 uppercase">
          Pin to Slot
        </h3>

        <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
          {Object.entries(metadata?.data?.metadata || {})
            .filter(([key]) => key !== 'last_email' && key !== 'last_email_lead')
            .map(([key, slot]) => (
              <button
                key={key}
                type="button"
                onClick={(e) => handlePinToSlot(key, e)}
                disabled={pinToSlotMutation.isPending}
                className="group hover:bg-ocean-2 flex w-full items-center rounded-md px-2 py-1.5 text-sm text-gray-700 hover:text-white disabled:opacity-50"
              >
                <ApolloIcon
                  name={slot.direction === 'incoming' ? 'arrow-down' : 'arrow-up'}
                  className="mr-2.5 h-3.5 w-3.5 text-gray-400 group-hover:text-white"
                />
                {slot.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="default"
        size="xs"
        className="hover:text-ocean-2 bg-ocean-2/20! text-ocean-2! hover:bg-ocean-2/30! flex items-center gap-1 border-transparent"
        icon={<ApolloIcon name="thumbtack" className="text-md" />}
        title={title}
        disabled={disabled || pinToSlotMutation.isPending}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        <p className="flex items-center gap-1">
          {pinToSlotMutation.isPending ? 'Pinning...' : title}
          <ApolloIcon name="dropdown-large" className="text-xs text-gray-500" />
        </p>
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 z-9999 mt-1" onClick={(e) => e.stopPropagation()}>
          {slotListContent}
        </div>
      )}
    </div>
  );
};
