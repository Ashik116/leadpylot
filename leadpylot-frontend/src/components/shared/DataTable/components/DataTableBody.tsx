import React, { Fragment } from 'react';
import { Row } from '@tanstack/react-table';
import { Virtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import Table from '@/components/ui/Table';
import FileNotFound from '@/assets/svg/FileNotFound';
import { ColumnDef } from '../types';
import { TableRowSkeleton } from '../../loaders';
import { DataTableRow } from './DataTableRow';
import GroupSummary from '@/components/groupAndFiltering/GroupSummary';
import { GroupSummary as GroupSummaryType } from '@/stores/universalGroupingFilterStore';

const { Tr, Td, TBody } = Table;

interface DataTableBodyProps<T> {
  table: any;
  rows: Row<T>[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  parentRef: React.RefObject<HTMLDivElement>;
  shouldVirtualize: boolean;
  loading?: boolean;
  noData?: boolean;
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: Row<T>) => void;
  rowClassName?: string | ((row: Row<T>) => string);
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;
  enableDragDrop?: boolean;
  dragDropTableId?: string;
  Droppable?: any;
  Draggable?: any;
  columnSizing: Record<string, number>;
  resizingColumnId?: string | null;
  parentChildConnector?: boolean;
  connectorLeftOffset?: number;
  parentChildConnectorElbowOffset?: number;
  skeletonAvatarColumns?: number[];
  skeletonAvatarProps?: any;
  pageSize?: number;
  total?: number;
  customNoDataIcon?: React.ReactNode;
  // Grouped mode props
  groupedMode?: boolean;
  groupedData?: GroupSummaryType[];
  entityType?: string;
  groupByFields?: string[];
  skeletonRowMultiple?: number;
  tableProgressFilter?: string;
  search?: string | null; // Search term from ActionBar
  loadingRowSize?: number;
}

export function DataTableBody<T>({
  table,
  rows,
  virtualizer,
  parentRef,
  shouldVirtualize,
  loading,
  noData,
  columns,
  onRowClick,
  rowClassName,
  renderExpandedRow,
  enableDragDrop,
  dragDropTableId,
  Droppable,
  Draggable,
  columnSizing,
  resizingColumnId,
  parentChildConnector,
  connectorLeftOffset = 0,
  parentChildConnectorElbowOffset = 24,
  skeletonAvatarColumns,
  skeletonAvatarProps,
  pageSize,
  total,
  customNoDataIcon,
  groupedMode = false,
  groupedData,
  entityType,
  groupByFields,
  skeletonRowMultiple,
  tableProgressFilter,
  search,
  loadingRowSize,
}: DataTableBodyProps<T>) {
  const virtualItems = virtualizer.getVirtualItems();

  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - (virtualItems[virtualItems.length - 1]?.end || 0) : 0;

  // Render grouped mode - takes precedence over normal rendering
  if (groupedMode && groupedData) {
    return (
      <TBody
        className="overflow-y-auto"
        style={{
          maxHeight: '100%',
          height: 'auto',
        }}
      >
        {loading ? (
          <TableRowSkeleton
            columns={columns.length}
            rows={55}
            avatarInColumns={skeletonAvatarColumns}
            avatarProps={skeletonAvatarProps}
          />
        ) : groupedData.length === 0 ? (
          <Tr>
            <Td className="hover:bg-transparent" colSpan={columns.length}>
              <div className="flex flex-col items-center gap-4">
                {customNoDataIcon ? (
                  customNoDataIcon
                ) : (
                  <>
                    <FileNotFound />
                    <span className="font-semibold">No groups found!</span>
                  </>
                )}
              </div>
            </Td>
          </Tr>
        ) : (
          <>
            {groupedData.map((group) => (
              <GroupSummary
                key={group.groupId}
                group={group}
                columns={columns}
                entityType={entityType}
                onRowClick={(row) => {
                  // Convert row to Row<T> format if needed
                  const mockRow = {
                    original: row,
                    id: row._id || String(Math.random()),
                  } as Row<T>;
                  onRowClick?.(mockRow);
                }}
                groupByFields={groupByFields}
                tableProgressFilter={tableProgressFilter}
                search={search}
              />
            ))}
          </>
        )}
      </TBody>
    );
  }

  // Drag and drop rendering logic
  if (enableDragDrop && Droppable && dragDropTableId && !noData && !loading) {
    return (
      <Droppable droppableId={dragDropTableId}>
        {(provided: any, snapshot: any) => (
          <TBody
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={classNames('overflow-y-auto', snapshot.isDraggingOver && 'drop-zone-active')}
            style={{
              maxHeight: '100%',
              height: 'auto',
              minHeight: '350px',
              position: 'relative',
              paddingBottom: '20px',
            }}
          >
            {(shouldVirtualize
              ? virtualItems
              : rows.map((_, index) => ({ index, key: `row-${index}` }))
            ).map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              const actualIndex = virtualRow.index;
              const rowData = (row.original || row) as any;
              const draggableId = `${dragDropTableId}-${actualIndex}-item-data-${JSON.stringify(rowData)}`;

              if (Draggable) {
                return (
                  <Draggable key={row.id} draggableId={draggableId} index={actualIndex}>
                    {(provided: any, snapshot: any) => (
                      <DataTableRow
                        row={row}
                        index={virtualRow.index}
                        measureRef={shouldVirtualize ? virtualizer.measureElement : undefined}
                        onRowClick={onRowClick}
                        rowClassName={rowClassName}
                        renderExpandedRow={renderExpandedRow}
                        columnSizing={columnSizing}
                        resizingColumnId={resizingColumnId}
                        parentChildConnector={parentChildConnector}
                        connectorLeftOffset={connectorLeftOffset}
                        parentChildConnectorElbowOffset={parentChildConnectorElbowOffset}
                        draggableProps={provided.draggableProps}
                        dragHandleProps={provided.dragHandleProps}
                        innerRef={provided.innerRef}
                        isDragging={snapshot.isDragging}
                        style={provided.draggableProps.style}
                      />
                    )}
                  </Draggable>
                );
              }
              return (
                <DataTableRow
                  key={row.id}
                  row={row}
                  index={virtualRow.index}
                  measureRef={shouldVirtualize ? virtualizer.measureElement : undefined}
                  onRowClick={onRowClick}
                  rowClassName={rowClassName}
                  renderExpandedRow={renderExpandedRow}
                  columnSizing={columnSizing}
                  resizingColumnId={resizingColumnId}
                  parentChildConnector={parentChildConnector}
                  connectorLeftOffset={connectorLeftOffset}
                  parentChildConnectorElbowOffset={parentChildConnectorElbowOffset}
                />
              );
            })}
            {provided.placeholder}
          </TBody>
        )}
      </Droppable>
    );
  }

  const renderSkeleton = () => {
    return (
      <TableRowSkeleton
        columns={skeletonRowMultiple ? skeletonRowMultiple * 10 : columns.length || 10}
        rows={loadingRowSize || 55}
        avatarInColumns={skeletonAvatarColumns}
        avatarProps={skeletonAvatarProps}
      />
    );
  };

  return (
    <TBody
      className="overflow-y-auto"
      style={{
        maxHeight: '100%',
        height: 'auto',
      }}
    >
      {loading ? (
        renderSkeleton()
      ) : noData ? (
        <Tr>
          <Td className="hover:bg-transparent" colSpan={columns.length}>
            <div className="flex flex-col items-center gap-4">
              {customNoDataIcon ? (
                customNoDataIcon
              ) : (
                <>
                  <FileNotFound />
                  <span className="font-semibold">No data found!</span>
                </>
              )}
            </div>
          </Td>
        </Tr>
      ) : (
        <>
          {shouldVirtualize && paddingTop > 0 && (
            <Tr>
              <Td
                colSpan={columns.length}
                style={{ height: `${paddingTop}px`, padding: 0, border: 0 }}
              />
            </Tr>
          )}

          {(shouldVirtualize
            ? virtualItems
            : rows.map((_, index) => ({ index, key: `row-${index}` }))
          ).map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <DataTableRow
                key={row.id}
                row={row}
                index={virtualRow.index}
                measureRef={shouldVirtualize ? virtualizer.measureElement : undefined}
                onRowClick={onRowClick}
                rowClassName={rowClassName}
                renderExpandedRow={renderExpandedRow}
                columnSizing={columnSizing}
                resizingColumnId={resizingColumnId}
                parentChildConnector={parentChildConnector}
                connectorLeftOffset={connectorLeftOffset}
                parentChildConnectorElbowOffset={parentChildConnectorElbowOffset}
              />
            );
          })}
          {shouldVirtualize && paddingBottom > 0 && (
            <Tr>
              <Td
                colSpan={columns.length}
                style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }}
              />
            </Tr>
          )}
        </>
      )}
    </TBody>
  );
}
