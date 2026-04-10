'use client';

import React from 'react';
import BonusAmountFormWrapper from '../_components/BonusAmountFormWrapper';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

const CreatePage = () => {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/bonus-amount');
  };

  return (
    <Card>
      <BonusAmountFormWrapper type="create" onSuccess={handleSuccess} />
    </Card>
  );
};

export default CreatePage;
