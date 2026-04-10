'use client';


import { UnifiedDashboard } from '../_components/unified-dashboard';
import { offersHookConfig } from '../offers/_components/OffersDashboardConfig';

const OutOffersDashboard = () => {
  return <UnifiedDashboard dashboardType="offer" {...offersHookConfig} />;
};

export default OutOffersDashboard;

