import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { getAgentColor } from '@/utils/utils';
import React from 'react';
import { LoadAndOpeningDropdown } from '../../../_components/SharedColumnConfig';
import BankDisplay from './BankDisplay';

interface OpeningDetailsGridProps {
  opening: any;
  openingData: any;
  lead: any;
  offerId: string;
  openingIdFromProp: string;
  session: any;
  hideDuplicateFields?: boolean;
  offer?: any;
  columns?: 1 | 2;
}

const ShowDataValue = ({
  icon,
  label,
  value,
  color,
}: {
  icon?: string;
  label: string;
  value: string | React.ReactNode;
  color?: string;
}) => {
  return (
    <div className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
      <div className="flex w-auto items-center gap-2">
        {icon && <ApolloIcon name={icon as any} className="" />}
        <h6 className="text-sm font-medium text-black">{label}</h6>
      </div>
      <div className="flex flex-1 items-center justify-end">
        {typeof value === 'string' ? (
          <p className="text-sm text-black">{value}</p>
        ) : (
          <div className="flex items-center text-sm text-black">{value}</div>
        )}
      </div>
    </div>
  );
};

export const OpeningDetailsGrid: React.FC<OpeningDetailsGridProps> = ({
  opening,
  openingData,
  lead,
  offerId,
  openingIdFromProp,
  session,
  hideDuplicateFields = false,
  offer,
  columns = 2,
}) => {
  // Helper function to get value or -
  const getValueOrDash = (value: any): string => {
    return value || '-';
  };

  // Helper function to convert Tailwind color class to hex color
  const tailwindClassToHex = (tailwindClass: string): string => {
    const colorMap: Record<string, string> = {
      'text-red-500': '#ef4444',
      'text-red-600': '#dc2626',
      'text-red-700': '#b91c1c',
      'text-orange-500': '#f97316',
      'text-orange-600': '#ea580c',
      'text-orange-700': '#c2410c',
      'text-yellow-500': '#eab308',
      'text-yellow-600': '#ca8a04',
      'text-yellow-700': '#a16207',
      'text-green-500': '#22c55e',
      'text-green-600': '#16a34a',
      'text-green-700': '#15803d',
      'text-teal-500': '#14b8a6',
      'text-teal-600': '#0d9488',
      'text-teal-700': '#0f766e',
      'text-blue-500': '#3b82f6',
      'text-blue-600': '#2563eb',
      'text-blue-700': '#1d4ed8',
      'text-indigo-500': '#6366f1',
      'text-indigo-600': '#4f46e5',
      'text-indigo-700': '#4338ca',
      'text-purple-500': '#a855f7',
      'text-purple-600': '#9333ea',
      'text-purple-700': '#7e22ce',
      'text-pink-500': '#ec4899',
      'text-pink-600': '#db2777',
    };
    return colorMap[tailwindClass] || '#1f2937';
  };

  // Get agent name and color
  const getAgentNameAndColor = () => {
    const agentName =
      offer?.agent_id?.login ||
      opening?.agent_id?.login ||
      offer?.agent?.login ||
      opening?.agent?.login ||
      '-';

    const colorCode =
      offer?.agent_id?.color_code ||
      opening?.agent_id?.color_code ||
      offer?.agent?.color_code ||
      opening?.agent?.color_code;

    if (colorCode) {
      return { name: agentName, color: colorCode };
    }

    if (agentName !== '-') {
      const tailwindClass = getAgentColor(agentName);
      const hexColor = tailwindClassToHex(tailwindClass);
      return { name: agentName, color: hexColor };
    }

    return { name: agentName, color: undefined };
  };

  const agentInfo = getAgentNameAndColor();

  return (
    <div className={`grid grid-cols-1 ${columns === 2 ? 'gap-2 lg:grid-cols-2' : ''}`}>
      {/* Left Column */}
      <div className="space-y-0.5">
        <ShowDataValue label="Amount" value={getValueOrDash(openingData?.investmentVolume)} />
        <ShowDataValue label="Months" value={getValueOrDash(openingData?.interestMonth)} />
        <ShowDataValue
          label="Bonus"
          value={openingData?.bonusAmount ? `${openingData.bonusAmount} €` : '-'}
        />
        <ShowDataValue
          label="Rate"
          value={openingData?.interestRate ? `${openingData.interestRate} %` : '-'}
        />
        <ShowDataValue
          label="Bank"
          value={<BankDisplay bank={opening?.bank_id || offer?.bank_id} />}
        />
        <ShowDataValue
          label="Provider"
          value={
            (typeof offer?.bank_id?.provider === 'object' && offer?.bank_id?.provider?.name) ||
            (typeof offer?.bank_id?.provider === 'object' && offer?.bank_id?.provider?.login) ||
            (typeof opening?.bank_id?.provider === 'object' && opening?.bank_id?.provider?.name) ||
            (typeof opening?.bank_id?.provider === 'object' && opening?.bank_id?.provider?.login) ||
            offer?.bank_id?.provider ||
            opening?.bank_id?.provider ||
            '-'
          }
        />
        <ShowDataValue
          label="Ref"
          value={
            offer?.bank_id?.Ref ||
            offer?.bank_id?.ref ||
            opening?.bank_id?.Ref ||
            opening?.bank_id?.ref ||
            '-'
          }
        />
        <ShowDataValue
          label="IBAN"
          value={getValueOrDash(offer?.bank_id?.iban || opening?.bank_id?.iban)}
        />
      </div>

      {/* Right Column */}
      <div className="space-y-0.5">
        <ShowDataValue label="Offer Date" value={dateFormateUtils(opening?.createdAt) || '-'} />
        <ShowDataValue label="Type" value={getValueOrDash(openingData?.offerType)} />

        <div className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
          <div className="w-32">
            <h6 className="text-sm font-medium text-black">O/L</h6>
          </div>
          <div className="flex flex-1 justify-end text-black">
            {offerId && session?.user?.role === Role.ADMIN ? (
              <LoadAndOpeningDropdown
                offerId={String(offerId)}
                currentStatus={
                  opening?.load_and_opening || opening?.offer_id?.load_and_opening || ''
                }
              />
            ) : (
              <span className="text-sm font-semibold text-black">
                {opening?.load_and_opening || opening?.offer_id?.load_and_opening || '-'}
              </span>
            )}
          </div>
        </div>

        <ShowDataValue
          label="Src"
          value={getValueOrDash(
            lead?.source?.name ||
              offer?.lead_id?.source_id?.name ||
              opening?.lead_id?.source_id?.name
          )}
        />
        <ShowDataValue label="Agent" value={agentInfo.name} color={agentInfo.color} />
      </div>
    </div>
  );
};
