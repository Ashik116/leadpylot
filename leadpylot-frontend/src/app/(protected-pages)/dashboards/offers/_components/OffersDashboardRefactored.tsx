'use client';

import { UnifiedDashboard } from '../../_components/unified-dashboard';
import { offersHookConfig } from './OffersDashboardConfig';

const OffersDashboardRefactored = () => {
  return <UnifiedDashboard dashboardType="offer" {...offersHookConfig} />;
};

export default OffersDashboardRefactored;
