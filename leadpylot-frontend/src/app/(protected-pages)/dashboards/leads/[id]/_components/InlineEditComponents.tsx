'use client';
import ProjectDoubleTapCell from '@/components/ProjectDoubleTapCell';
import CellInlineEdit from '@/components/shared/CellInlineEdit';
import InlineEditField from '@/components/shared/InlineEditField';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { apiUpdatePrimaryAgentPercentage, apiUpdateBankPercentage } from '@/services/OffersService';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import useNotification from '@/utils/hooks/useNotification';

export const InlineContactName = ({ lead, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <ApolloIcon name="user" className="text-xs leading-none text-gray-600" />
      <span className="text-sm font-medium text-gray-600">Contact : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="contact_name"
        apiUpdateField="contact_name"
        initialValue={lead?.contact_name}
        leadId={lead?._id}
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
        isCopyable={true}
        cellInlineEditClassName=""
      />
    </div>
  );
};
export const InlinePhone = ({ lead, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <ApolloIcon name="phone" className="text-xs leading-none text-gray-600" />
      <span className="text-sm font-medium text-gray-600">Phone : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="phone"
        apiUpdateField="phone"
        initialValue={lead?.phone}
        leadId={lead?._id}
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
        isCopyable={true}
        cellInlineEditClassName=""
      />
    </div>
  );
};
export const InlineRevenue = ({ lead, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <ApolloIcon name="dollar" className="text-xs leading-none text-gray-600" />
      <span className="text-sm font-medium text-gray-600">Revenue : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="expected_revenue"
        apiUpdateField="expected_revenue"
        initialValue={lead?.expected_revenue}
        leadId={lead?._id}
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
        isCopyable={true}
        cellInlineEditClassName=""
      />
    </div>
  );
};

export const InlineEmail = ({ lead, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] flex-nowrap items-center gap-1">
      <ApolloIcon name="user" className="text-xs leading-none text-gray-600" />
      <p className="text-sm font-medium whitespace-nowrap text-gray-600">Email :</p>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="email_from"
        apiUpdateField="email_from"
        initialValue={lead?.email_from}
        leadId={lead?._id}
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
        isCopyable={true}
        cellInlineEditClassName=""
      />
    </div>
  );
};
export const InlineProjects = ({ lead, allProjects, invalidateQueries }: any) => {
  return (
    <ProjectDoubleTapCell
      props={{ row: { original: lead } }}
      lead={lead}
      allProjects={allProjects}
      selectOptionClassName="min-w-fit"
      selectClassName="w-fit"
      invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
    />
  );
};
export const InlineStatus = ({ lead, allStatus, invalidateQueries }: any) => {
  return (
    <div className="flex min-w-[152px] items-center justify-between gap-1">
      <span className="text-sm font-medium text-gray-600">Status : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="status"
        apiUpdateField="status_id"
        dropdown={true}
        options={allStatus}
        initialValue={lead?.status?.name}
        leadId={lead?._id}
        selectOptionClassName="min-w-fit"
        selectClassName="max-w-fit"
        invalidateQueries={invalidateQueries ?? ['lead', `${lead?._id}`]}
      />
    </div>
  );
};

export const InlineSendAmount = ({ lead }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <span className="text-sm font-medium text-gray-600">Send Amount : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="send_amount"
        apiUpdateField="send_amount"
        initialValue={lead?.send_amount}
        onRowClick={() => {
          console.log('lead', lead);
        }}
      />
    </div>
  );
};
export const InlineReceivedAmount = ({ lead }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <span className="text-sm font-medium text-gray-600">Agent Commission : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="agent_commission"
        apiUpdateField="agent_commission"
        initialValue={lead?.agent_commission}
        onRowClick={() => {
          console.log('lead', lead);
        }}
      />
    </div>
  );
};
export const InlinePayStatusAgent = ({ lead }: any) => {
  return (
    <div className="flex min-w-[152px] items-center gap-1">
      <span className="text-sm font-medium text-gray-600">Pay Status Agent : </span>
      <CellInlineEdit
        props={{ row: { original: lead } }}
        type="pay_status_agent_id"
        apiUpdateField="pay_status_agent_id"
        initialValue={lead?.pay_status_agent_id}
        onRowClick={() => {
          console.log('lead', lead);
        }}
      />
    </div>
  );
};

// =============================================
// Financial Inline Edit Components
// =============================================

interface FinancialInlineEditProps {
  offerId: string;
  financials: any;
  invalidateQueries?: string[] | string;
  refetch?: () => void;
}

interface InlineSendAmountFinancialsProps extends FinancialInlineEditProps {
  onOpenPaymentHistory: () => void;
}

export const InlineSendAmountFinancials = ({
  financials,
  onOpenPaymentHistory,
}: InlineSendAmountFinancialsProps) => {
  const received = financials?.payment_summary?.total_received || 0;
  const expected = financials?.expected_from_customer || 0;

  return (
    <div className="flex min-w-[180px] items-center gap-1">
      <span className="text-sm font-medium ">Send Amount : </span>
      <span
        className="cursor-pointer text-sm font-semibold text-green-500"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenPaymentHistory();
        }}
        title="Double-click to view payment history"
      >
        {received.toLocaleString()}/{expected.toLocaleString()}
      </span>
    </div>
  );
};

export const InlineAgentCommissionPct = ({
  offerId,
  financials,
  invalidateQueries,
  refetch,
}: FinancialInlineEditProps) => {
  const queryClient = useQueryClient();
  const currentPath = usePathname();
  const { openNotification } = useNotification();
  const percentage = financials?.primary_agent_commission?.percentage || 0;

  const isOpeningPath = currentPath?.includes('opening');

  const handleInvalidateQueries = useCallback(async () => {
    // Follow existing pattern from CellInlineEdit
    isOpeningPath && queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });

    // Custom invalidateQueries prop
    if (invalidateQueries) {
      if (Array.isArray(invalidateQueries)) {
        invalidateQueries.forEach((query) => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [invalidateQueries] });
      }
    }
  }, [isOpeningPath, queryClient, invalidateQueries]);

  const handleSave = async (newValue: string) => {
    const pct = parseFloat(newValue);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      throw new Error('Invalid percentage');
    }
    await apiUpdatePrimaryAgentPercentage(offerId, pct);
    await handleInvalidateQueries();
    await refetch?.();

    openNotification({
      massage: 'Agent commission updated successfully',
      type: 'success',
    });
  };

  return (
    <div className="items-center gap-1">
      <p className="text-sm font-medium">Agent Commission </p>
      <div className="flex">
        <InlineEditField
          value={String(percentage)}
          onSave={handleSave}
          type="number"
          placeholder="0"
          enableInlineEditing={true}
          textClassName="text-green-500 font-medium"
        />
        <span className="text-sm font-medium text-green-500">%</span>
      </div>
    </div>
  );
};

export const InlineBankCommissionPct = ({
  offerId,
  financials,
  invalidateQueries,
  refetch,
}: FinancialInlineEditProps) => {
  const queryClient = useQueryClient();
  const currentPath = usePathname();
  const { openNotification } = useNotification();
  const percentage = financials?.bank_commission?.percentage || 0;

  const isOpeningPath = currentPath?.includes('opening');

  const handleInvalidateQueries = useCallback(async () => {
    // Follow existing pattern from CellInlineEdit
    isOpeningPath && queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });

    // Custom invalidateQueries prop
    if (invalidateQueries) {
      if (Array.isArray(invalidateQueries)) {
        invalidateQueries.forEach((query) => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [invalidateQueries] });
      }
    }
  }, [isOpeningPath, queryClient, invalidateQueries]);

  const handleSave = async (newValue: string) => {
    const pct = parseFloat(newValue);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      throw new Error('Invalid percentage');
    }
    await apiUpdateBankPercentage(offerId, pct);
    await handleInvalidateQueries();
    await refetch?.();

    openNotification({
      massage: 'Bank commission updated successfully',
      type: 'success',
    });
  };

  return (
    <div className="flex min-w-[180px] items-center gap-1">
      <span className="text-sm font-medium ">Bank Commission : </span>
      <InlineEditField
        value={String(percentage)}
        onSave={handleSave}
        type="number"
        placeholder="0"
        enableInlineEditing={true}
        textClassName="text-green-500 font-semibold"
      />
      <span className="text-sm font-semibold text-green-500">%</span>
    </div>
  );
};
