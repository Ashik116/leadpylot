'use client';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dropdown from '@/components/ui/Dropdown';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { OffersImport } from '@/services/LeadsService';
import { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'next/navigation';
import React from 'react';

interface OffersImportFiltersProps {
  onAppendQueryParams: (params: Record<string, string>) => void;
  allColumns: ColumnDef<OffersImport, any>[];
  getColumnKey: (column: ColumnDef<OffersImport, any>) => string | undefined;
  getColumnDisplayLabel: (column: ColumnDef<OffersImport, any>) => string;
  handleColumnVisibilityChange: (columnKey: string, isVisible: boolean) => void;
  columnVisibility: Record<string, boolean>;
}

const OffersImportFilters = ({
  onAppendQueryParams,
  allColumns,
  getColumnKey,
  getColumnDisplayLabel,
  handleColumnVisibilityChange,
  columnVisibility,
}: OffersImportFiltersProps) => {
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || '';

  // Status options for filtering
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div>
      <div className="my-4 flex items-center gap-2">
        <div className="w-48">
          <Select
            options={statusOptions}
            value={statusOptions.find((option) => option.value === currentStatus)}
            onChange={(option) => {
              onAppendQueryParams({
                status: option?.value || '',
                pageIndex: '1', // Reset to first page when filtering
              });
            }}
            placeholder="Filter by status"
          />
        </div>
        <Dropdown
          renderTitle={
            <Button icon={<ApolloIcon name="eye-slash" className="text-lg" />}>
              Visible Columns
            </Button>
          }
        >
          {allColumns
            .filter((col) => {
              const key = getColumnKey(col);
              return key && !['checkbox', 'action'].includes(key);
            })
            .map((col) => {
              const key = getColumnKey(col)!;
              const label = getColumnDisplayLabel(col);
              return (
                <Dropdown.Item key={key} variant="custom">
                  <div className="flex items-center px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!columnVisibility[key]}
                      onChange={(isChecked) => handleColumnVisibilityChange(key, isChecked)}
                      className="mr-2"
                      name={key}
                    />
                    <label htmlFor={key} className="grow cursor-pointer">
                      {label}
                    </label>
                  </div>
                </Dropdown.Item>
              );
            })}
        </Dropdown>
      </div>
    </div>
  );
};

export default OffersImportFilters;
