'use client';

import React from 'react';
import PaymentTermFormWrapper from '../_components/PaymentTermFormWrapper';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

const CreatePage = () => {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/payment-terms');
  };

  return (
    <Card>
      <PaymentTermFormWrapper type="create" onSuccess={handleSuccess} />
    </Card>
  );
};

export default CreatePage;
