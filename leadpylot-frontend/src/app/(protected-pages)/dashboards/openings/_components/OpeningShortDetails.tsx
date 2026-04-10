import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import type { Opening } from '@/services/OpeningsService';
import { CustomCard, InfoItem, SkeletonItem } from '@/components/shared/CustomCard/CustomCard';
import { useLeadConditional } from '@/services/hooks/useLeads';

// Type definitions
interface CardItem {
  icon: string;
  label: string;
  value: string | React.ReactNode;
  action?: React.ReactNode;
}

interface CardData {
  title: string;
  items: CardItem[];
}
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

const OpeningShortDetails = ({
  expandedRowId,
  row,
}: {
  expandedRowId: string;
  row: { original: Opening };
}) => {
  const router = useRouter();
  const isExpanded = expandedRowId === row.original?._id?.toString();
  const opening = row.original;
  const leadId = opening?.lead?._id ?? opening?.leadId ?? '';
  const { data: leadData, isLoading } = useLeadConditional(leadId, isExpanded);
  const enhancedLead = leadData || opening?.lead;
  // Memoized card data to prevent unnecessary re-renders
  const cardData: CardData[] = React.useMemo(
    () => [
      {
        title: 'Leads Information',
        items: [
          { icon: 'user', label: 'Name', value: enhancedLead?.contact_name || 'N/A' },
          {
            icon: 'mail',
            label: 'Email',
            value: enhancedLead?.email_from || 'N/A',
            action: (
              <ActionButton
                icon="mail"
                text="Email"
                disabled={!enhancedLead?.email_from}
                onClick={() => router.push(`/dashboards/leads/${opening?.lead?._id}`)}
              />
            ),
          },
          {
            icon: 'phone',
            label: 'Phone',
            value: enhancedLead?.phone || 'N/A',
            action: (
              <ActionButton
                icon="phone"
                text="Call"
                disabled={!enhancedLead?.phone}
                onClick={() => router.push(`/dashboards/leads/${opening?.lead?._id}`)}
              />
            ),
          },
        ],
      },
      {
        title: 'Lead Overview',
        items: [
          {
            icon: 'dollar',
            label: 'Expected Revenue',
            value: enhancedLead?.expected_revenue || 'N/A',
          },
          {
            icon: 'briefcase',
            label: 'Project',
            value: Array.isArray(enhancedLead?.project)
              ? enhancedLead?.project?.[0]?.name || 'N/A'
              : enhancedLead?.project?.name || 'N/A',
          },
          {
            icon: 'user',
            label: 'Agent',
            value: Array.isArray(enhancedLead?.project)
              ? enhancedLead?.project?.[0]?.agent?.login || 'N/A'
              : (enhancedLead?.project as any)?.agent?.login || 'N/A',
          },
        ],
      },
      {
        title: 'Opening Information',
        items: [
          {
            icon: 'briefcase',
            label: 'Offer Name',
            value: opening?.title || 'N/A',
          },
          {
            icon: 'user',
            label: 'Creator',
            value: opening?.creator_id?.name || 'N/A',
          },
          {
            icon: 'dollar',
            label: 'Bonus Amount',
            value: (opening as any)?.bonusAmount || 'N/A',
          },
        ],
      },
      {
        title: 'Status Information',
        items: [
          {
            icon: 'check',
            label: 'Status',
            value: (
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  opening?.active ? 'bg-evergreen text-white' : 'bg-rust text-white'
                }`}
              >
                {opening?.active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            icon: 'file',
            label: 'Files Count',
            value: `${opening?.filesCount || 0} file(s)`,
          },
          {
            icon: 'calendar',
            label: 'Created At',
            value: opening?.createdAt ? opening?.createdAt : 'N/A',
          },
        ],
      },
    ],
    [opening, router, enhancedLead]
  );

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

export default OpeningShortDetails;
