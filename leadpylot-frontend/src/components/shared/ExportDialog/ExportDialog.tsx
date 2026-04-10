import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ColumnDef } from '@tanstack/react-table';
import { useExportDataStore } from '@/stores/exportDataStore';
import { getAllExportFields, getAdditionalExportFields } from '@/configs/exportFields.config';
import classNames from '@/utils/classNames';
import DebouceInput from '../DebouceInput';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef<any, any>[];
  tableName: string;
  selectedItems: string[];
  onExport: (selectedColumns: string[], format: string, filename: string) => void;
}

// Column key helper
const getColumnKey = (column: ColumnDef<any, any>): string | undefined => {
  if (column?.id) return column?.id;
  if ('accessorKey' in column && typeof column?.accessorKey === 'string') {
    return column?.accessorKey;
  }
  return undefined;
};

// Column display label helper
const getColumnDisplayLabel = (column: ColumnDef<any, any>): string => {
  if (typeof column?.header === 'string') return column?.header;
  if (typeof column?.header === 'function') {
    const headerResult = (column as any)?.header();
    if (headerResult?.props?.children) return headerResult?.props?.children;
    return column?.id || 'Column';
  }
  if ('accessorKey' in column && typeof column?.accessorKey === 'string') {
    return column?.accessorKey
      ?.split('_')
      ?.map((word: string) => word?.charAt(0).toUpperCase() + word?.slice(1))
      ?.join(' ');
  }
  if (column?.id) {
    return column?.id?.charAt(0)?.toUpperCase() + column?.id?.slice(1);
  }
  return 'Unnamed Column';
};

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  columns,
  tableName,
  selectedItems,
  onExport,
}) => {
  // State management
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [filename, setFilename] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Store integration
  const { getFilteredExportData, setSelectedColumns: setStoreSelectedColumns } =
    useExportDataStore();
  const filteredData = getFilteredExportData();
  // DEBUG: Log on every render when dialog is open (runs immediately, not in useEffect)
  if (isOpen) {
    // eslint-disable-next-line no-console
    console.warn('[ExportDialog] OPEN - tableName:', tableName, 'filteredData rows:', filteredData?.length ?? 0, 'selectedItems count:', selectedItems?.length ?? 0, '| full filteredData:', filteredData);
  }
  // Memoized export fields
  const allExportFields = useMemo(() => {
    // For offers, use only the export fields configuration, not the table columns
    if (tableName === 'offers') {
      const additionalFields = getAdditionalExportFields(tableName);
      return additionalFields?.map((field: any) => ({ ...field, isAdditional: false }));
    }

    // For other pages, use the regular combination of columns + additional fields
    const regularColumns = columns
      ?.filter((col: any) => {
        const key = getColumnKey(col);
        return key && !['checkbox', 'action', 'expander']?.includes(key);
      })
      ?.map((col: any) => {
        const key = getColumnKey(col)!;
        const label = getColumnDisplayLabel(col);
        return { key, label, isAdditional: false };
      });
    const allFields = getAllExportFields(tableName, regularColumns);

    // Deduplicate fields by key - keep the first occurrence (regular columns take precedence)
    const seenKeys = new Set<string>();
    const deduplicatedFields: any[] = [];

    for (const field of allFields) {
      if (!seenKeys.has(field.key)) {
        seenKeys.add(field.key);
        deduplicatedFields.push(field);
      }
    }

    return deduplicatedFields;
  }, [columns, tableName]);

  // Filtered fields based on search
  const filteredFields = useMemo(() => {
    if (!debouncedSearch?.trim()) return allExportFields;
    return allExportFields?.filter(
      (field: any) =>
        field?.label?.toLowerCase()?.includes(debouncedSearch?.toLowerCase()) ||
        field?.key?.toLowerCase()?.includes(debouncedSearch?.toLowerCase())
    );
  }, [allExportFields, debouncedSearch]);

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      const allColumnKeys = allExportFields?.map((col: any) => col?.key);
      setSelectedColumns(allColumnKeys);
      setStoreSelectedColumns(allColumnKeys);
      setFilename(`${tableName}_export_${new Date()?.toISOString()?.split('T')[0]}`);
      setSearchTerm('');
    }
  }, [isOpen, tableName, allExportFields, setStoreSelectedColumns]);

  // Event handlers
  const handleColumnToggle = useCallback(
    (columnKey: string, isChecked: boolean) => {
      const newSelectedColumns = isChecked
        ? [...selectedColumns, columnKey]
        : selectedColumns?.filter((key) => key !== columnKey);
      setSelectedColumns(newSelectedColumns);
      setStoreSelectedColumns(newSelectedColumns);
    },
    [selectedColumns, setStoreSelectedColumns]
  );

  const handleSelectAll = useCallback(() => {
    const allColumnKeys = allExportFields?.map((col: any) => col?.key);
    setSelectedColumns(allColumnKeys);
    setStoreSelectedColumns(allColumnKeys);
  }, [allExportFields, setStoreSelectedColumns]);

  const handleDeselectAll = useCallback(() => {
    setSelectedColumns([]);
    setStoreSelectedColumns([]);
  }, [setStoreSelectedColumns]);

  const handleSelectVisible = useCallback(() => {
    const visibleColumnKeys = filteredFields?.map((col: any) => col?.key);
    const newSelectedColumns = [...new Set([...selectedColumns, ...visibleColumnKeys])];
    setSelectedColumns(newSelectedColumns);
    setStoreSelectedColumns(newSelectedColumns);
  }, [filteredFields, selectedColumns, setStoreSelectedColumns]);

  const handleExport = useCallback(async () => {
    if (selectedColumns?.length === 0) return;
    setIsExporting(true);
    try {
      const finalFilename =
        filename?.trim() || `${tableName}_export_${new Date()?.toISOString()?.split('T')[0]}`;
      await onExport(selectedColumns, selectedFormat, finalFilename);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedColumns, selectedFormat, filename, tableName, onExport, onClose]);

  // Format options
  const formatOptions = [
    { value: 'csv', label: 'CSV (.csv)', icon: 'file-text', description: 'Comma-separated values' },
    {
      value: 'xlsx',
      label: 'Excel (.xlsx)',
      icon: 'file-excel',
      description: 'Modern Excel format',
    },
    { value: 'xls', label: 'Excel (.xls)', icon: 'file-excel', description: 'Legacy Excel format' },
  ];

  const selectedCount = selectedColumns?.length;
  const totalCount = allExportFields?.length;
  const visibleCount = filteredFields?.length;

  // Button active state logic
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const noneSelected = selectedCount === 0;
  const visibleSelected =
    filteredFields?.length > 0 &&
    filteredFields?.every((f: any) => selectedColumns?.includes(f?.key)) &&
    !allSelected &&
    !noneSelected;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={900}>
      <div className="space-y-1 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-1">
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Export {tableName}</h3>

          <div className="flex items-center gap-2 pr-10">
            <Badge className="rounded-2xl bg-blue-100 px-2 text-blue-800">
              {filteredData?.length} rows
            </Badge>
            <Badge className="rounded-2xl bg-green-100 px-2 text-green-800">
              {selectedCount}/{totalCount} columns
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column - Column Selection */}
          <div className="space-y-2">
            <div className="space-y-2">
              {/* Header of selector columns */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-normal text-gray-900">Select Columns</h4>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    icon={<ApolloIcon name="check" className="mr-1" />}
                    variant={allSelected ? 'secondary' : 'default'}
                    onClick={handleSelectAll}
                  >
                    All
                  </Button>
                  <Button
                    size="xs"
                    icon={<ApolloIcon name="times" />}
                    variant={noneSelected ? 'secondary' : 'default'}
                    onClick={handleDeselectAll}
                  >
                    None
                  </Button>
                  <Button
                    size="xs"
                    icon={<ApolloIcon name="search" />}
                    variant={visibleSelected ? 'secondary' : 'default'}
                    onClick={handleSelectVisible}
                  >
                    Visible
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <DebouceInput
                  prefix={<ApolloIcon name="search" className="text-gray-400 text-xs" />}
                  allowClear={true}
                  type="text"
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Column List */}
            <ColumnList
              filteredFields={filteredFields}
              selectedColumns={selectedColumns}
              handleColumnToggle={handleColumnToggle}
            />
          </div>

          {/* Right Column - Export Settings */}
          <div className="space-y-2">
            {/* Format Selection */}
            <div>
              <h4 className="mb-1 text-xs font-normal text-gray-900">Export Format</h4>
              <div className="flex items-center gap-2">
                {formatOptions?.map((option) => (
                  <label
                    key={option?.value}
                    className={classNames(
                      'flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 transition-all',
                      selectedFormat === option?.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={option?.value}
                      checked={selectedFormat === option?.value}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                    />
                    <span className="text-xs font-medium text-gray-900">
                      {option?.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filename */}
            <div>
              <h4 className="mb-1 text-xs font-normal text-gray-900">File Name : (
                <span className="rounded bg-gray-200 px-1 font-normal text-xs">
                  {filename?.trim() ||
                    `${tableName}_export_${new Date()?.toISOString()?.split('T')[0]}`}.{selectedFormat}
                </span>
                )</h4>
              <div className="space-y-2">
                <Input
                  type="text"
                  size="sm"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder={`${tableName}_export_${new Date().toISOString().split('T')[0]}`}
                  className="w-full text-xs"
                />
              </div>
            </div>

            {/* Preview */}
            {filteredData?.length > 0 && selectedColumns?.length > 0 && (
              <div>
                <h4 className="pb-2 text-xs font-normal text-gray-900">Preview</h4>
                <Card>
                  <div className="min-h-0 shrink-0 max-h-[54dvh] overflow-y-auto">
                    <div className="pb-2 text-xs text-gray-600">
                      <strong>Columns:</strong> {selectedColumns?.join(', ')}
                    </div>
                    {filteredData?.slice(0, 3)?.map((row, index) => (
                      <div key={index} className="mb-2 rounded border bg-gray-50 p-2 text-xs">
                        <div className="mb-1 font-medium text-gray-700">Row {index + 1}:</div>
                        <div className="space-y-1">
                          {Object.entries(row)
                            ?.filter(([key]) => selectedColumns?.includes(key))
                            ?.map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-mono text-gray-800">{String(value)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                    {filteredData?.length > 3 && (
                      <div className="py-2 text-center text-xs text-gray-500 italic">
                        ... and {filteredData?.length - 3} more rows
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex  items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            {visibleCount} of {totalCount} columns shown
            {debouncedSearch && ` (filtered by "${debouncedSearch}")`}
          </div>
          <div className="flex gap-3">
            <Button variant="default" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleExport}
              disabled={selectedColumns?.length === 0 || isExporting}
              loading={isExporting}
              icon={<ApolloIcon name="download" className="text-lg" />}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

const ColumnList = ({
  filteredFields,
  selectedColumns,
  handleColumnToggle,
}: {
  filteredFields: any[];
  selectedColumns: string[];
  handleColumnToggle: (columnKey: string, isChecked: boolean) => void;
}) => {
  if (filteredFields?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <ApolloIcon name="search" className="mb-2 h-10 w-10" />
        <p className="text-base font-semibold">No columns found</p>
        <p className="text-xs">Try adjusting your search or clear the input.</p>
      </div>
    );
  }
  return (
    <Card>
      <div className="space-y-1 min-h-0 shrink-0 max-h-[63dvh] overflow-y-auto">
        {filteredFields?.map((field) => (
          <div
            key={field?.key}
            role="button"
            tabIndex={0}
            onClick={() => handleColumnToggle(field?.key, !selectedColumns?.includes(field?.key))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleColumnToggle(field?.key, !selectedColumns?.includes(field?.key));
              }
            }}
            className={classNames(
              'flex cursor-pointer items-center rounded-lg px-2 py-1 transition-colors',
              selectedColumns?.includes(field?.key)
                ? 'border border-blue-200 bg-blue-50'
                : 'border border-transparent bg-gray-50 hover:bg-gray-100'
            )}
          >
            <div data-column-checkbox className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedColumns?.includes(field?.key)}
                onChange={(isChecked) => handleColumnToggle(field?.key, isChecked)}
                className="mr-3"
              />
            </div>
            <div className="min-w-0 flex-1 flex items-center space-x-2 flex-wrap">
              <div className="flex items-center space-x-1">
                <span className="truncate text-xs font-medium text-gray-900">{field?.label}</span>
                {field.isAdditional && (
                  <Badge className="bg-blue-100 text-xs text-blue-800">Additional</Badge>
                )}
              </div>
              {field?.description && (
                <p className="text-xs text-gray-500">{field?.description}</p>
              )}
              <p className=" font-mono text-xs text-gray-500">{field?.key}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ExportDialog;
