'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RecentImportDashboard from './RecentImportDashboard';
import OffersImportHistory from '../../import-leads/_components/OffersImportHistory';

const RecentImportPageWrapper = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const searchParams = useSearchParams();
  const isOffersTab = searchParams.get('offer') === 'true';

  return (
    <div className="space-y-6 px-2">
      {/* Tab Content */}
      <div>
        {!isOffersTab ? (
          <RecentImportDashboard headerTabs={true} />
        ) : (
          <OffersImportHistory headerTabs={true} />
        )}
      </div>
    </div>
  );
};

export default RecentImportPageWrapper;
