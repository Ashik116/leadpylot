'use client';

import React from 'react';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import SupervisorActionsTable from './SuperVisor/SupervisorActionsTable';

export const SupervisorActionHistory: React.FC = () => {
  const { data: session } = useSession();
  if (session?.user?.role !== Role.ADMIN) return null;

  return <SupervisorActionsTable />;
};

export default SupervisorActionHistory;
