'use client';

import React, { useEffect, useState } from 'react';
import { FilterType } from '../UpdatesFilterTabs';

import UpdatesActivitySkeleton from '../../UpdatesActivitySkeleton';
import EmailActivitySkeleton from './EmailActivitySkeleton';
import CommentActivitySkeleton from './CommentActivitySkeleton';
import TaskActivitySkeleton from './TaskActivitySkeleton';
import StatusActivitySkeleton from './StatusActivitySkeleton';

const SKELETON_ITEM_HEIGHT = 80;

interface ActivitySkeletonByFilterProps {
  filterType: FilterType;
  leadExpandView?: boolean;
}

/** Renders tab-specific skeleton. Count is based on device height. */
export const ActivitySkeletonByFilter: React.FC<ActivitySkeletonByFilterProps> = ({
  filterType,
  leadExpandView,
}) => {
  const [count, setCount] = useState(4);

  useEffect(() => {
    const calc = () => {
      if (typeof window === 'undefined') return;
      setCount(Math.max(2, Math.floor(window.innerHeight / SKELETON_ITEM_HEIGHT)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const SkeletonComponent = (() => {
    switch (filterType) {
      case 'email':
        return EmailActivitySkeleton;
      case 'comments':
        return CommentActivitySkeleton;
      case 'tickets':
      case 'todos':
        return TaskActivitySkeleton;
      case 'status':
        return StatusActivitySkeleton;
      case 'all':
      case 'calls':
      default:
        return UpdatesActivitySkeleton;
    }
  })();

  const skeletons = Array.from({ length: count }).map((_, i) => (
    <SkeletonComponent key={i} leadExpandView={leadExpandView} />
  ));

  return (
    <div className="flex w-full flex-col">
      {skeletons}
    </div>
  );
};

export default ActivitySkeletonByFilter;
