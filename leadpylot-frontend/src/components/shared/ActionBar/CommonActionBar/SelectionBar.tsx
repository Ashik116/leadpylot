'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

export interface SelectionBarProps {
  selectedItems: any[];
  handleClearSelection: () => void;
  onSelectAll?: () => void | Promise<void>;
  showSelectAllButton?: boolean;
  hasSelectedGroupBy?: boolean;
  isAllSelected?: boolean;
  compactSelectionButtons?: boolean;
}

export function SelectionBar({
  selectedItems,
  handleClearSelection,
  onSelectAll,
  showSelectAllButton = true,
  hasSelectedGroupBy = false,
  isAllSelected = false,
  compactSelectionButtons = false,
}: SelectionBarProps) {
  const [allSelectLoading, setAllSelectLoading] = useState(false);
  const shouldShowUnselectAll = isAllSelected;

  const handleSelectAllClick = async () => {
    if (shouldShowUnselectAll) {
      handleClearSelection();
    } else if (onSelectAll) {
      setAllSelectLoading(true);
      try {
        await onSelectAll();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ SelectionBar: Error in select all:', error);
        }
      } finally {
        setAllSelectLoading(false);
      }
    }
  };

  if (selectedItems?.length === 0) return null;

  return (
    <div className="mr-2 flex items-center justify-center rounded-sm">
      <Button
        variant="default"
        size="xs"
        className={
          compactSelectionButtons
            ? 'flex h-5 min-h-5 items-center gap-1 rounded-none rounded-l-md px-1 py-0.5 text-[11px]'
            : 'flex items-center rounded-none rounded-l-md'
        }
        onClick={handleClearSelection}
      >
        <span>
          {compactSelectionButtons ? '' : ' '}
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
        </span>
        <ApolloIcon name="cross" className={compactSelectionButtons ? 'text-[10px]' : 'text-xs'} />
      </Button>
      {showSelectAllButton && !hasSelectedGroupBy && (
        <Button
          loading={allSelectLoading}
          variant={shouldShowUnselectAll ? 'secondary' : 'default'}
          size="xs"
          className={
            compactSelectionButtons
              ? 'h-5 min-h-5 rounded-none rounded-r-md border-l-0 px-1 py-0.5 text-[11px]'
              : 'rounded-none rounded-r-md border-l-0'
          }
          onClick={handleSelectAllClick}
        >
          <span>{shouldShowUnselectAll ? 'Unselect All' : 'Select All'}</span>
        </Button>
      )}
    </div>
  );
}
