'use client';

import React from 'react';
import PaymentTermFormWrapper from '../_components/PaymentTermFormWrapper';
import Card from '@/components/ui/Card';
import { useRouter, useParams } from 'next/navigation';

const EditFormWrapper = () => {
  const router = useRouter();
  const { id } = useParams();

  const handleSuccess = () => {
    router.push('/admin/payment-terms');
  };

  return (
    <Card>
      <PaymentTermFormWrapper 
        type="edit" 
        id={id as string} 
        onSuccess={handleSuccess} 
      />
    </Card>
  );
};

export default EditFormWrapper;
