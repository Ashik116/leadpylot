import ApolloIcon from '@/components/ui/ApolloIcon';
import Loading from '@/components/shared/Loading';
import { useCallHistory } from './useCallHistory';
import UpdatesActivitySkeleton from '../UpdatesActivitySkeleton';

interface PhoneTabProps {
  leadId: string | undefined;
}

const PhoneTab = ({ leadId }: PhoneTabProps) => {
  const {
    transformedCallHistory,
    callHistoryLoading,
    callHistoryError,
    hasNextCallPage,
    isFetchingNextCallPage,
    loadMorePhoneRef,
  } = useCallHistory(leadId);

  if (callHistoryLoading) {
    return <Loading loading />;
  }

  if (callHistoryError) {
    return (
      <div className="p-6 text-center">
        <p className="text-rust text-sm">Error loading call history</p>
      </div>
    );
  }

  if (transformedCallHistory.length === 0) {
    return <p className="text-sand-2 mt-8 text-center text-sm">No calls</p>;
  }

  const callTypeInfo = {
    call_inbound: {
      label: 'Incoming',
      icon: <ApolloIcon name="phone" className="rotate-90" />,
      color: 'bg-evergreen',
    },
    call_outbound: {
      label: 'Outgoing',
      icon: <ApolloIcon name="phone" className="-rotate-90" />,
      color: 'bg-ocean-2',
    },
    call_missed: {
      label: 'Missed',
      icon: <ApolloIcon name="phone" className="rotate-45" />,
      color: 'bg-rust',
    },
  };

  return (
    <div className="divide-y divide-gray-200">
      {transformedCallHistory.map(({ date, activities }) => (
        <div key={date} className="p-3">
          <div className="mb-3">
            <span className="inline-block rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="space-y-3">
            {activities.map((activity: any) => {
              const callType = callTypeInfo[activity.type as keyof typeof callTypeInfo];

              return (
                <div key={activity.id} className="flex items-start rounded-lg p-2 hover:bg-gray-50">
                  <div
                    className={`mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${callType.color} text-white`}
                  >
                    {callType.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{activity.actor}</span>
                      <span className="text-xs text-gray-500">{activity.timestamp}</span>
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className={`mr-2 text-xs font-medium text-${callType.color}-600`}>
                        {callType.label}
                      </span>
                      {activity.details?.duration && activity.details.duration !== '-' && (
                        <span className="text-xs text-gray-500">• {activity.details.duration}</span>
                      )}
                      {activity.details?.status && (
                        <span className="ml-2 text-xs text-gray-500">
                          • {activity.details.status}
                        </span>
                      )}
                    </div>
                    {activity.details?.notes && (
                      <p className="mt-1 text-sm text-gray-600">{activity.details.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Load more trigger element for call history */}
      {hasNextCallPage && (
        <div ref={loadMorePhoneRef} className="py-4 text-center">
          {isFetchingNextCallPage && <UpdatesActivitySkeleton />}
        </div>
      )}
    </div>
  );
};

export default PhoneTab;
