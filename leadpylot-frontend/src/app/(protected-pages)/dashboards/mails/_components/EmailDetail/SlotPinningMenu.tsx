import React, { useState, useRef, useEffect } from 'react';
import {
  useDocumentSlotsMetadata,
  usePinEmailToOfferSlot,
  usePinToSlotBulk,
} from '@/services/hooks/useDocumentSlots';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { LEAD_TABLE_NAMES } from '../../../leads/[id]/_components/v2/LeadDetailsBulkActionsContext';

interface SlotPinningMenuProps {
  emailId: string;
  currentOfferId?: string;
  documentIds?: string[];
  onSuccess?: () => void;
  hidePinning?: boolean;
  /** When true, render dropdown inline (no portal) - use inside modals/dialogs to avoid z-index issues */
  inline?: boolean;
  title?: string;
}

export const SlotPinningMenu: React.FC<SlotPinningMenuProps> = ({
  emailId,
  currentOfferId,
  documentIds,
  onSuccess,
  hidePinning = false,
  inline = false,
  title = 'Pin to Slot',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getSelectedItems } = useSelectedItemsStore();
  const selectedOfferItems = getSelectedItems(LEAD_TABLE_NAMES.OFFERS);
  const selectedOpeningItems = getSelectedItems(LEAD_TABLE_NAMES.OPENINGS);

  const currentOfferIds =
    selectedOfferItems.length > 0
      ? selectedOfferItems.map((item) => item._id)
      : selectedOpeningItems.length > 0
        ? selectedOpeningItems.map((item) => item._id)
        : null;

  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: metadata, isLoading } = useDocumentSlotsMetadata();

  useEffect(() => {
    if (!inline || !isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [inline, isOpen]);
  const pinToOfferMutation = usePinEmailToOfferSlot();
  const pinToSlotBulkMutation = usePinToSlotBulk();

  const isBulkMode =
    (documentIds && documentIds.length > 0) || (currentOfferIds && currentOfferIds.length > 0);

  const handlePinToOffer = async (slotName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isBulkMode) {
      await pinToSlotBulkMutation.mutateAsync({
        offerIds: currentOfferIds as string[],
        slotName,
        documentIds: documentIds as string[],
        emailId,
      });
    } else {
      if (!currentOfferId) return;
      await pinToOfferMutation.mutateAsync({
        offerId: currentOfferId,
        slotName,
        emailId,
      });
    }
    if (inline) setIsOpen(false);
    onSuccess?.();
  };

  if (isLoading || !currentOfferIds?.length || (!currentOfferIds && !currentOfferId)) return null;

  const slotListContent = (
    <div
      data-slot-pinning-popover
      className="ring-opacity-5 max-w-80 min-w-56 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1.5">
        <h3 className="text-xxs mb-1.5 px-2 font-semibold tracking-wider text-gray-500 uppercase">
          {isBulkMode
            ? `Pin ${documentIds?.length || currentOfferIds?.length} attachment${documentIds?.length === 1 ? '' : 's'} to slot`
            : 'Pin to Slot'}
        </h3>

        <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
          {currentOfferId || currentOfferIds?.length > 0 ? (
            Object.entries(metadata?.data?.metadata || {})
              .filter(([key]) => key !== 'last_email' && key !== 'last_email_lead')
              .map(([key, slot]) => (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => handlePinToOffer(key, e)}
                  className="group hover:bg-ocean-2 flex w-full items-center rounded-md px-2 py-1.5 text-sm text-gray-700 hover:text-white"
                >
                  <ApolloIcon
                    name={slot.direction === 'incoming' ? 'arrow-down' : 'arrow-up'}
                    className="mr-2.5 h-3.5 w-3.5 text-gray-400 group-hover:text-white"
                  />
                  {slot.label}
                </button>
              ))
          ) : (
            <p className="px-2 py-1 text-[11px] text-gray-400 italic">
              No active offer selected to pin slots.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const triggerButton = (
    <Button
      variant="default"
      size="xs"
      className="hover:text-ocean-2 flex items-center gap-1 text-gray-400"
      icon={<ApolloIcon name="thumbtack" className="text-md" />}
      title="Pin to Slot"
      onClick={(e) => {
        e.stopPropagation();
        if (inline) setIsOpen((prev) => !prev);
      }}
    >
      <p className="flex items-center gap-1">
        {title}
        <ApolloIcon name="dropdown-large" className="text-xs text-gray-500" />
      </p>
    </Button>
  );
  const triggerButtonWithTitle = (
    <Button
      variant="plain"
      size="xs"
      className="hover:text-ocean-2 text-gray-400"
      icon={<ApolloIcon name="thumbtack" className="text-md" />}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (inline) setIsOpen((prev) => !prev);
      }}
    >
      {title}
    </Button>
  );
  if (inline) {
    return (
      <div ref={wrapperRef} className="relative">
        {title ? triggerButtonWithTitle : triggerButton}
        {isOpen && (
          <div
            className="absolute top-full right-0 z-[9999] mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {slotListContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover placement="bottom-end" content={slotListContent}>
      {triggerButton}
    </Popover>
  );
};
