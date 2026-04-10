'use client';

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DraggableColumnList } from '@/app/(protected-pages)/dashboards/leads/_components/DraggableColumnList';
import type { ColumnDef } from '@tanstack/react-table';
import { getColumnKey, getColumnDisplayLabel } from './types';
import Tooltip from '@/components/ui/Tooltip';
import { ACTION_BAR_COLUMNS_TOOLTIP, TOOLTIP_POPOVER_CLASS } from '@/utils/toltip.constants';

export interface ColumnCustomizationProps {
  allColumns?: ColumnDef<any, any>[];
  columnVisibility?: Record<string, boolean>;
  handleColumnVisibilityChange: (key: string, isChecked: boolean) => void;
  setIsColumnOrderDialogOpen: (open: boolean) => void;
  isColumnOrderDialogOpen: boolean;
  tableName?: string;
  preservedFields?: string[];
  showSortingColumn?: boolean;
  styleColumnSorting?: string;
  headerActionsPortalTargetId?: string;
  externalCustomizeButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function ColumnCustomization({
  allColumns,
  columnVisibility = {},
  handleColumnVisibilityChange,
  setIsColumnOrderDialogOpen,
  isColumnOrderDialogOpen,
  tableName = 'leads',
  preservedFields = [],
  showSortingColumn = true,
  styleColumnSorting,
  headerActionsPortalTargetId,
  externalCustomizeButtonRef,
}: ColumnCustomizationProps) {
  const internalCustomizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const columnDropdownRef = useRef<HTMLDivElement | null>(null);
  const customizeButtonRef = externalCustomizeButtonRef ?? internalCustomizeButtonRef;

  useEffect(() => {
    if (!isColumnOrderDialogOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsColumnOrderDialogOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(event.target as Node)
      ) {
        setIsColumnOrderDialogOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnOrderDialogOpen, setIsColumnOrderDialogOpen]);

  const columnCustomizationDropdown =
    isColumnOrderDialogOpen &&
    typeof document !== 'undefined' &&
    (() => {
      const rect = customizeButtonRef.current?.getBoundingClientRect();
      const position = rect
        ? {
            top: rect.bottom + 8,
            right: document.body.clientWidth - rect.right,
          }
        : null;
      const maxHeight =
        position && typeof window !== 'undefined'
          ? Math.min(400, window.innerHeight * 0.8, window.innerHeight - position.top - 16)
          : undefined;
      return (
        position &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100020]"
              aria-hidden
              onClick={() => setIsColumnOrderDialogOpen(false)}
            />
            <div
              ref={columnDropdownRef}
              className="fixed z-[100020]"
              style={{
                top: position.top,
                right: position.right,
                maxHeight: maxHeight ?? 'min(80vh, 400px)',
              }}
            >
              <DraggableColumnList
                columns={(allColumns ?? [])
                  .filter((col) => {
                    const key = getColumnKey(col);
                    return key && !['checkbox', 'action', 'expander'].includes(key);
                  })
                  .map((col) => {
                    const key = getColumnKey(col)!;
                    const label = getColumnDisplayLabel(col);
                    return {
                      key,
                      label,
                      isVisible: columnVisibility?.[key] !== false,
                    };
                  })}
                onColumnVisibilityChange={handleColumnVisibilityChange}
                onClose={() => setIsColumnOrderDialogOpen(false)}
                tableName={tableName}
                preservedFields={preservedFields}
              />
            </div>
          </>,
          document.body
        )
      );
    })();

  return (
    <>
      {columnCustomizationDropdown}
      {!headerActionsPortalTargetId && (
        <RoleGuard role={Role.ADMIN}>
          {showSortingColumn && (
            <div className="relative">
              <Tooltip
                title={ACTION_BAR_COLUMNS_TOOLTIP}
                placement="top"
                wrapperClass="inline-flex"
                className={TOOLTIP_POPOVER_CLASS}
              >
                <Button
                  ref={internalCustomizeButtonRef}
                  className={`h-6.5 w-6.5 ${styleColumnSorting ?? ''}`}
                  variant="plain"
                  icon={
                    <ApolloIcon
                      name="sliders-settings"
                      className="text-md leading-none font-bold"
                    />
                  }
                  onClick={() => setIsColumnOrderDialogOpen(true)}
                  size="xs"
                />
              </Tooltip>
            </div>
          )}
        </RoleGuard>
      )}
    </>
  );
}
