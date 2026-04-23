'use client';

import React from 'react';

export interface ActionsSectionProps {
  selectedItems: any[];
  showActionsDropdown?: boolean;
  hideActionsForAgent?: boolean;
  isAgent?: boolean;
  sectionTitle?: string;
  children?: React.ReactNode;
  switchToActions?: React.ReactNode;
}

export function ActionsSection({
  selectedItems,
  showActionsDropdown = true,
  hideActionsForAgent = false,
  isAgent = false,
  sectionTitle,
  children,
  switchToActions,
}: ActionsSectionProps) {
  if (!showActionsDropdown || (hideActionsForAgent && isAgent) || (selectedItems?.length ?? 0) === 0) {
    return null;
  }

  return (
    <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
      {sectionTitle && (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)]">
          <span className="text-sm font-semibold text-gray-700 dark:text-[var(--dm-text-primary)]">{sectionTitle}</span>
        </div>
      )}
      <div className="flex flex-nowrap items-center whitespace-nowrap">
        {switchToActions ?? children}
      </div>
    </div>
  );
}
