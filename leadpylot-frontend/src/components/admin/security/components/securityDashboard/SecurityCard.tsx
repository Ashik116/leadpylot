import CopyButton from '@/components/shared/CopyButton';
import Button from '@/components/ui/Button';
import { HiEye } from 'react-icons/hi';

const SecurityCard = ({
  session,
  className = '',
  onDetailsClick,
}: {
  session: any;
  className?: string;
  onDetailsClick?: (session: any) => void;
}) => {
  return (
    <div className={`flex items-center justify-between rounded-lg bg-blue-50 p-3 ${className}`}>
      <div>
        <p className="font-medium text-gray-900">{session?.userId?.login || session?.login}</p>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          {session?.deviceInfo?.browser || session?.geolocation?.city} •{' '}
          {session?.geolocation?.country}
          <div className="group flex items-center gap-1">
            <p>• {session?.ipAddress}</p>
            <div className="opacity-0 group-hover:opacity-100">
              <CopyButton value={session?.ipAddress} />
            </div>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">
          {new Date(session?.lastActivity || session?.createdAt).toLocaleTimeString()}
        </p>
        <Button
          variant="default"
          size="xs"
          icon={<HiEye />}
          className="bg-transparent"
          onClick={() => onDetailsClick?.(session)}
        >
          Details
        </Button>
      </div>
    </div>
  );
};
export default SecurityCard;
