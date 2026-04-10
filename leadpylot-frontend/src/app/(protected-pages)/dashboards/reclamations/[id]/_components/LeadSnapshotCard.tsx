'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div>
    <div className="text-sm font-medium text-gray-600">{label}</div>
    <div className="mt-0.5 text-sm text-black">{value ?? '—'}</div>
  </div>
);

const formatLeadPrice = (value: number | string | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 'N/A';
  return num >= 1000 ? `${(num / 1000).toFixed(2)}k` : String(num);
};

export interface LeadSnapshotCardProps {
  lead?: {
    _id?: string;
    contact_name?: string;
    email_from?: string;
    phone?: string;
    lead_source_no?: string;
    leadPrice?: number;
    lead_date?: string;
    status?: string;
    stage?: string;
    use_status?: string;
    reclamation_status?: string;
    source_id?: { name?: string };
    expected_revenue?: number;
  };
}

const LeadSnapshotCard = ({ lead }: LeadSnapshotCardProps) => {
  const sourceName = lead?.source_id?.name ?? '—';
  const leadId = lead?._id;

  return (
    <Card bodyClass="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h6 className="font-semibold text-black">Lead Information</h6>
        {leadId && (
          <Link href={`/dashboards/leads/${leadId}`}>
            <Button
              variant="plain"
              size="xs"
              icon={<ApolloIcon name="arrow-right" className="text-sm" />}
            >
              View Lead Details
            </Button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <InfoRow label="Contact Name" value={lead?.contact_name} />
        <InfoRow label="Email" value={lead?.email_from} />
        <InfoRow label="Phone" value={lead?.phone} />
        <InfoRow label="Provider no" value={lead?.lead_source_no} />
        <InfoRow label="Source" value={sourceName} />
        <InfoRow
          label="Lead Date"
          value={dateFormateUtils(lead?.lead_date, DateFormatType.SHOW_DATE)}
        />
        <InfoRow label="Lead Price" value={formatLeadPrice(lead?.leadPrice)} />
        <InfoRow label="Expected Revenue" value={formatLeadPrice(lead?.expected_revenue)} />
        <InfoRow label="Status" value={lead?.status} />
        <InfoRow label="Stage" value={lead?.stage} />
        <InfoRow label="Use Status" value={lead?.use_status} />
        <InfoRow label="Reclamation Status" value={lead?.reclamation_status} />
      </div>
    </Card>
  );
};

export default LeadSnapshotCard;
