import React, { Fragment, memo } from 'react';
import { flexRender, Row } from '@tanstack/react-table';
import classNames from 'classnames';
import Table from '@/components/ui/Table';

const { Tr, Td } = Table;

interface DataTableRowProps<T> {
  row: Row<T>;
  index: number;
  measureRef?: (node: Element | null) => void;
  onRowClick?: (row: Row<T>) => void;
  rowClassName?: string | ((row: Row<T>) => string);
  renderExpandedRow?: (row: Row<T>) => React.ReactNode | null;
  columnSizing: Record<string, number>;
  resizingColumnId?: string | null;
  parentChildConnector?: boolean;
  connectorLeftOffset?: number;
  parentChildConnectorElbowOffset?: number;
  // Drag and drop props
  draggableProps?: any;
  dragHandleProps?: any;
  innerRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

function DataTableRowComponent<T>({
  row,
  index,
  measureRef,
  onRowClick,
  rowClassName,
  renderExpandedRow,
  columnSizing,
  resizingColumnId,
  parentChildConnector,
  connectorLeftOffset = 0,
  parentChildConnectorElbowOffset = 24,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  style,
}: DataTableRowProps<T>) {
  const expandedContent = renderExpandedRow ? renderExpandedRow(row) : null;

  // Combine refs if both are present
  const combinedRef = (node: HTMLTableRowElement | null) => {
    if (innerRef) innerRef(node);
    if (measureRef) measureRef(node);
  };

  return (
    <Fragment>
      <Tr
        data-index={index}
        ref={combinedRef}
        className={classNames(
          typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
          isDragging ? 'border-2 border-blue-500 bg-blue-100 opacity-30' : 'hover:bg-gray-50',
          draggableProps
            ? 'cursor-grab transition-all duration-200 active:cursor-grabbing'
            : 'cursor-pointer'
        )}
        onClick={() => onRowClick?.(row)}
        {...draggableProps}
        {...dragHandleProps}
        style={style}
      >
        {row.getVisibleCells().map((cell) => {
          // @ts-expect-error: meta.style is not typed in ColumnMeta
          const columnStyle = cell.column.columnDef.meta?.style || {};
          const isSelectOrCheckboxColumn =
            cell.column.id === 'select' || cell.column.id === 'checkbox';

          const columnWidth = columnSizing[cell.column.id] || cell.column.getSize() || 150;
          const minSize = cell.column.columnDef.minSize ?? 10;
          const maxSize = cell.column.columnDef.maxSize ?? 1000;
          const checkboxWidths = isSelectOrCheckboxColumn
            ? { width: columnWidth, minWidth: minSize, maxWidth: maxSize }
            : null;

          const cellStyle = isSelectOrCheckboxColumn
            ? {
              position: 'sticky' as const,
              left: 0,
              background: 'white',
              zIndex: 10,
              ...columnStyle,
              ...checkboxWidths,
            }
            : columnStyle;

          const cellInner = flexRender(cell.column.columnDef.cell, cell.getContext());

          return (
            <Td
              key={cell.id}
              className={classNames(
                'hover:bg-btn-netto1/30 relative text-sm',
                resizingColumnId === cell.column.id && 'resizing-column',
                isSelectOrCheckboxColumn && ' overflow-hidden'
              )}
              style={cellStyle}
            >
              {isSelectOrCheckboxColumn ? (
                <div className="w-full min-w-0">{cellInner}</div>
              ) : (
                <div className="truncate">{cellInner}</div>
              )}
            </Td>
          );
        })}
      </Tr>
      {expandedContent && (
        <Tr className="expanded-row border-none">
          <Td colSpan={row.getVisibleCells().length} className="border-none p-0">
            <div className="relative">
              {parentChildConnector && (
                <div
                  className="pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: connectorLeftOffset,
                    top: -6,
                    height: parentChildConnectorElbowOffset + 6,
                    width: 36,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: -30,
                      top: -6,
                      height: parentChildConnectorElbowOffset + 6,
                      width: 2,
                      background: '#e5e7eb',
                      display: 'block',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: -28,
                      top: parentChildConnectorElbowOffset,
                      height: 2,
                      width: 36,
                      background: '#e5e7eb',
                      display: 'block',
                    }}
                  />
                </div>
              )}
              {expandedContent}
            </div>
          </Td>
        </Tr>
      )}
    </Fragment>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const DataTableRow = memo(DataTableRowComponent) as typeof DataTableRowComponent;
