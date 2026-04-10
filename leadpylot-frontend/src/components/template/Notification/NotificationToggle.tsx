import ApolloIcon from '@/components/ui/ApolloIcon';
import Badge from '@/components/ui/Badge';
import classNames from '@/utils/classNames';

interface NotificationToggleProps {
  className?: string;
  count?: number;
  dot?: boolean; // Keep for backward compatibility
}

const NotificationToggle = ({ className, count = 0, dot }: NotificationToggleProps) => {
  // Use count if provided, otherwise fallback to dot boolean
  const hasNotifications = count > 0 || dot;

  return (
    <div className={classNames('relative flex text-2xl', className)}>
      <ApolloIcon name={hasNotifications ? 'alert-bell' : 'bell'} className="text-xl" />

      {/* Notification count badge */}
      {count > 0 && (
        <>
          {/* Pulse ring behind badge */}
          <span className="absolute top-0.5 -right-1.5 z-40 h-[18px] w-[18px] animate-ping rounded-full bg-red-400 opacity-30" />
          {/* Badge */}
          <span className="absolute top-0.5 -right-1.5 z-50 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        </>
      )}

      {/* Fallback dot for backward compatibility when no count but dot=true */}
      {!count && dot && (
        <Badge>
          <span className="sr-only">New notifications</span>
        </Badge>
      )}
    </div>
  );
};

export default NotificationToggle;
