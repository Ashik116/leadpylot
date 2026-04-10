import { useRef, useEffect, useLayoutEffect, useImperativeHandle, useState } from 'react';
import classNames from 'classnames';
import Table from '@/components/ui/Table';
import Checkbox from '@/components/ui/Checkbox';
import {
  useTableZoomStore,
  getTableZoomStyles,
  getTableZoomContainerStyles,
} from '@/stores/tableZoomStore';
import { flexRender } from '@tanstack/react-table';
import {
  CheckBoxChangeEvent,
  DataTableProps,
  IndeterminateCheckboxProps,
  ColumnDef,
} from '../DataTable/types';
import { useDataTable } from '../DataTable/hooks/useDataTable';
import { useTableVirtualization } from '../DataTable/hooks/useTableVirtualization';
import { DataTableBody } from '../DataTable/components/DataTableBody';
import { DataTableHeader } from '../DataTable/components/DataTableHeader';
import { DataTablePagination } from '../DataTable/components/DataTablePagination';

/** True when localStorage has at least one saved numeric column width for this table */
function hasMeaningfulSavedTableColumnSizes(storageKey: string): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(storageKey);
  if (!raw || raw === '{}') return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return false;
    return Object.values(parsed as Record<string, unknown>).some(
      (v) => typeof v === 'number' && v > 0
    );
  } catch {
    return false;
  }
}

// Drag and drop imports
let Droppable: any = null;
let Draggable: any = null;
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dndModule = require('@hello-pangea/dnd');
    Droppable = dndModule.Droppable;
    Draggable = dndModule.Draggable;
  } catch {
    // @hello-pangea/dnd not available
  }
}

const IndeterminateCheckbox = (props: IndeterminateCheckboxProps) => {
  const { indeterminate, onChange, onCheckBoxChange, onIndeterminateCheckBoxChange, ...rest } =
    props;

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof indeterminate === 'boolean' && ref.current) {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);

  const handleChange = (e: CheckBoxChangeEvent) => {
    onChange(e);
    onCheckBoxChange?.(e);
    onIndeterminateCheckBoxChange?.(e);
  };

  return (
    <Checkbox
      ref={ref}
      className="m-0 min-h-3.5 min-w-3.5 p-0"
      onChange={(_, e) => handleChange(e)}
      {...rest}
    />
  );
};

export default function DataTableOptimized<T>({ showHeader = true, ...props }: DataTableProps<T>) {
  const {
    columns: columnsProp = [],
    data = [],
    customNoDataIcon,
    loading,
    noData,
    onCheckBoxChange,
    onIndeterminateCheckBoxChange,
    onPaginationChange,
    onSelectChange,
    pageSizes = [10, 25, 50, 100],
    selectable = false,
    skeletonAvatarColumns,
    skeletonAvatarProps,
    compact = true,
    pagingData = {
      total: 0,
      pageIndex: 1,
      pageSize: 10,
    },
    checkboxChecked,
    indeterminateCheckboxChecked,
    instanceId = 'data-table',
    ref,
    onRowClick,
    rowClassName,
    renderExpandedRow,
    showPagination = true,
    tableHeaderClassName,
    tableClassName,
    headerSticky = true,
    fixedHeight,
    enableZoom = true,
    autoFitRowsOnZoom = true,
    enableColumnResizing = true,
    parentChildConnector = false,
    parentChildConnectorElbowOffset = 24,
    parentChildConnectorLeftAdjust = 8,
    enableDragDrop = false,
    dragDropTableId,
    groupedMode,
    groupedData,
    entityType,
    groupByFields,
    skeletonRowMultiple,
    tableProgressFilter,
    search,
    dynamicallyColumnSizeFit = false,
    hybridResize = false,
    tableLayout = 'fixed',
    loadingRowSize,
    columnFilterOptions,
    activeColumnFilters,
    onColumnFilterApply,
    onColumnFilterClear,
    columnToFieldMap,
    fieldValueLabels,
    columnHeaderFilterRenderers,
    columnGroupOptions,
    activeGroupBy,
    onToggleGroupBy,
    groupByIconPlacement,
    ...rest
  } = props;

  // Determine if dynamic column fitting should be used
  const shouldUseDynamicFit = dynamicallyColumnSizeFit;

  // Remove onSort from rest to prevent it from being passed to native <table> element
  // onSort is a custom DataTable prop, not a valid HTML attribute
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onSort: _onSort, ...tableProps } = rest as Omit<typeof rest, 'onSort'> & {
    onSort?: never;
  };
  const { pageSize, pageIndex, total } = pagingData;

  /** Full-row skeleton only when there is nothing to render; keeps rows visible during refetch/edit. */
  const hasTableContent = groupedMode
    ? Array.isArray(groupedData) && groupedData.length > 0
    : Array.isArray(data) && data.length > 0;
  const bodySkeletonLoading = Boolean(loading) && !hasTableContent;

  const handleIndeterminateCheckBoxChange = (checked: boolean, rows: any[]) => {
    if (!loading) {
      onIndeterminateCheckBoxChange?.(checked, rows);
    }
  };

  const handleCheckBoxChange = (checked: boolean, row: T) => {
    if (!loading) {
      onCheckBoxChange?.(checked, row);
    }
  };

  // Column construction logic
  const finalColumns: ColumnDef<T>[] = (() => {
    const columns = columnsProp?.map?.((col: any) => {
      const { style, ...rest } = col;
      const finalCol: ColumnDef<T> = { ...rest };

      if (col.columnWidth !== undefined) {
        if (typeof col.columnWidth === 'string') {
          const numericValue = parseInt(col.columnWidth?.replace(/[^\d]/g, ''), 10);
          finalCol.size = numericValue;
        } else {
          finalCol.size = col.columnWidth;
        }
      } else {
        // We don't have access to getPageSpecificColumnWidth here easily without importing it or passing it down.
        // But useDataTable handles the sizing state initialization.
        // Here we just set initial size if needed, but the hook manages the actual size.
        // Let's rely on the hook's state for width.
        finalCol.size = 150; // Default fallback
        finalCol.minSize = 80; // Minimum 80px for readable columns (prevents over-compression)
        // finalCol.maxSize = 1000;
      }

      if (
        enableColumnResizing &&
        !['select', 'checkbox', 'expander'].includes(finalCol?.id || '')
      ) {
        finalCol.enableResizing = true;
      }

      if (style) {
        finalCol.meta = { ...finalCol?.meta, style };
      }

      return finalCol;
    });

    const expanderColumn = columns?.find?.((col: any) => col?.id === 'expander');
    const checkboxColumn = columns?.find?.((col: any) => col?.id === 'checkbox');
    const otherColumns = columns?.filter?.(
      (col: any) => col?.id !== 'expander' && col?.id !== 'checkbox'
    );

    const finalColumnArray: ColumnDef<T>[] = [];

    if (selectable) {
      finalColumnArray.push({
        id: 'select',
        columnWidth: 30,
        maxSize: 30,
        minSize: 30,
        meta: {
          style: {
            position: 'sticky',
            left: 0,
            zIndex: 11, // Changed from 3 to 11 to match other sticky columns
            background: 'white',
            width: 30,
            minWidth: 30,
            maxWidth: 30,
          },
        },
        header: ({ table }) => (
          <div className="flex h-8 w-full min-w-0 items-center justify-center px-2">
            <IndeterminateCheckbox
              checked={
                indeterminateCheckboxChecked
                  ? indeterminateCheckboxChecked(table?.getRowModel()?.rows)
                  : table?.getIsAllRowsSelected()
              }
              indeterminate={table?.getIsSomeRowsSelected()}
              onChange={table?.getToggleAllRowsSelectedHandler()}
              onIndeterminateCheckBoxChange={(e) => {
                handleIndeterminateCheckBoxChange(e.target.checked, table?.getRowModel()?.rows);
              }}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-full min-w-0 items-center justify-center px-2"
          >
            <IndeterminateCheckbox
              checked={checkboxChecked ? checkboxChecked(row?.original) : row?.getIsSelected()}
              indeterminate={row?.getIsSomeSelected()}
              onChange={row?.getToggleSelectedHandler()}
              onCheckBoxChange={(e) => {
                handleCheckBoxChange(e.target.checked, row?.original);
              }}
            />
          </div>
        ),
      });
    } else if (checkboxColumn) {
      const fixedCheckboxColumn = {
        ...checkboxColumn,
        size: 25,
        minSize: 25,
        maxSize: 25,
        meta: {
          ...checkboxColumn?.meta,
          style: {
            position: 'sticky',
            left: 0,
            background: 'white',
            zIndex: 11,
            width: 20,
            minWidth: 25,
            maxWidth: 25,
            padding: '2px',
            ...(checkboxColumn?.meta as any)?.style,
          },
        },
      };
      finalColumnArray.push(fixedCheckboxColumn);
    }

    if (expanderColumn) {
      const fixedExpanderColumn = {
        ...expanderColumn,
        size: 30,
        minSize: 30,
        maxSize: 30,
        meta: {
          ...expanderColumn?.meta,
          style: {
            width: 30,
            minWidth: 30,
            maxWidth: 30,
            paddingLeft: '0px',
            paddingRight: '10px',
            ...(expanderColumn?.meta as any)?.style,
          },
        },
      };
      finalColumnArray.push(fixedExpanderColumn);
    }

    finalColumnArray.push(...otherColumns);

    return finalColumnArray;
  })();

  // Identify the last column (flex column) that will absorb remaining space
  const flexColumnId =
    finalColumns.length > 0 ? (finalColumns[finalColumns.length - 1] as any)?.id : null;

  // Use the hook
  const {
    table,
    columnSizing,
    setColumnSizing,
    isResizing,
    resizingColumnId,
    resetSorting,
    resetSelected,
    resetColumnSizing,
    saveColumnSizing,
    setIsResizing,
    setResizingColumnId,
  } = useDataTable({ ...props, columns: finalColumns as any, flexColumnId });

  const tableRef = useRef<HTMLTableElement>(null);
  const columnSizingRef = useRef(columnSizing);
  /** When true, we still need a one-time DOM width sync (no saved sizes in localStorage yet) */
  const domLayoutSyncPendingRef = useRef(true);

  useLayoutEffect(() => {
    columnSizingRef.current = columnSizing;
  }, [columnSizing]);

  // When dynamicallyColumnSizeFit is true, keep it true even during resize.
  // Only disable dynamic fit during hybrid resize when shouldUseDynamicFit is already false.
  const effectiveShouldUseDynamicFit = shouldUseDynamicFit
    ? true
    : hybridResize && isResizing
      ? false
      : shouldUseDynamicFit;

  // Total width during hybrid resize = sum of all columns (no flex)
  const resizeTotalTableWidth = Object.values(columnSizing).reduce((s, w) => s + w, 0);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetSorting,
    resetSelected,
    resetColumnSizing,
  }));

  // Track container width for flex column calculation
  const [containerWidth, setContainerWidth] = useState(0);

  // Zoom logic
  const { zoomLevel } = useTableZoomStore();
  const zoomStyles = enableZoom && !enableDragDrop ? getTableZoomStyles(zoomLevel) : {};
  const zoomContainerStyles =
    enableZoom && !enableDragDrop ? getTableZoomContainerStyles(zoomLevel) : {};

  // Auto fit rows on zoom
  useEffect(() => {
    if (!autoFitRowsOnZoom || !enableZoom || enableDragDrop) return;
    if (!onSelectChange) return;
    const currentZoom = zoomLevel || 1;
    if (currentZoom >= 1) return;
    const ratio = 1 / currentZoom;
    const maxOption =
      Array.isArray(pageSizes) && pageSizes?.length > 0 ? Math.max(...pageSizes) : pageSize * 4;
    const recommended = Math.min(maxOption, Math.ceil(pageSize * ratio));
    if (recommended > pageSize) {
      onSelectChange(recommended);
    }
  }, [
    zoomLevel,
    enableDragDrop,
    autoFitRowsOnZoom,
    enableZoom,
    onSelectChange,
    pageSizes,
    pageSize,
  ]);

  // Virtualization
  const rows = table.getRowModel().rows.slice(0, pageSize);

  const { virtualizer, parentRef, shouldVirtualize } = useTableVirtualization({
    data,
    rows,
    enabled: true,
  });

  // Measure scroll container before paint so flex column math matches on first paint
  useLayoutEffect(() => {
    if (!parentRef.current) return;

    const updateContainerWidth = () => {
      if (parentRef.current) {
        setContainerWidth(parentRef.current.clientWidth);
      }
    };

    updateContainerWidth();

    const resizeObserver = new ResizeObserver(updateContainerWidth);
    resizeObserver.observe(parentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [parentRef]);

  useLayoutEffect(() => {
    domLayoutSyncPendingRef.current = true;
  }, [instanceId]);

  /**
   * Without saved column widths, TanStack defaults + first browser layout often disagree (checkbox
   * misalignment). After resize, mouseUp persists measured th widths — same idea here once headers exist.
   */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (!domLayoutSyncPendingRef.current) return;
    if (!showHeader) return;

    const storageKey = `table-column-sizes-${instanceId}`;
    if (hasMeaningfulSavedTableColumnSizes(storageKey)) {
      domLayoutSyncPendingRef.current = false;
      return;
    }

    const tableEl = tableRef.current;
    if (!tableEl) return;

    const leafCount = table.getAllLeafColumns().length;
    if (leafCount === 0) return;

    const ths = tableEl.querySelectorAll<HTMLTableCellElement>('th[data-column-id]');
    if (ths.length !== leafCount) return;

    const measured: Record<string, number> = {};
    ths.forEach((th) => {
      const id = th.getAttribute('data-column-id');
      if (!id) return;
      const w = th.getBoundingClientRect().width;
      if (w > 0) measured[id] = Math.round(w);
    });

    if (Object.keys(measured).length !== leafCount) return;

    const next = { ...columnSizingRef.current, ...measured };
    setColumnSizing(next);
    saveColumnSizing(next);
    domLayoutSyncPendingRef.current = false;
  }, [
    showHeader,
    instanceId,
    loading,
    noData,
    data?.length,
    finalColumns.length,
    setColumnSizing,
    saveColumnSizing,
    table,
  ]);

  // Calculate flex column width and total table width (only used in fixed mode)
  const { flexColumnWidth, totalTableWidth } = (() => {
    // In dynamic mode (or hybrid resize), skip flex column calculations
    if (effectiveShouldUseDynamicFit) {
      return { flexColumnWidth: 0, totalTableWidth: 0 };
    }

    if (!flexColumnId || containerWidth === 0) {
      // No flex column or container not measured yet
      const total = Object.values(columnSizing).reduce((sum, w) => sum + w, 0);
      return { flexColumnWidth: 0, totalTableWidth: Math.max(total, 800) };
    }

    // Sum of all columns except the flex column
    const otherColumnsWidth = Object.entries(columnSizing)
      .filter(([id]) => id !== flexColumnId)
      .reduce((sum, [, width]) => sum + width, 0);

    // Flex column gets the remaining space (minimum 0)
    const calculatedFlexWidth = Math.max(0, containerWidth - otherColumnsWidth - 20); // -20 for scrollbar
    const defaultFlexWidth = columnSizing[flexColumnId] || 50;

    // Use the larger of calculated width or default width
    const finalFlexWidth = Math.max(calculatedFlexWidth, defaultFlexWidth);

    // Total table width
    const total = otherColumnsWidth + finalFlexWidth;

    return {
      flexColumnWidth: finalFlexWidth,
      totalTableWidth: Math.max(total, containerWidth, 800),
    };
  })();

  // Create effective column sizing with flex column width
  // In dynamic mode (or hybrid resize), use columnSizing as-is
  const effectiveColumnSizing: Record<string, number> = effectiveShouldUseDynamicFit
    ? columnSizing
    : {
      ...columnSizing,
      ...(flexColumnId && flexColumnWidth > 0 ? { [flexColumnId]: flexColumnWidth } : {}),
    };

  const remainingData = (() => {
    const itemsShown = pageIndex * pageSize;
    return Math.max(0, total - itemsShown);
  })();

  // Re-implement createResizeHandler properly
  const handleResizeStart =
    (columnId: string, side: 'left' | 'right' = 'right') =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnSizing[columnId] || 150;

        setIsResizing(true);
        setResizingColumnId(columnId);

        const handleMouseMove = (e: MouseEvent) => {
          const deltaX = e.clientX - startX;
          const colDef = (finalColumns as any[]).find((c) => c?.id === columnId);
          const minSize = colDef?.minSize ?? 80; // Minimum 80px for readable columns
          const maxSize = colDef?.maxSize ?? 10000; // No practical upper limit (was 500)
          const newWidth = Math.max(
            minSize,
            Math.min(maxSize, side === 'right' ? startWidth + deltaX : startWidth - deltaX)
          );
          const newSizing = { ...columnSizing, [columnId]: newWidth };
          setColumnSizing(newSizing);
          saveColumnSizing(newSizing);
        };

        const handleMouseUp = () => {
          // Read actual rendered widths from DOM before state changes (layout still reflects resize)
          const tableEl = tableRef.current;
          const actualSizing: Record<string, number> = { ...columnSizing };
          if (tableEl) {
            const ths = tableEl.querySelectorAll<HTMLTableCellElement>('th[data-column-id]');
            ths.forEach((th) => {
              const colId = th.getAttribute('data-column-id');
              if (colId) {
                const width = th.getBoundingClientRect().width;
                if (width > 0) actualSizing[colId] = Math.round(width);
              }
            });
          }
          if (Object.keys(actualSizing).length > 0) {
            setColumnSizing(actualSizing);
            saveColumnSizing(actualSizing);
          }

          setIsResizing(false);
          setResizingColumnId(null);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };

  const hasSelectCol = selectable || (finalColumns as any[])?.some?.((c) => c?.id === 'checkbox');
  const hasExpanderCol = (finalColumns as any[])?.some?.((c) => c?.id === 'expander');
  const connectorLeftOffset =
    (hasSelectCol ? 30 : 0) + (hasExpanderCol ? 30 : 0) + parentChildConnectorLeftAdjust;

  return (
    <div
      className="relative flex flex-col"
      style={
        fixedHeight
          ? { height: typeof fixedHeight === 'number' ? `${fixedHeight}px` : fixedHeight }
          : { height: '93.5dvh' }
      }
    >
      <div
        ref={parentRef}
        className="table-zoom-container flex-1 [-ms-overflow-style:none]"
        style={{
          ...zoomContainerStyles,
          overflow: 'auto',
          position: 'relative',
          contain: 'paint',
          overflowAnchor: 'none',
          ...(enableDragDrop ? { transform: 'none', willChange: 'auto' } : {}),
        }}
      >
        <div
          className="table-zoom-content"
          style={{
            ...zoomStyles,
            ...(enableDragDrop ? { transform: 'none !important', willChange: 'auto' } : {}),
          }}
        >
          <Table
            ref={tableRef}
            tableClassName={classNames(
              tableClassName,
              isResizing && 'resizing',
              'resizable-table',
              resizingColumnId && 'resizing-column'
            )}
            compact={compact}
            tableWrapperStyle={{
              maxHeight: '100%',
              width: '100%',
              overflow: 'visible',
            }}
            style={
              hybridResize && isResizing
                ? {
                  // During resize: only the resized column changes; others stay fixed.
                  // Table width = sum of columns (no container fill) so others don't auto-resize.
                  tableLayout: 'fixed',
                  width: `${Math.max(resizeTotalTableWidth, 800)}px`,
                  minWidth: '800px',
                }
                : shouldUseDynamicFit
                  ? {
                    tableLayout: tableLayout,
                    width: '100%',
                    minWidth: '800px',
                  }
                  : enableColumnResizing && isResizing
                    ? {
                      tableLayout: 'fixed',
                      width: containerWidth > 0 ? `${totalTableWidth}px` : '100%',
                      minWidth: '800px',
                    }
                    : {
                      tableLayout: tableLayout || 'auto',
                      width: containerWidth > 0 ? `${totalTableWidth}px` : '100%',
                      minWidth: '800px',
                    }
            }
            {...tableProps}
          >
            <colgroup>
              {table.getAllLeafColumns().map((column) => {
                const w = effectiveColumnSizing[column.id] ?? column.getSize();
                const px = typeof w === 'number' && Number.isFinite(w) ? w : 150;
                return <col key={column.id} style={{ width: `${px}px` }} />;
              })}
            </colgroup>
            {showHeader && (
              <DataTableHeader
                headerGroups={table.getHeaderGroups()}
                loading={bodySkeletonLoading}
                tableHeaderClassName={tableHeaderClassName}
                resizingColumnId={resizingColumnId}
                enableColumnResizing={enableColumnResizing}
                createResizeHandler={handleResizeStart}
                columnSizing={effectiveColumnSizing}
                headerSticky={headerSticky}
                flexColumnId={flexColumnId}
                tableLayout={
                  enableColumnResizing && isResizing
                    ? 'fixed'
                    : shouldUseDynamicFit
                      ? tableLayout
                      : tableLayout || 'auto'
                }
                columnFilterOptions={columnFilterOptions}
                activeColumnFilters={activeColumnFilters}
                onColumnFilterApply={onColumnFilterApply}
                onColumnFilterClear={onColumnFilterClear}
                columnToFieldMap={columnToFieldMap}
                fieldValueLabels={fieldValueLabels}
                columnHeaderFilterRenderers={columnHeaderFilterRenderers}
                columnGroupOptions={columnGroupOptions}
                activeGroupBy={activeGroupBy}
                onToggleGroupBy={onToggleGroupBy}
                groupByIconPlacement={groupByIconPlacement}
              />
            )}
            <DataTableBody
              table={table as any}
              rows={rows as any}
              virtualizer={virtualizer}
              parentRef={parentRef as React.RefObject<HTMLDivElement>}
              shouldVirtualize={shouldVirtualize}
              loading={bodySkeletonLoading}
              noData={noData}
              columns={finalColumns as any}
              onRowClick={onRowClick}
              rowClassName={rowClassName}
              renderExpandedRow={renderExpandedRow}
              enableDragDrop={enableDragDrop}
              dragDropTableId={dragDropTableId}
              Droppable={Droppable}
              Draggable={Draggable}
              columnSizing={effectiveColumnSizing}
              resizingColumnId={resizingColumnId}
              parentChildConnector={parentChildConnector}
              connectorLeftOffset={connectorLeftOffset}
              parentChildConnectorElbowOffset={parentChildConnectorElbowOffset}
              skeletonAvatarColumns={skeletonAvatarColumns}
              skeletonAvatarProps={skeletonAvatarProps}
              pageSize={pageSize}
              total={total}
              customNoDataIcon={customNoDataIcon}
              groupedMode={groupedMode}
              groupedData={groupedData}
              entityType={entityType}
              groupByFields={groupByFields}
              skeletonRowMultiple={skeletonRowMultiple}
              tableProgressFilter={tableProgressFilter}
              search={search}
              loadingRowSize={loadingRowSize}
            />
            {table.getFooterGroups().length > 0 && (
              <Table.TFoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <Table.Tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => {
                      // @ts-expect-error: 'style' is not typed in ColumnMeta
                      const columnStyle = header.column.columnDef.meta?.style || {};
                      const columnWidth =
                        effectiveColumnSizing[header.id] || header.getSize() || 150;

                      return (
                        <Table.Th
                          key={header.id}
                          colSpan={header.colSpan}
                          // className="bg-gray-50 font-bold border-t-2 border-gray-300"
                          style={{
                            ...columnStyle,
                            width: columnWidth,
                            minWidth: header.column.columnDef.minSize || 10,
                            maxWidth: header.column.columnDef.maxSize || 1000,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.footer, header.getContext())}
                        </Table.Th>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.TFoot>
            )}
          </Table>
        </div>
      </div>

      {showPagination && total > 10 && !groupedMode && (
        // Hide pagination when groupedMode is true - it's shown in CommonActionBar instead
        <DataTablePagination
          pageSize={pageSize}
          pageIndex={pageIndex}
          total={total}
          remainingData={remainingData}
          pageSizes={pageSizes}
          instanceId={instanceId}
          loading={loading}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          resetSelected={resetSelected}
        />
      )}
    </div>
  );
}

