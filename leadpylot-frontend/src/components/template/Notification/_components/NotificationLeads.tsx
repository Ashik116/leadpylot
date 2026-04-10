import classNames from '@/utils/classNames';
import { getStatusConfig } from '@/configs/status.config';
import { StatusBadge } from '@/app/(protected-pages)/dashboards/_components/SharedColumnConfig';

// Format notification time - relative for < 24h, formatted date for older
const formatNotificationTime = (dateValue: any) => {
  if (!dateValue) return 'Recently';

  // Try to parse the date - handle string, number timestamp, or Date object
  let date: Date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'number') {
    // Unix timestamp (in seconds or milliseconds)
    date = new Date(dateValue > 10000000000 ? dateValue : dateValue * 1000);
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    return 'Recently';
  }

  // Check if date is valid
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates (clock skew)
  if (diffMs < 0) return 'Just now';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMinutes < 1) return 'Just now';

  // Less than 1 hour
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  // Less than 24 hours
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  // More than 24 hours - show formatted date
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  // If more than 7 days, also show year
  if (diffDays > 7) {
    options.year = 'numeric';
  }

  return date.toLocaleDateString('en-US', options);
};

type TNotificationLead = {
  item: any;
  handleNotificationClick: any;
  userRole?: string;
  viewDetails?: boolean;
};

// Helper component for Realtime Indicator
const RealtimeIndicator = () => (
  <div className="relative ml-1.5">
    <div className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
    <div className="relative h-2 w-2 rounded-full bg-green-500" />
  </div>
);

// Helper component for Priority Badge
const PriorityBadge = ({ priority }: { priority: 'low' | 'medium' | 'high' }) => {
  const priorityStyles = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        priorityStyles[priority]
      )}
    >
      {priority}
    </span>
  );
};

// Component to render text with status highlighting
const StatusHighlightedText = ({ text }: { text: string }) => {
  const words = text?.split(' ');
  const processedElements: (string | React.ReactElement)[] = [];

  words.forEach((word: string, index: number) => {
    // Clean word (remove punctuation for matching)
    const cleanWord = word?.replace(/[.,!?;:]/g, '');

    // Check if this word matches any status from config
    const statusConfig = getStatusConfig(cleanWord);
    const isStatusMatch = statusConfig?.name?.toLowerCase() === cleanWord?.toLowerCase();

    if (isStatusMatch && statusConfig?.backgroundColor) {
      // Add styled status word with background from config
      processedElements.push(
        <span
          key={`${word}-${index}`}
          className={classNames(
            'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
            statusConfig?.backgroundColor,
            statusConfig?.textColor
          )}
        >
          {word}
        </span>
      );
    } else {
      // Add plain text word (no styling)
      processedElements.push(
        <span key={`${word}-${index}`} className="inline">
          {word}
        </span>
      );
    }

    // Add space between words (except after last word)
    if (index < words?.length - 1) {
      processedElements.push(' ');
    }
  });

  return <span className="inline">{processedElements}</span>;
};

// Header Component
const NotificationHeader = ({ item }: { item: any }) => {
  const isRead = item?.readed;
  const titleColor = isRead ? 'text-gray-500' : 'text-gray-900';

  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item?.target && (
          <span className={classNames('truncate text-sm font-semibold', titleColor)}>
            {item?.target}
          </span>
        )}
        {item?.isRealtime && !item?.readed && <RealtimeIndicator />}
        {item?.priority && <PriorityBadge priority={item?.priority as 'low' | 'medium' | 'high'} />}
        {item?.category && item?.category === 'todo' && <StatusBadge status="ticket" />}
      </div>
    </div>
  );
};

// Description Component
const NotificationDescription = ({ item }: { item: any }) => {
  const isRead = item?.readed;
  const textColor = isRead ? 'text-gray-500' : 'text-gray-700';
  const text = item?.metadata?.formattedMessage || item?.description;

  return (
    <div className={classNames('mb-2 text-sm leading-relaxed break-words', textColor)}>
      <StatusHighlightedText text={text} />
    </div>
  );
};

// Footer Component
const NotificationFooter = ({ item, viewDetails }: { item: any; viewDetails: boolean }) => {
  const hasDetails = !!(item?.leadId || item?.offerId || item?.projectId);

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
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{formatNotificationTime(dateValue)}</span>
      {hasDetails && (
        <span className="cursor-pointer text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">
          View Details →
        </span>
      )}
    </div>
  );
};

// Location Label Component
const LocationLabel = ({ locationLabel }: { locationLabel?: string }) => {
  if (!locationLabel) return null;

  return (
    <div className="mb-2 truncate text-xs text-gray-400">
      <span className="font-medium">Location:</span> {locationLabel}
    </div>
  );
};

const NotificationLeads = ({
  item,
  handleNotificationClick,
  viewDetails = false,
}: TNotificationLead) => {
  const isRead = item.readed;
  const isUnreadRealtime = item.isRealtime && !item.readed;
  return (
    <div
      className={classNames(
        'group relative flex w-full cursor-pointer gap-3 overflow-hidden rounded-lg border border-gray-200 p-3 transition-all duration-200',
        'hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100',
        {
          'border-l-4 border-blue-500 bg-blue-50/30': isUnreadRealtime,
          'opacity-90': isRead,
          'bg-white': !isRead,
        }
      )}
      onClick={() => handleNotificationClick(item)}
    >
      {/* Content */}
      <div className="min-w-0 flex-1">
        <NotificationHeader item={item} />
        <NotificationDescription item={item} />
        <LocationLabel locationLabel={item?.locationLabel} />
        <NotificationFooter item={item} viewDetails={viewDetails} />
      </div>

      {/* Read Status Badge */}
      {/* <div className="shrink-0 pt-1">
        <Badge
          className="transition-all duration-200"
          innerClass={classNames('min-w-2.5 min-h-2.5 rounded-full transition-all duration-200', {
            'bg-blue-500 shadow-sm shadow-blue-500/50': !isRead,
            'bg-gray-300': isRead,
          })}
        />
      </div> */}
    </div>
  );
};

export default NotificationLeads;
