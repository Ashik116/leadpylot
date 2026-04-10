import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { CustomCard, InfoItem, SkeletonItem } from '@/components/shared/CustomCard/CustomCard';
import { useLeadConditional } from '@/services/hooks/useLeads';
import router from 'next/router';

const PaymentVoucherShortDetails = ({
  expandedRowId,
  row,
}: {
  expandedRowId: string;
  row: any;
}) => {
  const isExpanded = expandedRowId === row?.original?._id?.toString();
  const voucher = row?.original;
  const leadId = voucher?.lead?._id || voucher?.leadId;
  // Action button component
  const { data: leadData, isLoading } = useLeadConditional(leadId, isExpanded);
  const enhancedLead = leadData || voucher?.lead;

  const ActionButton = ({
    icon,
    text,
    disabled,
    onClick,
  }: {
    icon: string;
    text: string;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <Button
      onClick={onClick}
      size="xs"
      variant="secondary"
      disabled={disabled}
      className="flex items-center gap-1"
    >
      <ApolloIcon name={icon as any} className="text-xs" />
      {text}
    </Button>
  );

  const cardData = [
    {
      title: 'Contact Information',
      items: [
        {
          icon: 'user',
          label: 'Name',
          value: enhancedLead?.leadName || enhancedLead?.contact_name || 'N/A',
        },
        {
          icon: 'mail',
          label: 'Email',
          value: enhancedLead?.email || enhancedLead?.email_from || 'N/A',
          action: (
            <ActionButton
              icon="mail"
              text="Email"
              disabled={!enhancedLead?.email && !enhancedLead?.email_from}
              onClick={() => router.push(`/dashboards/leads/${enhancedLead?._id}`)}
            />
          ),
        },
        {
          icon: 'phone',
          label: 'Phone',
          value: enhancedLead?.contact || enhancedLead?.phone || 'N/A',
          action: (
            <ActionButton
              icon="phone"
              text="Call"
              disabled={!enhancedLead?.contact && !enhancedLead?.phone}
              onClick={() => router.push(`/dashboards/leads/${enhancedLead?._id}`)}
            />
          ),
        },
      ],
    },
    {
      title: 'Lead Information',
      items: [
        {
          icon: 'dollar',
          label: 'ExpectedRevenue',
          value: enhancedLead?.expected_revenue || 'N/A',
        },
        { icon: 'briefcase', label: 'Project', value: enhancedLead?.project?.[0]?.name || 'N/A' },
        { icon: 'user', label: 'Agent', value: enhancedLead?.project?.[0]?.agent?.login || 'N/A' },
      ],
    },
    {
      title: 'Confirmation Details',
      items: [
        {
          icon: 'calendar',
          label: 'Created Date',
          value: new Date(voucher?.confirmation?.createdAt).toLocaleDateString() || 'N/A',
        },
        { icon: 'file', label: 'Files', value: voucher?.confirmation?.files?.length || 'N/A' },
        { icon: 'pen', label: 'Notes', value: voucher?.confirmation?.notes || 'N/A' },
      ],
    },
    {
      title: 'Offer Details',
      items: [
        {
          icon: 'check',
          label: 'Title',
          value: voucher?.offer?.title || 'N/A',
        },
        {
          icon: 'dollar',
          label: 'Investment Amount',
          value: voucher?.offer?.investment_volume || 'N/A',
        },
        {
          icon: 'growth-up',
          label: 'Rate',
          value: voucher?.offer?.interest_rate || 'N/A',
        },
      ],
    },
  ];

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
      onClick={() => router.push(`/dashboards/leads/${leadId}`)}
    >
      <div className="bg-sand-5/30 p-6">
        <div className="grid grid-cols-4 gap-6">
          {cardData?.map((card, index) => (
            <CustomCard key={index} title={card?.title}>
              {isExpanded && isLoading ? (
                // Show skeleton only for the third card when loading
                <>
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                </>
              ) : (
                card?.items?.map((item, itemIndex) => (
                  <InfoItem
                    key={itemIndex}
                    icon={item?.icon}
                    label={item?.label}
                    value={item?.value}
                    action={item?.action}
                  />
                ))
              )}
            </CustomCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentVoucherShortDetails;
