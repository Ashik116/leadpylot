'use client';
import { Badge } from '../ui';
import {
  //  getShortStatus,
  getStatusBadgeColor,
} from '@/utils/utils';
import classNames from '@/utils/classNames';
import ApolloIcon from '../ui/ApolloIcon';
import RoleGuard from './RoleGuard';

const StatusBadge = ({ status, icon = false }: { status: string; icon?: boolean }) => {
  const badgeColor = getStatusBadgeColor(status);
  // console.log('status', status);
  // console.log('badgeColor', badgeColor);
  // Utility to show only first 5 chars, then "..." if longer
  if (!status || status.length === 0) {
    return <span className="text-sm">-</span>;
  }

  return (
    <Badge
      className={classNames(
        'block truncate rounded-full px-2 py-0 text-center text-sm font-normal capitalize',
        badgeColor
      )}
      innerClass="text-nowrap"
      content={status}
      icon={
        icon ? (
          <RoleGuard>
            <ApolloIcon name="chevron-arrow-down" className="h-3 w-3" />
          </RoleGuard>
        ) : null
      }
    />
  );
};

export default StatusBadge;
