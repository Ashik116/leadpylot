'use client';

import React from 'react';
import PaymentTermForm from '../_components/PaymentTermForm';
import Card from '@/components/ui/Card';

const CreateFormWrapper = () => {
  return (
    <Card>
      <PaymentTermForm type="create" />
    </Card>
  );
};

export default CreateFormWrapper;
