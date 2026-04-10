import CommonLeadsDashboard from '../leads/_components/CommonLeadsDashboard';

export default function LeadsBankPage() {
  return (
    <div>
      <CommonLeadsDashboard pendingLeadsComponent={false} />
    </div>
  );
}
