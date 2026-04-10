'use client';

import Card from '@/components/ui/Card';
import MailServerForm from '../_components/MailServerForm';

function MailServerDetails() {
  return (
    <div className="space-y-6">
      <Card>
        <MailServerForm type="edit" />
      </Card>
    </div>
  );
}

export default MailServerDetails;
