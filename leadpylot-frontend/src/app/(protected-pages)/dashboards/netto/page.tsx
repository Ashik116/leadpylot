'use client';

import { UnifiedDashboard } from '../_components/unified-dashboard';
import { nettoHookConfig } from './_components/NettoDashboardConfig';

const NettoPage = () => {
    return (
        <UnifiedDashboard
            dashboardType="netto"
            {...nettoHookConfig}
        />
    );
};

export default NettoPage;   