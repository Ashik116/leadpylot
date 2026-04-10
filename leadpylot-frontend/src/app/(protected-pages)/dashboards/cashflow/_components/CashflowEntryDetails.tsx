import React from 'react';
import { CustomCard, InfoItem } from '@/components/shared/CustomCard/CustomCard';
import { useCashflowEntry } from '@/services/hooks/useCashflow';

// Type definitions
interface CardItem {
  icon: string;
  label: string;
  value: string | React.ReactNode;
}

interface CardData {
  title: string;
  items: CardItem[];
}

const CashflowEntryDetails = ({
  expandedRowId,
  row,
}: {
  expandedRowId: string;
  row: { original: any };
}) => {
  const isExpanded = expandedRowId === row.original?._id?.toString();
  // Get the cashflow entry ID from the flattened data or original
  const entryId = row.original?.cashflow_entry_id || row.original?._original?._id || row.original?._id;
  const { data: entryData, isLoading } = useCashflowEntry(entryId, isExpanded);
  // Use API response for full nested data, or fall back to row data
  const entry = entryData?.data || row.original?._original || row.original;

  // Memoized card data to prevent unnecessary re-renders
  const cardData: CardData[] = React.useMemo(
    () => [
      {
        title: 'Lead Information',
        items: [
          {
            icon: 'user',
            label: 'Contact Name',
            value: entry?.offer_id?.lead_id?.contact_name || 'N/A',
          },
          {
            icon: 'mail',
            label: 'Email',
            value: entry?.offer_id?.lead_id?.email_from || 'N/A',
          },
          {
            icon: 'phone',
            label: 'Phone',
            value: entry?.offer_id?.lead_id?.phone || 'N/A',
          },
        ],
      },
      {
        title: 'Offer Information',
        items: [
          {
            icon: 'briefcase',
            label: 'Offer Title',
            value: entry?.offer_id?.title || 'N/A',
          },
          {
            icon: 'file',
            label: 'Reference No',
            value: entry?.offer_id?.reference_no || 'N/A',
          },
          {
            icon: 'dollar',
            label: 'Investment Amount',
            value: entry?.offer_id?.investment_volume
              ? `€${entry.offer_id.investment_volume.toLocaleString()}`
              : 'N/A',
          },
        ],
      },
      {
        title: 'Project & Agent',
        items: [
          {
            icon: 'briefcase',
            label: 'Project',
            value: entry?.offer_id?.project_id?.name || 'N/A',
          },
          {
            icon: 'user',
            label: 'Agent',
            value: entry?.offer_id?.agent_id?.login
              ? `${entry.offer_id.agent_id.login} (${entry.offer_id.agent_id.first_name || ''} ${entry.offer_id.agent_id.last_name || ''})`
              : 'N/A',
          },
          {
            icon: 'user',
            label: 'Entered By',
            value: entry?.entered_by?.login || entry?.entered_by?.name || 'N/A',
          },
        ],
      },
      {
        title: 'Bank & Status',
        items: [
          {
            icon: 'building',
            label: 'Initial Bank',
            value: entry?.initial_bank_id?.name
              ? `${entry.initial_bank_id.name}${entry.initial_bank_id.nickName ? ` (${entry.initial_bank_id.nickName})` : ''}`
              : 'N/A',
          },
          {
            icon: 'building',
            label: 'Current Bank',
            value: entry?.current_bank_id?.name
              ? `${entry.current_bank_id.name}${entry.current_bank_id.nickName ? ` (${entry.current_bank_id.nickName})` : ''}`
              : 'N/A',
          },
          {
            icon: 'list',
            label: 'Transactions',
            value: `${entry?.transactions?.length || 0} transaction(s)`,
          },
        ],
      },
    ],
    [entry]
  );

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-sand-5/30 p-6">
        <div className="grid grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-4 text-center text-sm text-gray-500">
              Loading entry details...
            </div>
          ) : (
            cardData?.map((card, index) => (
              <CustomCard key={index} title={card?.title}>
                {card?.items?.map((item, itemIndex) => (
                  <InfoItem
                    key={itemIndex}
                    icon={item?.icon}
                    label={item?.label}
                    value={item?.value}
                  />
                ))}
              </CustomCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CashflowEntryDetails;
