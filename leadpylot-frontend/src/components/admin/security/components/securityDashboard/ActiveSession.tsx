import Card from '@/components/ui/Card';
import { HiUsers } from 'react-icons/hi';
import SecurityCard from './SecurityCard';

const ActiveSession = ({
  topSessions,
  onSessionDetails,
}: {
  topSessions: any[];
  onSessionDetails?: (session: any) => void;
}) => {
  return (
    <Card>
      <div className="border-b border-gray-200 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HiUsers className="h-5 w-5 text-blue-500" />
          Active Sessions
        </h3>
      </div>
      <div className="px-2 py-4">
        {topSessions?.length > 0 ? (
          <div className="space-y-3">
            {topSessions?.map((session, index) => (
              <div key={index}>
                <SecurityCard session={session} onDetailsClick={onSessionDetails} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">No active sessions</p>
        )}
      </div>
    </Card>
  );
};

export default ActiveSession;
