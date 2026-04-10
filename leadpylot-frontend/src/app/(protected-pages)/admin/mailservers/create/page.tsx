'use client';

import Card from '@/components/ui/Card';
import MailServerForm from '../_components/MailServerForm';
import { usePathname } from 'next/navigation';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';

function CreateMailServer() {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  return (
    <div className="space-y-6">
      <Card>
        <MailServerForm type="create" />
      </Card>
    </div>
  );
}

export default CreateMailServer;
