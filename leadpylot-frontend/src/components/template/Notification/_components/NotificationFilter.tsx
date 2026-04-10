'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { NotificationCategory } from '@/configs/notification.config';
import CategoryTabs from './CategoryTabs';
import FloatingSelect from './FloatingSelect';
import Button from '@/components/ui/Button';

export type DateRangeFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

export interface NotificationFilterProps {
  selectedCategory: NotificationCategory | null;
  selectedDateRange: DateRangeFilter;
  onCategoryChange: (category: NotificationCategory | null) => void;
  onDateRangeChange: (range: DateRangeFilter) => void;
  onClearFilters: () => void;
  portalRoot?: HTMLElement | null;
}

const DATE_RANGE_OPTIONS = [
  { value: 'all' as const, label: 'All Time' },
  { value: 'today' as const, label: 'Today' },
  { value: 'yesterday' as const, label: 'Yesterday' },
  { value: 'week' as const, label: 'Last 7 Days' },
  { value: 'month' as const, label: 'Last 30 Days' },
];

const FILTER_CATEGORIES: NotificationCategory[] = [
  'leads',
  'offers',
  'email',
  'login',
  'project',
  'task',
  'document',
  'system',
];

const NotificationFilter: React.FC<NotificationFilterProps> = ({
  selectedCategory,
  selectedDateRange,
  onCategoryChange,
  onDateRangeChange,
  onClearFilters,
  portalRoot,
}) => {
  const scrollStateRef = useRef<{
    canScrollLeft: boolean;
    canScrollRight: boolean;
    onScrollLeft: (e: React.MouseEvent) => void;
    onScrollRight: (e: React.MouseEvent) => void;
  }>({
    canScrollLeft: false,
    canScrollRight: false,
    onScrollLeft: () => {},
    onScrollRight: () => {},
  });
  const [, forceUpdate] = useState(0);

  const hasActiveFilters = useMemo(() => {
    return selectedCategory !== null || selectedDateRange !== 'all';
  }, [selectedCategory, selectedDateRange]);

  const allCategories = useMemo(() => {
    return FILTER_CATEGORIES;
  }, []);

  const renderScrollControls = useCallback(
    (props: {
      canScrollLeft: boolean;
      canScrollRight: boolean;
      onScrollLeft: (e: React.MouseEvent) => void;
      onScrollRight: (e: React.MouseEvent) => void;
    }) => {
      const prev = scrollStateRef.current;
      if (prev.canScrollLeft !== props.canScrollLeft || prev.canScrollRight !== props.canScrollRight) {
        scrollStateRef.current = props;
        requestAnimationFrame(() => forceUpdate((c) => c + 1));
      } else {
        scrollStateRef.current = props;
      }
      return null;
    },
    []
  );

  return (
    <div className="border-b border-gray-100 bg-white px-3">
      <div className="flex h-10 items-center gap-2">
        {/* Category Tabs (Scrollable) */}
        <div className="min-w-0 flex-1 flex items-center overflow-hidden">
          <CategoryTabs
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            categories={allCategories}
            renderScrollControls={renderScrollControls}
            showScrollIcons={false}
          />
        </div>

        {/* Date Range Dropdown */}
        <div className="shrink-0">
          <FloatingSelect<DateRangeFilter>
            value={selectedDateRange}
            options={DATE_RANGE_OPTIONS}
            onChange={onDateRangeChange}
            ariaLabel="Filter by date range"
            listLabel="Date range"
            fallbackLabel="All Time"
            portalRoot={portalRoot}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="plain"
            size="xs"
            icon={<HiOutlineX className="h-3.5 w-3.5" />}
            onClick={onClearFilters}
            title="Clear all filters"
            className="shrink-0 !text-gray-400 hover:!text-gray-600"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotificationFilter;
