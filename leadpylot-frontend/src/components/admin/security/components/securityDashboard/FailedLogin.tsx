import Card from '@/components/ui/Card';
import { HiExclamationTriangle } from 'react-icons/hi2';
import SecurityCard from './SecurityCard';

const FailedLogin = ({
  recentFailedLogins,
  onSessionDetails,
}: {
  recentFailedLogins: any[];
  onSessionDetails?: (session: any) => void;
}) => {
  return (
    <Card>
      <div className="border-b border-gray-200 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HiExclamationTriangle className="h-5 w-5 text-red-500" />
          Recent Failed Logins
        </h3>
      </div>
      <div className="px-2 py-4">
        {recentFailedLogins?.length > 0 ? (
          <div className="space-y-3">
            {recentFailedLogins?.map((attempt, index) => (
              <div key={index}>
                <SecurityCard
                  session={attempt}
                  className="bg-red-50"
                  onDetailsClick={onSessionDetails}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">No recent failed logins</p>
        )}
      </div>
    </Card>
  );
};

export default FailedLogin;
