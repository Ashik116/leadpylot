'use client';
import React, { useCallback, useMemo } from 'react';
import { FaLayerGroup } from 'react-icons/fa';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import type { MetadataGroupOption } from '@/stores/filterStateStore';
import type { ColumnToFieldMap } from './ColumnHeaderFilter';

export interface ColumnHeaderGroupByProps {
  columnId: string;
  groupOptions: MetadataGroupOption[];
  activeGroupBy: string[];
  onToggleGroupBy: (field: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  alwaysVisible?: boolean;
  renderAsOutlineButton?: boolean;
}

const MAX_GROUP_BY = 5;

export default function ColumnHeaderGroupBy({
  columnId,
  groupOptions,
  activeGroupBy,
  onToggleGroupBy,
  columnToFieldMap,
  alwaysVisible = false,
  renderAsOutlineButton = false,
}: ColumnHeaderGroupByProps) {
  const metadataField = columnToFieldMap?.[columnId] || columnId;

  const isGroupable = useMemo(
    () => groupOptions.some((opt) => opt.field === metadataField),
    [groupOptions, metadataField]
  );

  const isActive = useMemo(
    () => activeGroupBy.includes(metadataField),
    [activeGroupBy, metadataField]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isActive && activeGroupBy.length >= MAX_GROUP_BY) {
        toast.push(
          <Notification title="Grouping Limit Reached" type="warning">
            Maximum {MAX_GROUP_BY} grouping levels allowed.
          </Notification>
        );
        return;
      }
      onToggleGroupBy(metadataField);
    },
    [metadataField, isActive, activeGroupBy.length, onToggleGroupBy]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isGroupable) return null;

  const containerClassName = renderAsOutlineButton
    ? `inline-flex h-6 shrink-0 cursor-pointer items-center justify-center gap-1 rounded border px-1.5 transition-colors ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`
    : 'ml-0.5 inline-flex shrink-0 cursor-pointer items-center';

  const iconClassName = renderAsOutlineButton
    ? `text-[11px] ${isActive ? 'text-blue-500' : 'text-gray-500'}`
    : `text-[11px] transition-opacity ${
        isActive
          ? 'text-blue-500'
          : alwaysVisible
            ? 'text-gray-400 hover:text-gray-500'
            : 'text-gray-400 opacity-0 group-hover:opacity-100'
      }`;

  return (
    <div
      className={containerClassName}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={isActive ? 'Remove grouping' : 'Group by this column'}
    >
      <FaLayerGroup className={iconClassName} />
      {renderAsOutlineButton && (
        <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
          Group By
        </span>
      )}
    </div>
  );
}
