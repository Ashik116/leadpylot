'use client';

import Card from '@/components/ui/Card';
import classNames from '@/utils/classNames';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

const InfoRow = ({ label, value, className }: InfoRowProps) => (
  <div className={classNames('flex items-start justify-between gap-4', className)}>
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <span className="text-sm text-black">{value ?? '—'}</span>
  </div>
);

export interface ReclamationOverviewCardProps {
  createdAt?: string;
  updatedAt?: string;
  lead?: {
    contact_name?: string;
    email_from?: string;
    phone?: string;
    lead_date?: string;
    status?: string;
    source_id?: { name?: string };
  };
}

const ReclamationOverviewCard = ({ createdAt, updatedAt, lead }: ReclamationOverviewCardProps) => {
  const sourceName = lead?.source_id?.name ?? '—';

  return (
    <Card bodyClass="p-4">
      <h6 className="mb-4 font-semibold text-black">Reclamation Overview</h6>
      <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 xl:grid-cols-4">
        <InfoRow label="Contact" value={lead?.contact_name} className="" />
        <InfoRow label="Email" value={lead?.email_from} />
        <InfoRow label="Phone" value={lead?.phone} />
        <InfoRow label="Source" value={sourceName} />
        <InfoRow
          label="Lead Date"
          value={dateFormateUtils(lead?.lead_date, DateFormatType.SHOW_DATE)}
        />
        <InfoRow label="Lead Status" value={lead?.status} />
        <InfoRow label="Created" value={dateFormateUtils(createdAt, DateFormatType.SHOW_DATE)} />
        <InfoRow label="Updated" value={dateFormateUtils(updatedAt, DateFormatType.SHOW_DATE)} />
      </div>
    </Card>
  );
};

export default ReclamationOverviewCard;
