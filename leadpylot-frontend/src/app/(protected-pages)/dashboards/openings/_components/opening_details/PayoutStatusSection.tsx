import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import classNames from '@/components/ui/utils/classNames';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface PayoutStatusSectionProps {
  isPayoutStatusExpanded: boolean;
  setIsPayoutStatusExpanded: (expanded: boolean) => void;
  session: any;
  setShouldOpenAddForm: (shouldOpen: boolean) => void;
  setIsPaymentHistoryModalOpen: (isOpen: boolean) => void;
  fetchedOpening: any;
}

const PayoutStatusSection: React.FC<PayoutStatusSectionProps> = ({
  isPayoutStatusExpanded,
  setIsPayoutStatusExpanded,
  session,
  setShouldOpenAddForm,
  setIsPaymentHistoryModalOpen,
  fetchedOpening,
}) => {
  return (
    <div className="mt-6 flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={() => setIsPayoutStatusExpanded(!isPayoutStatusExpanded)}
        className="flex w-full cursor-pointer items-center justify-between bg-gray-50/80 px-4 py-3 transition-all duration-200 hover:bg-gray-100 focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-blue-100 p-1.5">
            <ApolloIcon name="money-bag" className="text-sm text-blue-600" />
          </div>
          <h6 className="text-sm font-bold tracking-wide text-gray-800 uppercase">Payout Status</h6>
        </div>

        <div className="flex items-center gap-3">
          {/* Only Admin can add payments */}
          {session?.user?.role === Role.ADMIN && (
            <Button
              icon={<ApolloIcon name="plus" />}
              onClick={(e) => {
                e.stopPropagation();
                setShouldOpenAddForm(true);
                setIsPaymentHistoryModalOpen(true);
              }}
              size="xs"
              variant="solid"
              className="bg-blue-600 font-bold text-white hover:bg-blue-700"
            >
              Add Payment
            </Button>
          )}
          <div
            className={classNames(
              'rounded-full p-1 transition-transform duration-300 hover:bg-gray-200',
              isPayoutStatusExpanded ? 'rotate-180' : ''
            )}
          >
            <ApolloIcon name="chevron-arrow-down" className="text-xs text-gray-500" />
          </div>
        </div>
      </button>
      {isPayoutStatusExpanded && (
        <div className="border-t border-gray-100 bg-white p-4">
          {/* Financials Data Display - Professional Cards */}
          {fetchedOpening?.financials?.financials_initialized ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Admin sees full details */}
              {session?.user?.role === Role.ADMIN ? (
                <>
                  {/* Received Amount Card */}
                  <div
                    onClick={() => setIsPaymentHistoryModalOpen(true)}
                    className="group flex cursor-pointer flex-col gap-1 rounded-lg border border-green-100 bg-green-50/50 p-3 transition-all hover:bg-green-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xxs font-bold tracking-tighter text-green-600 uppercase">
                        Received / Expected
                      </span>
                      <ApolloIcon
                        name="history"
                        className="text-xxs text-green-400 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-green-700">
                        €
                        {fetchedOpening.financials?.total_customer_received?.toLocaleString() ||
                          '0'}
                      </span>
                      <span className="text-xxs font-bold text-green-400">
                        / €
                        {fetchedOpening.financials?.expected_from_customer?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Agent Commission Card */}
                  <div className="flex flex-col gap-1 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <span className="text-xxs font-bold tracking-tighter text-blue-600 uppercase">
                      Agent Comm (
                      {fetchedOpening.financials?.primary_agent_commission?.percentage || 0}
                      %)
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-blue-700">
                        €
                        {fetchedOpening.financials?.primary_agent_commission?.actual_amount?.toLocaleString() ||
                          '0'}
                      </span>
                      <span className="text-xxs font-bold text-blue-400">
                        / €
                        {fetchedOpening.financials?.primary_agent_commission?.expected_amount?.toLocaleString() ||
                          '0'}
                      </span>
                    </div>
                  </div>

                  {/* Company Revenue Card */}
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <span className="text-xxs font-bold tracking-tighter text-gray-600 uppercase">
                      Company Revenue
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-gray-700">
                        €
                        {fetchedOpening.financials?.net_amounts?.actual_company_revenue?.toLocaleString() ||
                          '0'}
                      </span>
                      <span className="text-xxs font-bold text-gray-400">
                        / €
                        {fetchedOpening.financials?.net_amounts?.expected_company_revenue?.toLocaleString() ||
                          '0'}
                      </span>
                    </div>
                  </div>
                </>
              ) : /* Agent View - Only their commission info */
              fetchedOpening.financials?.my_commission ? (
                <>
                  <div className="flex flex-col gap-1 rounded-lg border border-green-100 bg-green-50/50 p-3">
                    <span className="text-xxs font-bold tracking-tighter text-green-600 uppercase">
                      Total Received
                    </span>
                    <span className="text-sm font-black text-green-700">
                      €{fetchedOpening.financials?.total_customer_received?.toLocaleString() || '0'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <span className="text-xxs font-bold tracking-tighter text-blue-600 uppercase">
                      My Commission ({fetchedOpening.financials?.my_commission.percentage || 0}%)
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-blue-700">
                        €
                        {fetchedOpening.financials?.my_commission.actual_amount?.toLocaleString() ||
                          '0'}
                      </span>
                      <span className="text-xxs font-bold text-blue-400">
                        / €
                        {fetchedOpening.financials?.my_commission.expected_amount?.toLocaleString() ||
                          '0'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-full py-4 text-center">
                  <p className="text-xs text-gray-400 italic">
                    {fetchedOpening.financials?.message || 'No commission data available'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
              <ApolloIcon name="alert-triangle" className="mb-2 text-2xl text-gray-300" />
              <p className="text-xs font-medium tracking-tight text-gray-400">
                Financial data not yet initialized for this opening
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayoutStatusSection;
