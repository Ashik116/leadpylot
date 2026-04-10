import React, { useMemo, useCallback } from 'react';
import { useOffers } from '@/services/hooks/useLeads';
import Select from '@/components/ui/Select';
import type { OfferApiResponse } from '@/services/LeadsService';
import type { OptionProps } from 'react-select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export interface OrderedOffer {
  id: string;
  order: number;
  offer: OfferApiResponse;
}

interface OffersSelectorProps {
  leadId?: string;
  selectedOffers: OrderedOffer[];
  onOffersChange: (offers: OrderedOffer[]) => void;
  offers?: any;
  maxOffers?: number; // Maximum number of offers allowed based on template
}

export const useLeadOffers = (leadId?: string) => {
  const { data: offersData, isLoading } = useOffers(
    leadId ? { lead_id: leadId, limit: 100 } : { enabled: false }
  );

  return {
    offers: offersData?.data || [],
    isLoading,
  };
};

// Custom Option component that shows order number
const OfferOption = (props: OptionProps<any>) => {
  const { innerProps, label, isSelected, isDisabled, data } = props;
  const order = data?.order;

  return (
    <div
      className={classNames(
        'select-option flex items-center justify-between px-3 py-2',
        !isDisabled && 'cursor-pointer',
        isDisabled && 'cursor-not-allowed opacity-50 text-gray-500',
        !isDisabled && !isSelected && 'hover:bg-sand-4',
        !isDisabled && isSelected && 'bg-green-50 font-medium text-green-700',
        !isDisabled && !isSelected && 'text-gray-700'
      )}
      {...innerProps}
    >
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {isSelected && order && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
            {order}
          </span>
        )}
        {isSelected && !order && <ApolloIcon name="check" className="h-4 w-4 text-green-600" />}
      </div>
    </div>
  );
};

export const OffersSelector: React.FC<OffersSelectorProps> = ({
  selectedOffers,
  onOffersChange,
  offers,
  maxOffers,
}) => {
  // Memoize offerOptions so react-select can match value by reference
  const offerOptions = useMemo(() => {
    const selectedOrderMap = new Map(selectedOffers.map((offer) => [offer.id, offer.order]));
    return (offers ?? []).map((offer: any) => {
      const order = selectedOrderMap.get(offer._id);
      return {
        value: offer._id,
        label: offer?.title,
        offer,
        order,
      };
    });
  }, [offers, selectedOffers]);

  const handleOfferSelect = useCallback(
    (newSelectedOptions: any) => {
      if (!newSelectedOptions || (Array.isArray(newSelectedOptions) && newSelectedOptions.length === 0)) {
        onOffersChange([]);
        return;
      }

      if (Array.isArray(newSelectedOptions)) {
        // Reject selection if it would exceed maxOffers (do not update state)
        if (maxOffers !== undefined && maxOffers > 0 && newSelectedOptions.length > maxOffers) {
          toast.push(
            <Notification title="Maximum offers exceeded" type="warning">
              This template allows a maximum of {maxOffers} offer{maxOffers === 1 ? '' : 's'}. Please
              select {maxOffers} or fewer offers.
            </Notification>
          );
          return;
        }

        const orderedOffers: OrderedOffer[] = newSelectedOptions.map((option: any, index: number) => ({
          id: option.value,
          order: index + 1,
          offer: option.offer,
        }));

        onOffersChange(orderedOffers);
      }
    },
    [onOffersChange, maxOffers]
  );

  // Use actual option references from offerOptions so react-select matches by reference (critical for controlled multi-select)
  const selectedOptions = useMemo(() => {
    const sorted = [...selectedOffers].sort((a, b) => a.order - b.order);
    return sorted
      .map((orderedOffer) => offerOptions.find((opt: any) => opt.value === orderedOffer.id))
      .filter(Boolean) as any[];
  }, [selectedOffers, offerOptions]);

  // Check if max offers limit is reached
  const isMaxReached =
    maxOffers !== undefined && maxOffers > 0 && selectedOffers.length >= maxOffers;

  return (
    <div className="w-full min-w-0 [&_.select-control]:rounded-sm">
      <label className="mb-0.5 block text-xs font-medium tracking-wide text-slate-500 uppercase">
        Offers <span className="text-red-500">*</span>
        {maxOffers !== undefined && maxOffers > 0 && (
          <span className="ml-1 text-xs font-normal text-slate-400 normal-case">
            (Max: {maxOffers})
          </span>
        )}
      </label>
      <Select
        placeholder="Select offers"
        isMulti
        value={selectedOptions}
        onChange={handleOfferSelect}
        options={offerOptions}
        selectMultipleOptions
        className="w-full"
        getOptionValue={(opt: any) => opt?.value}
        getOptionLabel={(opt: any) => opt?.label ?? ''}
        components={{
          Option: OfferOption,
        }}
        isOptionDisabled={(option: any) => {
          // Disable options if max offers is reached and this option is not already selected
          if (isMaxReached && !selectedOffers.some((offer) => offer.id === option.value)) {
            return true;
          }
          return false;
        }}
      />
    </div>
  );
};
