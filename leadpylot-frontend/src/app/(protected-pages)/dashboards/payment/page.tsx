'use client';

import { UnifiedDashboard } from '../_components/unified-dashboard';
import { paymentHookConfig } from './_components/PaymentDashboardConfig';

const PaymentPage = () => {
    return <UnifiedDashboard dashboardType="payment" {...paymentHookConfig} />;
};

export default PaymentPage; 