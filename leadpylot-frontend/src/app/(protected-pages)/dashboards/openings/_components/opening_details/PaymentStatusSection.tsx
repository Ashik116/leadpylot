import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import {
  InlineAgentCommissionPct,
  InlineBankCommissionPct,
  InlineSendAmountFinancials,
} from '../../../leads/[id]/_components/InlineEditComponents';

interface PaymentStatusSectionProps {
  fetchedOpening: any;
  offerId: string;
  openingIdFromProp: string;
  session: any;
  refetchOpening: () => Promise<any>;
  onOpenPaymentHistory: () => void;
}

export const PaymentStatusSection: React.FC<PaymentStatusSectionProps> = ({
  fetchedOpening,
  offerId,
  openingIdFromProp,
  session,
  refetchOpening,
  onOpenPaymentHistory,
}) => {
  const [isPayoutStatusExpanded, setIsPayoutStatusExpanded] = useState(true);

  return (
    <div className=" flex flex-col overflow-hidden rounded-lg border border-gray-200">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsPayoutStatusExpanded(!isPayoutStatusExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsPayoutStatusExpanded(!isPayoutStatusExpanded);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between bg-gray-50 px-3 py-2.5 transition-all duration-200 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
      >
        <h6 className="text-base font-semibold text-gray-900">Payout Status</h6>

        <div className="flex items-center gap-2">
          {/* Only Admin can add payments */}
          {session?.user?.role === Role.ADMIN && (
            <Button
              icon={<ApolloIcon name="plus" />}
              onClick={(e) => {
                e.stopPropagation();
                onOpenPaymentHistory();
              }}
              size="xs"
              variant="secondary"
            >
              Add Payment
            </Button>
          )}
          <ApolloIcon
            name={isPayoutStatusExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
            className={`text-sm text-gray-600 transition-transform duration-200 ${isPayoutStatusExpanded ? 'rotate-0' : ''
              }`}
          />
        </div>
      </div>
      {isPayoutStatusExpanded && (
        <div className="border-t border-gray-200 bg-white px-3 py-3">
          {/* Financials Data Display - Inline Style */}
          {fetchedOpening?.financials?.financials_initialized ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {/* Admin sees full details */}
              {session?.user?.role === Role.ADMIN ? (
                <>
                  {/* Send Amount: received/expected - Click to open payment history */}
                  <InlineSendAmountFinancials
                    offerId={String(offerId)}
                    financials={fetchedOpening.financials}
                    invalidateQueries={['opening', openingIdFromProp]}
                    refetch={refetchOpening}
                    onOpenPaymentHistory={onOpenPaymentHistory}
                  />

                  {/* Agent Commission: percentage - Editable */}
                  <InlineAgentCommissionPct
                    offerId={String(offerId)}
                    financials={fetchedOpening.financials}
                    invalidateQueries={['opening', openingIdFromProp]}
                    refetch={refetchOpening}
                  />

                  {/* Pay Status Agent: actual/expected commission */}
                  <div className="flex min-w-[180px] items-center gap-1">
                    <span className="text-sm font-medium text-gray-600">
                      Pay Status Agent :{' '}
                    </span>
                    <span className="text-sm font-semibold text-green-500">
                      {fetchedOpening.financials?.primary_agent_commission?.actual_amount?.toLocaleString() ||
                        '0'}
                      /
                      {fetchedOpening.financials?.primary_agent_commission?.expected_amount?.toLocaleString() ||
                        '0'}
                    </span>
                  </div>

                  {/* Bank Commission - Editable */}
                  <InlineBankCommissionPct
                    offerId={String(offerId)}
                    financials={fetchedOpening.financials}
                    invalidateQueries={['opening', openingIdFromProp]}
                    refetch={refetchOpening}
                  />

                  {/* Company Revenue */}
                  <div className="flex min-w-[180px] items-center gap-1">
                    <span className="text-sm font-medium text-gray-600">
                      Company Revenue :{' '}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {Number.isInteger(
                        fetchedOpening.financials?.net_amounts?.actual_company_revenue
                      )
                        ? fetchedOpening.financials?.net_amounts?.actual_company_revenue?.toLocaleString()
                        : '0'}
                      /
                      {Number.isInteger(
                        fetchedOpening.financials?.net_amounts?.expected_company_revenue
                      )
                        ? fetchedOpening.financials?.net_amounts?.expected_company_revenue?.toLocaleString()
                        : '0'}
                    </span>
                  </div>
                </>
              ) : /* Agent View - Only their commission info */
                fetchedOpening.financials?.my_commission ? (
                  <>
                    {/* Send Amount: received/expected */}
                    <div className="flex min-w-[180px] items-center gap-1">
                      <span className="text-sm font-medium text-gray-600">
                        Send Amount :{' '}
                      </span>
                      <span className="text-sm font-semibold text-green-500">
                        {fetchedOpening.financials?.total_customer_received?.toLocaleString() ||
                          '0'}
                        /
                        {fetchedOpening.financials?.expected_from_customer?.toLocaleString() ||
                          '0'}
                      </span>
                    </div>

                    {/* Agent Commission: percentage */}
                    <div className="flex min-w-[180px] items-center gap-1">
                      <span className="text-sm font-medium text-gray-600">
                        Agent Commission :{' '}
                      </span>
                      <span className="text-sm font-semibold text-green-500">
                        {fetchedOpening.financials?.my_commission.percentage || 0}%
                      </span>
                    </div>

                    {/* Pay Status Agent: actual/expected commission */}
                    <div className="flex min-w-[180px] items-center gap-1">
                      <span className="text-sm font-medium text-gray-600">
                        Pay Status Agent :{' '}
                      </span>
                      <span className="text-sm font-semibold text-green-500">
                        {fetchedOpening.financials?.my_commission.actual_amount?.toLocaleString() ||
                          '0'}
                        /
                        {fetchedOpening.financials?.my_commission.expected_amount?.toLocaleString() ||
                          '0'}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    {fetchedOpening.financials?.message || 'No commission data available'}
                  </span>
                )}
            </div>
          ) : (
            <></>
          )}
        </div>
      )}
    </div>
  );
};
