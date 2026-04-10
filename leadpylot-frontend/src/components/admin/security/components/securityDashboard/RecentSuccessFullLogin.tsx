import Card from '@/components/ui/Card';
import { HiShieldCheck } from 'react-icons/hi';
import SecurityCard from '@/components/admin/security/components/securityDashboard/SecurityCard';

const RecentSuccessFullLogin = ({
  recentSuccessfulLogins,
  onSessionDetails,
}: {
  recentSuccessfulLogins: any[];
  onSessionDetails?: (session: any) => void;
}) => {
  return (
    <Card>
      <div className="border-b border-gray-200 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HiShieldCheck className="h-5 w-5 text-green-500" />
          Recent Successful Logins
        </h3>
      </div>
      <div className="px-2 py-4">
        {recentSuccessfulLogins?.length > 0 ? (
          <div className="space-y-3">
            {recentSuccessfulLogins?.map((attempt, index) => (
              <div key={index}>
                <SecurityCard
                  session={attempt}
                  className="bg-green-50"
                  onDetailsClick={onSessionDetails}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">No recent successful logins</p>
        )}
      </div>
    </Card>
  );
};

export default RecentSuccessFullLogin;
