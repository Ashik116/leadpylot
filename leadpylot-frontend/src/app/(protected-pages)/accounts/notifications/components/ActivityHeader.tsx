'use client';

import { HiOutlineRefresh } from 'react-icons/hi';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select/Select';

interface ActivityHeaderProps {
  viewMode: 'timeline' | 'list';
  onViewModeChange: (mode: 'timeline' | 'list') => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function ActivityHeader({
  viewMode,
  onViewModeChange,
  onRefresh,
  loading,
}: ActivityHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="mt-2 text-gray-600">
          Monitor all system activities, notifications, and user actions in real-time
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <Button
          variant="plain"
          icon={<HiOutlineRefresh className="h-4 w-4" />}
          onClick={onRefresh}
          loading={loading}
        >
          Refresh
        </Button>

        <Select
          options={[
            { value: 'timeline', label: 'Timeline View' },
            { value: 'list', label: 'List View' },
          ]}
          value={{
            value: viewMode,
            label: viewMode === 'timeline' ? 'Timeline View' : 'List View',
          }}
          onChange={(option: any) => onViewModeChange(option?.value)}
          isClearable={false}
          className="min-w-[150px]"
        />
      </div>
    </div>
  );
}
