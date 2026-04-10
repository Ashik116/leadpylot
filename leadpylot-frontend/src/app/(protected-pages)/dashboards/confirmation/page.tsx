'use client';

import { UnifiedDashboard } from '../_components/unified-dashboard';
import { confirmationsHookConfig } from './_components/ConfirmationDashboardConfig';

const ConfirmationPage = () => {
    return <UnifiedDashboard dashboardType="confirmation" {...confirmationsHookConfig} />;
};

export default ConfirmationPage;    