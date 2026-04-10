'use client';

import { HiOutlineUser, HiOutlineClock, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import NotificationIcon from '@/components/template/Notification/NotificationIcon';
import Link from 'next/link';
import { ActivityItem as ActivityItemType } from '../types';

import CategoryIcon from './CategoryIcon';
import { formatTimestamp, getPriorityColor, getStatusColor } from '../utils';

interface ActivityItemProps {
  activity: ActivityItemType;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
}

export default function ActivityItem({
  activity,
  isExpanded,
  onToggleExpanded,
}: ActivityItemProps) {
  const isRealtime = activity?.isRealtime;
  const showRoleBadge =
    activity?.user?.role &&
    activity.user.role !== activity.user?.name;
  const title =
    activity?.metadata?.title ??
    activity?.metadata?.subject ??
    activity?.title ??
    '';
  const body = activity?.metadata?.body ?? activity?.description ?? '';
  // Prioritize creator name from metadata, then fallback to user name
  // Check multiple sources to ensure we get the actual name, not the role
  const creatorName =
    activity?.metadata?.creatorName ||
    activity?.metadata?.creatorLogin ||
    activity?.user?.name ||
    '';
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border p-1.5 transition-all duration-200 ${
        isRealtime ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
      } ${activity?.read === false ? 'border-l-4 border-l-blue-500' : ''}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-">
        <Link
          href={`${activity?.leadId ? `/dashboards/leads/${activity?.leadId}` : activity?.projectId ? `/dashboards/projects/${activity?.projectId}` : ''}${activity?.offerId && activity?.category === 'offer' ? `?highlightOffer=${activity?.offerId}` : ''}`}
          className="flex min-w-0 flex-1 items-start space-x-3"
        >
          <div className="shrink-0">
            <NotificationIcon {...activity} />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="min-w-0 truncate font-medium text-nowrap text-md text-gray-900">{title}</h4>
              {isRealtime && <Badge className="shrink-0 bg-blue-100 text-xs text-blue-800">Live</Badge>}
              {activity?.read === false && (
                <Badge className="shrink-0 bg-blue-100 text-xs text-blue-800">New</Badge>
              )}
            </div>

            <p className="mb-1 wrap-break-word text-sm text-gray-600">{body}</p>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <HiOutlineUser className="h-3 w-3 shrink-0" />
                <span title="Creator">{creatorName}</span>
                {showRoleBadge && (
                  <Badge className="ml-1 shrink-0 bg-gray-100 text-xs text-gray-600">
                    {activity?.user?.role}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <HiOutlineClock className="h-3 w-3" />
                <span>{formatTimestamp(activity?.timestamp)}</span>
              </div>

              <div className="flex items-center space-x-1">
                <CategoryIcon category={activity?.category} />
                <span className="capitalize">{activity?.category}</span>
              </div>

              <Badge className={getPriorityColor(activity?.priority)} />
              <div className="flex items-center space-x-1 px-1">
                {/* <span className="text-gray-500">Status</span> */}
                <Badge 
                  className={`${getStatusColor(activity?.status)} text-xs font-medium`}
                  content={activity?.status ?? '—'}
                />
              </div>
            </div>

            {isExpanded && activity?.metadata && (
              <div className="mt-3 rounded-md bg-gray-50 p-3">
                <h5 className="mb-2 font-medium text-gray-700">Details</h5>
                <pre className="overflow-auto text-xs text-gray-600">
                  {JSON.stringify(activity?.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="xs" variant="plain" onClick={() => onToggleExpanded(activity?.id)}>
            {isExpanded ? (
              <HiOutlineEyeOff className="h-4 w-4" />
            ) : (
              <HiOutlineEye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
