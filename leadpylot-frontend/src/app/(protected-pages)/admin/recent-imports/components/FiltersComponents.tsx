'use client';
import DebouceInput from '@/components/shared/DebouceInput';

import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Dropdown from '@/components/ui/Dropdown';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Import } from '@/services/LeadsService';
import { ColumnDef } from '@tanstack/react-table';
import React from 'react';
interface RecentImportFiltersComponentsProps {
  selectedLeads: string[];
  handleClearSelection: () => void;
  onAppendQueryParams: (params: Record<string, string>) => void;
  allColumns: ColumnDef<Import, any>[];
  getColumnKey: (column: ColumnDef<Import, any>) => string | undefined;
  getColumnDisplayLabel: (column: ColumnDef<Import, any>) => string;
  handleColumnVisibilityChange: (columnKey: string, isVisible: boolean) => void;
  columnVisibility: Record<string, boolean>;
}
const RecentImportFiltersComponents = ({
  selectedLeads,
  handleClearSelection,
  onAppendQueryParams,
  allColumns,
  getColumnKey,
  getColumnDisplayLabel,
  handleColumnVisibilityChange,
  columnVisibility,
}: RecentImportFiltersComponentsProps) => {
  return (
    <div>
      <div className="my-4 flex items-center gap-2">
        {selectedLeads?.length > 0 && (
          <Button
            variant="secondary"
            className="cursor-default"
            icon={<ApolloIcon name="cross" className="text-lg" />}
            onClick={handleClearSelection}
          >
            {selectedLeads?.length} {selectedLeads?.length === 1 ? 'item' : 'items'} selected
          </Button>
        )}
        <DebouceInput
          prefix={<ApolloIcon name="search" className="text-md" />}
          placeholder="Search Leads"
          onChange={(e) => {
            onAppendQueryParams({
              search: e.target.value,
            });
          }}
          defaultValue={''}
          className=""
          wait={750}
        />
        <Dropdown
          renderTitle={
            <Button icon={<ApolloIcon name="eye-slash" className="text-lg" />}>
              Visible Columns
            </Button>
          }
        >
          {allColumns
            ?.filter((col) => {
              const key = getColumnKey(col);
              return key && !['checkbox', 'action']?.includes(key);
            })
            ?.map((col) => {
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

export default RecentImportFiltersComponents;
