import classNames from '@/utils/classNames';
import {
  extractBusinessDetails,
  formatNotificationType,
  isBusinessNotification,
  setNotificationTypeBg,
} from '../TabbedNotificationBody';
import { Role } from '@/configs/navigation.config/auth.route.config';

import { getLocalTime } from '@/utils/utils';

type TNotificationOffer = {
  item: any;
  handleNotificationClick: any;
  userRole: string;
  viewDetails?: boolean;
};

// Helper component for Info Badge
const InfoBadge = ({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <div className="flex items-center gap-1.5">
    <span className="text-xs text-gray-500">{label}</span>
    <span className={classNames('text-xs font-semibold', color)}>{value}</span>
  </div>
);

// Helper component for Realtime Indicator
const RealtimeIndicator = () => (
  <div className="relative ml-1.5">
    <div className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
    <div className="relative h-2 w-2 rounded-full bg-green-500" />
  </div>
);

// Business Notification Header Component
const BusinessNotificationHeader = ({
  item,
  userRole,
  businessDetails,
}: {
  item: any;
  userRole: string;
  businessDetails: ReturnType<typeof extractBusinessDetails>;
}) => {
  const isRead = item?.readed;
  const textColor = isRead ? 'text-gray-500' : 'text-gray-900';

  if (userRole === Role.ADMIN) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={classNames('truncate text-sm font-semibold', textColor)}>
            {item?.target || 'System'}
          </span>
          <span className="shrink-0 text-xs text-gray-400">→</span>
          <span className={classNames('truncate text-sm font-semibold', textColor)}>
            {businessDetails?.leadName}
          </span>
        </div>
        {item?.isRealtime && !item?.readed && <RealtimeIndicator />}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={classNames('truncate text-base font-bold', textColor)}>
          {businessDetails?.leadName}
        </span>
        {item?.isRealtime && !item?.readed && <RealtimeIndicator />}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs text-gray-500">Amount:</span>
        <span className="text-sm font-bold text-green-600">{businessDetails?.amount}</span>
      </div>
    </div>
  );
};

// Business Notification Details Component
const BusinessNotificationDetails = ({
  userRole,
  businessDetails,
}: {
  userRole: string;
  businessDetails: ReturnType<typeof extractBusinessDetails>;
}) => {
  if (userRole === Role.ADMIN) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <InfoBadge label="Amount" value={businessDetails?.amount} color="text-green-600" />
          <InfoBadge label="Interest" value={businessDetails?.interestRate} color="text-blue-600" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <InfoBadge label="Bonus" value={businessDetails?.bonus} color="text-green-600" />
          <InfoBadge label="Bank" value={businessDetails?.bank} color="text-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      <InfoBadge label="Interest" value={businessDetails?.interestRate} color="text-blue-600" />
      <InfoBadge label="Bonus" value={businessDetails?.bonus} color="text-green-600" />
      <InfoBadge label="Bank" value={businessDetails?.bank} color="text-gray-800" />
    </div>
  );
};

// Standard Notification Component
const StandardNotification = ({ item }: { item: any }) => {
  const isRead = item?.readed;
  const textColor = isRead ? 'text-gray-500' : 'text-gray-700';
  const titleColor = isRead ? 'text-gray-600' : 'text-gray-900';

  return (
    <>
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {item?.target && (
            <span className={classNames('truncate text-sm font-semibold', titleColor)}>
              {item?.target}
            </span>
          )}
          {item?.isRealtime && !item?.readed && <RealtimeIndicator />}
          {item?.priority && (
            <span
              className={classNames('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', {
                'bg-red-100 text-red-700': item?.priority === 'high',
                'bg-yellow-100 text-yellow-700': item?.priority === 'medium',
                'bg-gray-100 text-gray-600': item?.priority === 'low',
              })}
            >
              {item?.priority}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={classNames('mb-2 text-sm leading-relaxed break-words', textColor)}>
        {item?.metadata?.formattedMessage || item?.description}
      </p>

      {/* Location Label */}
      {item?.locationLabel && (
        <div className="mb-2 truncate text-xs text-gray-400">{item?.locationLabel}</div>
      )}
    </>
  );
};

// Footer Component
const NotificationFooter = ({ item, viewDetails }: { item: any; viewDetails: boolean }) => {
  const hasDetails = !!(item.leadId || item.offerId || item.projectId);

  if (!viewDetails && !hasDetails) return null;

  // Use timestamp first (ISO date), then try other fields
  // Note: 'date' field often contains pre-formatted string like "2 days ago"
  const dateValue =
    item?.timestamp ||
    item?.metadata?.timestamp ||
    item?.createdAt ||
    item?.created_at ||
    item?.updatedAt;

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{getLocalTime(dateValue)}</span>
      {hasDetails && (
        <span className="cursor-pointer text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">
          View Details →
        </span>
      )}
    </div>
  );
};

const NotificationOffer = ({
  item,
  handleNotificationClick,
  userRole,
  viewDetails = false,
}: TNotificationOffer) => {
  const isBusinessType = isBusinessNotification(item?.notificationType || '');
  const businessDetails = isBusinessType ? extractBusinessDetails(item) : null;
  const isRead = item?.readed;
  const isUnreadRealtime = item?.isRealtime && !item?.readed;

  return (
    <div
      className={classNames(
        'group relative flex w-full min-w-[400px] cursor-pointer items-center gap-3 overflow-hidden p-2 transition-all duration-200',
        'hover:bg-gray-50 active:bg-gray-100',
        {
          'border-l-4 border-blue-500 bg-blue-50/30': isUnreadRealtime,
          'opacity-90': isRead,
          'bg-white': !isRead,
        }
      )}
      onClick={() => handleNotificationClick(item)}
    >
      {/* Type Badge */}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isBusinessType && businessDetails ? (
          <>
            <div className="">
              <span
                className={classNames(
                  'inline-flex w-fit items-center justify-center rounded-lg px-2 text-xs font-semibold',
                  'shadow-sm',
                  setNotificationTypeBg({ type: item?.notificationType || '' })
                )}
              >
                {formatNotificationType(item?.notificationType || '')}
              </span>
            </div>
            <BusinessNotificationHeader
              item={item}
              userRole={userRole}
              businessDetails={businessDetails}
            />
            <BusinessNotificationDetails userRole={userRole} businessDetails={businessDetails} />
          </>
        ) : (
          <StandardNotification item={item} />
        )}

        <NotificationFooter item={item} viewDetails={viewDetails} />
      </div>

      {/* Read Status Indicator */}
      {/* <div className="shrink-0 pt-1">
        <Badge
          className="transition-all duration-200"
          innerClass={classNames('w-2.5 h-2.5 rounded-full transition-all duration-200', {
            'bg-blue-500 shadow-sm shadow-blue-500/50': !isRead,
            'bg-gray-300': isRead,
          })}
        />
      </div> */}
    </div>
  );
};

export default NotificationOffer;
