'use client';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useActivityLog } from './hooks/useActivityLog';
import ActivityHeader from './components/ActivityHeader';
import ActivityFilters from './components/ActivityFilters';
import ActivityContent from './components/ActivityContent';
import NoActivities from './components/NoActivities';
import './activity-log.css';

export default function ActivityLogWrapper() {
  const {
    activities,
    groupedActivities,
    loading,
    filters,
    currentPage,
    totalPages,
    expandedItems,
    viewMode,
    handleFilterChange,
    handleSearch,
    handleDateRangeChange,
    toggleExpanded,
    handleRefresh,
    handlePageChange,
    handleViewModeChange,
  } = useActivityLog();

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      {/* <ActivityHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onRefresh={handleRefresh}
        loading={loading}
      /> */}

      {/* Filters */}
      {/* <ActivityFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onDateRangeChange={handleDateRangeChange}
      /> */}

      {/* Content */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : activities.length === 0 ? (
          <NoActivities onRefresh={handleRefresh} />
        ) : (
          <ActivityContent
            activities={activities}
            groupedActivities={groupedActivities}
            viewMode={viewMode}
            expandedItems={expandedItems}
            currentPage={currentPage}
            totalPages={totalPages}
            onToggleExpanded={toggleExpanded}
            onPageChange={handlePageChange}
          />
        )}
      </Card>
    </div>
  );
}
