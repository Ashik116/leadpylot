import React from 'react';
import Link from 'next/link';
import GlobalSearch from '@/components/shared/GlobalSearch/GlobalSearch';
import UserProfileDropdown from '@/components/template/UserProfileDropdown';
import MobileNav from '@/components/template/MobileNav';
import Logo from '@/components/template/Logo';

const HeaderSkeleton = () => {
  return (
    <div className="flex w-full items-center justify-between">
      {/* Left side - Mobile Nav + Menu Items Skeleton + Global Search */}
      <div className="flex flex-1 items-center gap-1 md:gap-2 xl:gap-5">
        {/* Mobile Nav (static) */}
        <MobileNav />

        {/* Logo + Menu Items Skeleton */}
        <div className="flex items-center gap-2">
          {/* Logo - static, no skeleton needed */}
          <div className="hidden !h-6 !w-6 shrink-0 md:h-8 md:w-8 lg:block">
            <Link href="/dashboards/leads">
              <Logo type="mini" mode="light" logoWidth={32} logoHeight={32} />
            </Link>
          </div>

          {/* Menu item skeletons (Leads, Agents, Openings, etc.) */}
          <div className="h-6 w-16 animate-pulse rounded bg-gray-200 md:w-20" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 md:block md:w-20" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 md:block md:w-24" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 lg:block lg:w-16" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 xl:block xl:w-16" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 xl:block xl:w-16" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 xl:block xl:w-16" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 xl:block xl:w-16" />
          <div className="hidden h-6 w-16 animate-pulse rounded bg-gray-200 xl:block xl:w-16" />
        </div>
      </div>

      {/* Right side - Settings, Reporting, and Profile */}
      <div className="ml-3 flex items-center gap-1 md:gap-4">
        {/* Settings button skeleton */}
        <div className="hidden items-center gap-1 md:flex">
          <div className="h-6 w-9 animate-pulse rounded bg-gray-200 md:w-24" />
        </div>

        {/* Reporting button skeleton */}
        <div className="hidden items-center gap-1 md:flex">
          <div className="h-6 w-9 animate-pulse rounded bg-gray-200 md:w-28" />
        </div>

        {/* User Profile (static) */}
        <UserProfileDropdown hoverable={false} />
      </div>
    </div>
  );
};

export default HeaderSkeleton;
