'use client';

import React from 'react';
import BonusAmountFormWrapper from '../_components/BonusAmountFormWrapper';
import Card from '@/components/ui/Card';
import { useRouter, useParams } from 'next/navigation';

const EditPage = () => {
  const router = useRouter();
  const { id } = useParams();

  const handleSuccess = () => {
    router.push('/admin/bonus-amount');
  };

  return (
    <Card>
      <BonusAmountFormWrapper type="edit" id={id as string} onSuccess={handleSuccess} />
    </Card>
  );
};

export default EditPage;
