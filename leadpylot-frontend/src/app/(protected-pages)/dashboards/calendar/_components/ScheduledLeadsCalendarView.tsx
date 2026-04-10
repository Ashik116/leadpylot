'use client';
import { useLeadsDashboardContext } from '../../leads/context/LeadsDashboardContext';
import ScheduleOfferCalendar from './ScheduleOfferCalendar';
import ScheduleOfferCalendarHeader from './ScheduleOfferCalendarHeader';
import Loading from '@/components/shared/Loading';

const ScheduledLeadsCalendarView = () => {
  const {
    leadsData,
    isLoading,
    externalData,
    externalLoading,
    isDynamicFilterMode,
    dynamicFilterResults,
    isBulkSearchMode,
    bulkSearchResults,
    sortedData,
  } = useLeadsDashboardContext();

  // Get the actual leads data array
  const getLeadsData = (): any[] => {
    if (externalData && Array.isArray(externalData)) {
      return externalData;
    }
    if (isDynamicFilterMode && dynamicFilterResults) {
      return dynamicFilterResults;
    }
    if (isBulkSearchMode && bulkSearchResults) {
      return bulkSearchResults;
    }
    if (sortedData && Array.isArray(sortedData) && sortedData.length > 0) {
      return sortedData;
    }
    if (leadsData?.data && Array.isArray(leadsData.data)) {
      return leadsData.data;
    }
    return [];
  };

  const leads = getLeadsData();
  const loading = externalLoading !== undefined ? externalLoading : isLoading;

  if (loading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  return (
    <div className="container mx-auto flex max-w-full px-4">
      <div className="flex w-full gap-4">
        <div className="grow">
          <ScheduleOfferCalendarHeader />
          <ScheduleOfferCalendar leadsData={leads} isLoading={loading} />
        </div>
      </div>
    </div>
  );
};

export default ScheduledLeadsCalendarView;
