'use client';

import { use } from 'react';
import TenantForm from '../_components/TenantForm';

interface EditTenantPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTenantPage({ params }: EditTenantPageProps) {
  const { id } = use(params);
  return <TenantForm tenantId={id} mode="edit" />;
}
