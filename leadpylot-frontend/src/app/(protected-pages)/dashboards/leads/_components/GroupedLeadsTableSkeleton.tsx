import React from 'react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface GroupedLeadsTableSkeletonProps {
  groups?: number;
}

const GroupedLeadsTableSkeleton: React.FC<GroupedLeadsTableSkeletonProps> = ({ groups = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: groups }, (_, groupIndex) => (
        <Card key={`group-${groupIndex}`} bodyClass="p-0">
          {/* Group Header Skeleton - matches the actual UI */}
          <div className="flex items-center justify-between border-b bg-gray-50 p-4">
            {/* Left side: Circle and Group Name */}
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" width="24px" height="24px" />
              <Skeleton width="120px" height="20px" /> {/* Group name */}
            </div>
            {/* Right side: Two bars */}
            <div className="flex flex-col items-end gap-1">
              {' '}
              {/* Align to end (right) and stack vertically */}
              <Skeleton width="100px" height="16px" /> {/* Longer bar */}
              <Skeleton width="70px" height="16px" /> {/* Shorter bar */}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GroupedLeadsTableSkeleton;
