// app/admin/mailservers/create/page.tsx
'use client';
import Card from '@/components/ui/Card';
import { useRef } from 'react';
import CreateBankFormWrapper from './_components/CreateBankFormWrapper';
import { usePathname } from 'next/navigation';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { BankFormRef } from '../_components/BankForm';

function CreateBankPage() {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const formRef = useRef<BankFormRef | null>(null);

  return (
    <Card className="p-6 border-none">
      <CreateBankFormWrapper ref={formRef} type="create" />
    </Card>
  );
}

export default CreateBankPage;
