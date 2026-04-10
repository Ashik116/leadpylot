'use client';

import React from 'react';
import CommonLeadsDashboard from '../../leads/_components/CommonLeadsDashboard';

// import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export type TTodoFilter = {
  filter: 'assigned_by_me' | 'assigned_to_me' | undefined;
  pendingTodos: boolean;
  completedTodos: boolean;
};

interface TerminDashboardProps {
  pageTitle?: string;
  tableName?: string;
  fixedHeight?: string;
}

const TerminDashboard: React.FC<TerminDashboardProps> = ({
  fixedHeight,
}: {
  fixedHeight?: string;
}) => {
  return (
    <CommonLeadsDashboard
      fixedHeight={fixedHeight}
      pageTitle="Termin"
      tableName="termin"
      pageInfoSubtitlePrefix="Termin"
    />
  );
};

export default TerminDashboard;
