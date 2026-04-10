'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSession } from '@/hooks/useSession';
import { useTableZoomStore } from '@/stores/tableZoomStore';
import SearchListAndGlobalSearch from '../SearchListAndGlobalSearch';
import { SelectionBar } from './SelectionBar';
import { ActionsSection } from './ActionsSection';
import { FilterSection } from './FilterSection';
import { PaginationBar } from './PaginationBar';
import { ColumnCustomization } from './ColumnCustomization';
import type { CommonActionBarProps } from './types';

const CommonActionBar = ({
  commonActionBarClasses = 'mt-2 mb-1',
  selectedItems,
  handleClearSelection,
  allColumns,
  columnVisibility,
  handleColumnVisibilityChange,
  setIsColumnOrderDialogOpen,
  isColumnOrderDialogOpen,
  children,
  tableName,
  tableId,
  currentPage = 1,
  pageSize = 10,
  total = 0,
  onPageChange = () => {},
  showPagination = false,
  extraActions = <></>,
  showNavigation = true,
  showSearchInActionBar = true,
  showActionsDropdown = true,
  styleColumnSorting,
  showSortingColumn = true,
  onSelectAll,
  searchPlaceholder = 'Search...',
  onAppendQueryParams,
  search,
  hasSelectedGroupBy = false,
  showSelectAllButton = true,
  preservedFields = [],
  hideActionsForAgent = false,
  filterBtnComponent,
  showStageGroupByButton = false,
  isAllSelected = false,
  showZoomButtons = false,
  sectionTitle,
  selectedGroupByArray,
  onGroupByArrayChange,
  entityType,
  leftCommonActions,
  idleLeftToolbar,
  headerActionsPortalTargetId,
  externalCustomizeButtonRef,
  switchToActions,
  compactSelectionButtons = false,
  ...rest
}: CommonActionBarProps) => {
  const { zoomLevel, zoomIn, zoomOut, resetZoom } = useTableZoomStore();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  const selectionBarVisible = (selectedItems?.length ?? 0) > 0;
  const actionsSectionVisible =
    !!showActionsDropdown &&
    !(hideActionsForAgent && isAgent) &&
    (selectedItems?.length ?? 0) > 0;
  const showIdleLeftToolbar =
    idleLeftToolbar != null && !selectionBarVisible && !actionsSectionVisible;

  return (
    <div className={`w-full ${commonActionBarClasses}`}>
      <div className="flex w-full flex-wrap items-center gap-2 md:flex-nowrap">
        {/* Left: selection, actions, filter, zoom */}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
          {!headerActionsPortalTargetId && leftCommonActions}

          {showIdleLeftToolbar ? (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">{idleLeftToolbar}</div>
          ) : null}

          <SelectionBar
            selectedItems={selectedItems}
            handleClearSelection={handleClearSelection}
            onSelectAll={onSelectAll}
            showSelectAllButton={showSelectAllButton}
            hasSelectedGroupBy={hasSelectedGroupBy}
            isAllSelected={isAllSelected}
            compactSelectionButtons={compactSelectionButtons}
          />

          <ActionsSection
            selectedItems={selectedItems}
            showActionsDropdown={showActionsDropdown}
            hideActionsForAgent={hideActionsForAgent}
            isAgent={isAgent}
            sectionTitle={sectionTitle}
            switchToActions={switchToActions}
          >
            {children}
          </ActionsSection>

          {filterBtnComponent}

          {showZoomButtons && (
            <div className="flex items-center gap-1 rounded-md border border-gray-200">
              <Button
                variant="plain"
                size="md"
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
                icon={<ApolloIcon name="minus" className="text-sm" />}
                className="rounded-none rounded-l-md border-r border-gray-200"
                title="Zoom Out"
              />
              <div className="min-w-3 px-2 py-1 text-center text-xs font-medium text-gray-600">
                {Math.round(zoomLevel * 100)}%
              </div>
              <Button
                variant="plain"
                size="md"
                onClick={zoomIn}
                disabled={zoomLevel >= 2.0}
                icon={<ApolloIcon name="plus" className="text-sm" />}
                className="rounded-none rounded-r-md border-l border-gray-200"
                title="Zoom In"
              />
              <Button
                variant="plain"
                size="md"
                onClick={resetZoom}
                icon={<ApolloIcon name="refresh" className="text-sm" />}
                className="rounded-none rounded-r-md border-l border-gray-200"
                title="Reset Zoom"
              />
            </div>
          )}
        </div>

        {/* Right: filters, pagination, search */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          {showSearchInActionBar && (
            <SearchListAndGlobalSearch
              search={search}
              searchPlaceholder={searchPlaceholder}
              onAppendQueryParams={onAppendQueryParams}
              pathname={pathname}
              tableName={tableName}
              tableId={tableId}
              selectedGroupByArray={selectedGroupByArray}
              onGroupByArrayChange={onGroupByArrayChange}
              entityType={entityType}
            />
          )}

          <div>{extraActions}</div>

          <FilterSection
            entityType={entityType}
            tableId={tableId}
            showStageGroupByButton={showStageGroupByButton}
            selectedGroupByArray={selectedGroupByArray}
            onGroupByArrayChange={onGroupByArrayChange}
          />

          <ColumnCustomization
            allColumns={allColumns}
            columnVisibility={columnVisibility}
            handleColumnVisibilityChange={handleColumnVisibilityChange}
            setIsColumnOrderDialogOpen={setIsColumnOrderDialogOpen}
            isColumnOrderDialogOpen={isColumnOrderDialogOpen}
            tableName={tableName}
            preservedFields={preservedFields}
            showSortingColumn={showSortingColumn}
            styleColumnSorting={styleColumnSorting}
            headerActionsPortalTargetId={headerActionsPortalTargetId}
            externalCustomizeButtonRef={externalCustomizeButtonRef}
          />

          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            showPagination={showPagination}
            showNavigation={showNavigation}
          />
        </div>
      </div>
    </div>
  );
};

export default CommonActionBar;
