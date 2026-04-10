'use client';

import { useCommStore } from '@/stores/commStore';

export default function UnreadBadge() {
  const unreadCounts = useCommStore((s) => s.unreadCounts);
  const total = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  if (total === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md">
      {total > 99 ? '99+' : total}
    </span>
  );
}
