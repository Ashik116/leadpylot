import CopyButton from '@/components/shared/CopyButton';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TLead } from '@/services/LeadsService';
import { dateFormateUtils } from '@/utils/dateFormateUtils';

interface LeadInfoCardProps {
  lead: TLead;
  hideUpdateInfo?: boolean;
  showPartnerID?: boolean;
}

const LeadTimeFrameCard = ({
  lead,
  hideUpdateInfo = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  showPartnerID = false,
}: LeadInfoCardProps) => {
  // Check for assigned_date (snake_case from API) or assignedAt (camelCase)
  const assignedDate = (lead as any)?.assigned_date || (lead as any)?.assignedAt;

  const infoItems = [
    {
      icon: 'pen',
      label: 'Assigned',
      value: assignedDate ? dateFormateUtils(assignedDate) || 'N/A' : 'N/A',
    },
    {
      icon: 'plus-circle',
      label: 'Created',
      value: dateFormateUtils(lead.createdAt) || 'N/A',
    },
    {
      icon: 'user-check',
      label: 'Updated',
      value: dateFormateUtils(lead.updatedAt) || 'N/A',
    },
    ...(showPartnerID
      ? [
          {
            icon: 'tag',
            label: 'Partner ID',
            value: lead?.lead_source_no || 'N/A',
            copyable: true,
          },
        ]
      : []),
  ];

  return (
    <Card className="border-none" bodyClass=" rounded-lg p-0  space-y-0.5 justify-start">
      {/* <h6>Lead Time Frame</h6> */}
      {infoItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between ">
          <div className="flex items-center">
            <ApolloIcon name={item.icon as any} className="mr-2 text-sm" />
            <span className="text-sm font-medium text-black dark:text-[var(--dm-text-primary)]">{item?.label}</span>
          </div>
          <div className="flex items-center ">
            <div className="text-sm text-black dark:text-[var(--dm-text-primary)]">{item?.value}</div>
            <div className="text-sm text-black dark:text-[var(--dm-text-primary)]">
              {item?.copyable && <CopyButton value={item?.value} />}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
};

export default LeadTimeFrameCard;
