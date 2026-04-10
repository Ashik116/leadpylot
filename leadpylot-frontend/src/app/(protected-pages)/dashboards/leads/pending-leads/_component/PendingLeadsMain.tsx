'use client';
import CommonLeadsDashboard from '../../_components/CommonLeadsDashboard';

const PendingLeadsMain = () => {
  return <CommonLeadsDashboard pendingLeadsComponent={true} tableName="pending-leads" />;
};

export default PendingLeadsMain;
