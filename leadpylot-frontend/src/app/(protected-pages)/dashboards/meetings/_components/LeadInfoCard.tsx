'use client';

import Card from '@/components/ui/Card';
import { TLead } from '@/services/LeadsService';

interface LeadInfoCardProps {
  leadData: TLead;
}

const LeadInfoCard = ({ leadData }: LeadInfoCardProps) => {
  return (
    <Card className="mb-6 p-4">
      <h2 className="mb-4 text-lg font-semibold">Lead Information</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Name</p>
          <p>{leadData.contact_name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Email</p>
          <p>{leadData.email_from}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Phone</p>
          <p>{leadData.phone}</p>
        </div>
      </div>
    </Card>
  );
};

export default LeadInfoCard;
