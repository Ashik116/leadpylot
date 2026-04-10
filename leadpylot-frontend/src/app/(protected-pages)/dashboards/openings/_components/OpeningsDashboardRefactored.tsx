'use client';

import { UnifiedDashboard } from '../../_components/unified-dashboard';
import { openingsHookConfig } from './OpeningsDashboardConfig';

const OpeningsDashboardRefactored = () => {
  return <UnifiedDashboard dashboardType="opening" {...openingsHookConfig} />;
};

export default OpeningsDashboardRefactored;
