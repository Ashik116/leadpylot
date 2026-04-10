'use client';

import React, { useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import FilterTags from '@/components/shared/FilterTags/FilterTags';

export type AppliedFiltersControlProps = {
  isXlOrLarger: boolean;
  isExpanded: boolean;
  tableId?: string;
  onClearAllFilters: () => void;
};

const AppliedFiltersControl: React.FC<AppliedFiltersControlProps> = ({
  isXlOrLarger,
  isExpanded,
  tableId,
  onClearAllFilters,
}) => {
  const [isPopoverMinimized, setIsPopoverMinimized] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);

  if (isXlOrLarger && !isExpanded) {
    return (
      <div className="flex min-w-0 shrink flex-wrap items-center gap-2">
        <FilterTags tableId={tableId} />
      </div>
    );
  }

  if (isPopoverMinimized && !isExpanded) {
    return (
      <Button
        type="button"
        size="xs"
        variant="secondary"
        icon={<ApolloIcon name="funnel-chart" className="text-sm" />}
        className="shrink-0 border border-gray-300 bg-gray-50 text-black hover:bg-gray-100"
        onClick={() => {
          setIsPopoverMinimized(false);
          setIsPopoverOpen(true);
        }}
      >
        Applied Filters
      </Button>
    );
  }

  return (
    <div className="relative shrink-0">
      <Popover
        placement="bottom-start"
        isOpen={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        dismissOnOutsideClick={false}
        floatingClassName="mt-0"
        content={
          <div className="flex max-h-[70vh] min-w-[260px] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-end gap-2 px-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="plain"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setIsPopoverMinimized(true)}
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <ApolloIcon name="minus" className="text-sm" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="plain"
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  onClick={onClearAllFilters}
                  title="Close and clear all filters"
                  aria-label="Close and clear all filters"
                >
                  <ApolloIcon name="cross" className="text-sm" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-2 pb-3">
              <div className="w-full">
                <FilterTags tableId={tableId} stacked />
              </div>
            </div>
          </div>
        }
        className="max-w-[min(90vw,400px)]"
      >
        <Button
          type="button"
          size="xs"
          variant="secondary"
          icon={<ApolloIcon name="funnel-chart" className="text-sm" />}
          className="shrink-0 border border-gray-300 bg-gray-50 text-black hover:bg-gray-100"
          aria-expanded={isPopoverOpen}
        >
          Applied Filters
        </Button>
      </Popover>
    </div>
  );
};

export default AppliedFiltersControl;
