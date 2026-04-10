'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dropdown from '@/components/ui/Dropdown';

interface DateRangeFilterProps {
  onDateRangeChange: (range: { start_date?: string; end_date?: string }) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onDateRangeChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    const range: { start_date?: string; end_date?: string } = {};

    if (startDate) {
      range.start_date = new Date(startDate).toISOString();
    }
    if (endDate) {
      range.end_date = new Date(endDate + 'T23:59:59').toISOString();
    }

    onDateRangeChange(range);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onDateRangeChange({});
  };

  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    } else if (startDate) {
      return `From ${new Date(startDate).toLocaleDateString()}`;
    } else if (endDate) {
      return `Until ${new Date(endDate).toLocaleDateString()}`;
    }
    return 'Select Date Range';
  };

  return (
    <Dropdown
      renderTitle={
        <Button
          variant="plain"
          className="focus:ring-opacity-20 flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:border-gray-400 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <ApolloIcon name="calendar" className="h-4 w-4" />
          <span>{getDisplayText()}</span>
        </Button>
      }
    >
      <div className="w-80 space-y-4 p-4">
        <div>
          <h4 className="mb-3 text-sm font-medium text-black">Date Range</h4>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-black">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-black">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
              min={startDate}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleApply} className="flex-1">
            Apply
          </Button>
          <Button size="sm" variant="plain" onClick={handleClear} className="flex-1">
            Clear
          </Button>
        </div>
      </div>
    </Dropdown>
  );
};

export default DateRangeFilter;
