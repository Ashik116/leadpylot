import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useLeadConditional } from '@/services/hooks/useLeads';
import { CustomCard, InfoItem, SkeletonItem } from '@/components/shared/CustomCard/CustomCard';

export const OfferShortDetails = ({ expandedRowId, row }: { expandedRowId: string; row: any }) => {
  const router = useRouter();
  const isExpanded = expandedRowId === row.original._id.toString();
  const lead = row.original;
  const leadId = lead?.leadId ?? lead?._id;
  const { data: leadData, isLoading } = useLeadConditional(lead.leadId, isExpanded);
  const enhancedLead = leadData || lead;

  // Action button component
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
              onClick={() => router.push(`/dashboards/leads/${lead?.leadId}`)}
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
              onClick={() => router.push(`/dashboards/leads/${lead?.leadId}`)}
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
      title: leadData ? 'Enhanced Details' : 'Basic Details',
      items: [
        {
          icon: 'calendar',
          label: 'Assigned Date',
          value: leadData?.createdAt ? new Date(leadData?.createdAt).toLocaleDateString() : 'N/A',
        },
        {
          icon: 'calendar',
          label: 'Created Date',
          value: leadData?.createdAt ? new Date(leadData?.createdAt).toLocaleDateString() : 'N/A',
        },
        {
          icon: 'tag',
          label: 'Source id',
          value: ` ${lead?.partnerId || leadData?.lead_source_no || 'N/A'}`,
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
        <div className="grid grid-cols-3 gap-6">
          {cardData &&
            cardData?.length > 0 &&
            cardData?.map((card, index) => (
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

export default OfferShortDetails;
