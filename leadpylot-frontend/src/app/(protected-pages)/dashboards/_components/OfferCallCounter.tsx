'use client';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useUpdateOfferCalls } from '@/services/hooks/useLeads';

const OFFER_NE_TOOLTIP =
  'Follow up: each click records an additional contact attempt for this lead’s offer (counter 0–4). This updates the offer-calls field for reporting. Use − / + beside the count to adjust. At 4, this button is disabled.';

interface OfferCallCounterProps {
  offerCalls: number;
  leadId: string;
  hidePlusBtn?: boolean;
  showNEButton?: boolean;
}

const OfferCallCounter = ({
  offerCalls,
  leadId,
  hidePlusBtn = false,
  showNEButton = false,
}: OfferCallCounterProps) => {
  const { increaseOfferCalls, decreaseOfferCalls, isPending } = useUpdateOfferCalls(leadId);
  const displayCount = offerCalls || 0;

  const handleIncrease = () => {
    if (displayCount >= 4) return;
    increaseOfferCalls();
  };

  const handleDecrease = () => {
    // Prevent negative counts
    if (displayCount <= 0) return;
    decreaseOfferCalls();
  };

  return (
    <div className="flex items-center space-x-1">
      {showNEButton && (
        <Tooltip
          title={OFFER_NE_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className="max-w-sm! text-xs leading-snug"
        >
          <Button
            variant="solid"
            disabled={displayCount >= 4}
            onClick={() => {
              handleIncrease();
            }}
            icon={<ApolloIcon name="refresh" />}
            className="mr-2 bg-blue-600 text-white hover:bg-blue-700"
            size="xs"
          >
            Follow up
          </Button>
        </Tooltip>
      )}
      <button
        className="flex size-4 items-center justify-center rounded-full bg-gray-100"
        onClick={(e) => {
          e.stopPropagation();
          handleDecrease();
        }}
        disabled={isPending || displayCount <= 0}
      >
        <ApolloIcon name="minus" className="text-xs leading-0" />
      </button>

      <span className="min-w-6 text-center text-sm whitespace-nowrap">{displayCount}</span>
      {!hidePlusBtn && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleIncrease();
          }}
          className="flex size-4 items-center justify-center rounded-full bg-gray-100"
          disabled={isPending}
        >
          <ApolloIcon name="plus" className="text-xs leading-0" />
        </button>
      )}
    </div>
  );
};

export default OfferCallCounter;
