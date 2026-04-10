import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { LoadAndOpeningDropdown } from '../../../_components/SharedColumnConfig';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import {
  InlineContactName,
  InlineEmail,
  InlinePhone,
  InlineStatus,
} from '../../../leads/[id]/_components/InlineEditComponents';
import InlinePartnerID from '../../../leads/[id]/_components/InlinePartnerID';

export const ShowDataValue = ({
  icon,
  label,
  value,
  color,
}: {
  icon?: string;
  label: string;
  value: string;
  color?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      {icon && <ApolloIcon name={icon as any} className="text-sm" />}
      <div className="flex flex-1 items-center justify-between gap-2">
        <h6 className="text-sm font-semibold">{label}</h6>
        <p className="text-sm" style={{ color: color }}>
          {value}
        </p>
      </div>
    </div>
  );
};

interface OpeningInfoSectionProps {
  opening: any;
  lead: any;
  openingData: any;
  openingIdFromProp: string;
  offerId: string;
  session: any;
  allStatus: any[];
}

const OpeningInfoSection: React.FC<OpeningInfoSectionProps> = ({
  opening,
  lead,
  openingData,
  openingIdFromProp,
  offerId,
  session,
  allStatus,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <ShowDataValue label="Title" value={opening?.nametitle || '-'} />
        <InlineContactName lead={lead} invalidateQueries={['opening', openingIdFromProp]} />
        <InlinePartnerID lead={lead} invalidateQueries={['opening', openingIdFromProp]} />
        <ShowDataValue
          icon="company-cog"
          label="Project"
          value={opening?.project_id?.name || '-'}
          color={opening?.project_id?.color_code || ''}
        />
        <div className="flex items-center justify-between">
          <h6 className="text-sm font-semibold">O/L</h6>
          {offerId && session?.user?.role === Role.ADMIN ? (
            <LoadAndOpeningDropdown
              offerId={String(offerId)}
              currentStatus={opening?.load_and_opening || opening?.offer_id?.load_and_opening || ''}
            />
          ) : (
            <span className="text-sm text-gray-500">
              {opening?.load_and_opening || opening?.offer_id?.load_and_opening || '-'}
            </span>
          )}
        </div>
        <ShowDataValue label="Investment" value={openingData?.investmentVolume || '-'} />
        <ShowDataValue label="Month" value={openingData?.interestMonth || '-'} />
        <ShowDataValue label="Rate" value={openingData?.interestRate || '-'} />
        <ShowDataValue label="Bonus" value={openingData?.bonusAmount || '-'} />
        <ShowDataValue label="Type" value={openingData?.offerType || '-'} />
      </div>
      <div className="space-y-1">
        <InlinePhone lead={lead} invalidateQueries={['opening', openingIdFromProp]} />
        <InlineEmail lead={lead} invalidateQueries={['opening', openingIdFromProp]} />
        <div className="flex items-center gap-2">
          <ApolloIcon name="plus-circle" className="text-sm" />
          <h6 className="text-sm font-semibold">Created At</h6>
          <p className="text-sm">
            {dateFormateUtils(opening?.createdAt, DateFormatType.SHOW_TIME) || '-'}
          </p>
        </div>

        <InlineStatus
          lead={lead}
          allStatus={allStatus}
          invalidateQueries={['opening', openingIdFromProp]}
        />
        <ShowDataValue label="Src" value={opening?.lead_id?.source_id?.name || '-'} />
        <ShowDataValue label="Bank" value={opening?.bank_id?.name || '-'} />
        <ShowDataValue label="Provider" value={opening?.bank_id?.provider || '-'} />
        <ShowDataValue label="Ref" value={opening?.bank_id?.ref || '-'} />
        <ShowDataValue label="IBAN" value={opening?.bank_id?.iban || '-'} />
        <ShowDataValue
          label="Agent"
          value={opening?.agent_id?.login || '-'}
          color={opening?.agent_id?.color_code || ''}
        />
      </div>
    </div>
  );
};

export default OpeningInfoSection;
