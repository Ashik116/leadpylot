'use client';

import { HiOutlineSearch } from 'react-icons/hi';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select/Select';
import Checkbox from '@/components/ui/Checkbox/Checkbox';
import { FilterState } from '../types';

interface ActivityFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onSearch: (value: string) => void;
  onDateRangeChange: (range: string) => void;
}

const CATEGORIES = [
  'all',
  'authentication',
  'assignment',
  'monitoring',
  'project',
  'provider',
  'financial',
  'system',
  'admin',
  'lead',
  'offer',
  'email',
];

const PRIORITIES = ['all', 'low', 'medium', 'high'];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ActivityFilters({
  filters,
  onFilterChange,
  onSearch,
  onDateRangeChange,
}: ActivityFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
          <Input
            placeholder="Search activities..."
            prefix={<HiOutlineSearch className="h-4 w-4" />}
            value={filters?.search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
          <Select
            options={CATEGORIES?.map((category) => ({
              value: category,
              label:
                category === 'all'
                  ? 'All Categories'
                  : category?.charAt(0).toUpperCase() + category?.slice(1),
            }))}
            value={{
              value: typeof filters?.category === 'string' ? filters?.category : 'all',
              label:
                typeof filters?.category === 'string'
                  ? filters?.category === 'all'
                    ? 'All Categories'
                    : filters?.category?.charAt(0).toUpperCase() + filters?.category?.slice(1)
                  : 'All Categories',
            }}
            onChange={(option: any) => onFilterChange('category', option?.value)}
            isClearable={false}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
          <Select
            options={PRIORITIES?.map((priority) => ({
              value: priority,
              label:
                priority === 'all'
                  ? 'All Priorities'
                  : priority?.charAt(0).toUpperCase() + priority?.slice(1),
            }))}
            value={{
              value: filters?.priority,
              label: filters?.priority?.charAt(0).toUpperCase() + filters?.priority?.slice(1),
            }}
            onChange={(option: any) => onFilterChange('priority', option?.value)}
            isClearable={false}
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date Range</label>
          <Select
            options={DATE_RANGES?.map((range: any) => ({
              value: range?.value,
              label: range?.label,
            }))}
            value={{
              value: filters?.dateRange,
              label: DATE_RANGES?.find((r) => r?.value === filters?.dateRange)?.label || 'All Time',
            }}
            onChange={(option: any) => onDateRangeChange(option?.value)}
            isClearable={false}
          />
        </div>
      </div>

      {/* Additional filters */}
      <div className="mt-4 flex items-center space-x-6 border-t border-gray-200 pt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={filters?.showRead}
            onChange={(checked) => onFilterChange('showRead', checked)}
          >
            Show Read
          </Checkbox>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={filters?.showUnread}
            onChange={(checked) => onFilterChange('showUnread', checked)}
          >
            Show Unread
          </Checkbox>
        </div>

        {/* Custom date inputs */}
        {filters?.dateRange === 'custom' && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filters?.startDate || ''}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={filters?.endDate || ''}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
