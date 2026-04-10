import React, { useMemo } from 'react';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';

interface DataTablePaginationProps {
  pageSize: number;
  pageIndex: number;
  total: number;
  remainingData: number;
  pageSizes: number[];
  instanceId: string;
  loading?: boolean;
  onPaginationChange?: (page: number) => void;
  onSelectChange?: (num: number) => void;
  resetSelected: () => void;
}

export function DataTablePagination({
  pageSize,
  pageIndex,
  total,
  remainingData,
  pageSizes,
  instanceId,
  loading,
  onPaginationChange,
  onSelectChange,
  resetSelected,
}: DataTablePaginationProps) {
  const handlePaginationChange = (page: number) => {
    if (!loading) {
      resetSelected();
      onPaginationChange?.(page);
    }
  };

  const handleSelectChange = (value?: number) => {
    if (!loading && value !== undefined) {
      const selectedValue = Number(value);
      const maxValidPage = total > 0 ? Math.ceil(total / selectedValue) : 1;

      if (selectedValue === total || selectedValue === remainingData || pageIndex > maxValidPage) {
        onPaginationChange?.(1);
        onSelectChange?.(selectedValue);
      } else {
        onSelectChange?.(selectedValue);
      }
    }
  };

  const pageSizeOption = useMemo(() => {
    const options: Array<{ value: number; label: string }> = [];
    const standardPageSizes = [10, 20, 50, 100, 200, 500, 1000];
    const validStandardSizes = standardPageSizes.filter((size) => size <= total);

    validStandardSizes.forEach((size) => {
      options.push({ value: size, label: `${size} / page` });
    });

    const validPropSizes = pageSizes.filter((size) => {
      if (size === total) return false;
      if (validStandardSizes.includes(size)) return false;
      return size <= total;
    });

    validPropSizes.forEach((size) => {
      options.push({ value: size, label: `${size} / page` });
    });

    const maxStandardSize = validStandardSizes.length > 0 ? Math.max(...validStandardSizes) : 0;

    if (remainingData > maxStandardSize && remainingData < total && remainingData > 0) {
      options.push({ value: remainingData, label: `${remainingData} / page` });
    }

    if (total > 0 && !options.some((opt) => opt.value === total)) {
      options.push({ value: total, label: `${total} / page` });
    }

    return Array.from(new Map(options.map((opt) => [opt.value, opt])).values()).sort(
      (a, b) => a.value - b.value
    );
  }, [pageSizes, remainingData, total]);

  if (total <= 10) return null;

  return (
    <div
      className="flex items-center justify-between border-t border-gray-200 bg-white py-2 shadow-sm"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 5,
        flexShrink: 0,
      }}
    >
      <Pagination
        pageSize={pageSize}
        currentPage={pageIndex}
        total={total}
        onChange={handlePaginationChange}
      />
      <div style={{ minWidth: 130 }}>
        <Select
          key={`page-size-select-${pageIndex}-${pageSize}-${total}-${remainingData}`}
          instanceId={instanceId}
          size="sm"
          menuPlacement="top"
          isSearchable={false}
          value={pageSizeOption?.find?.((option) => option?.value === pageSize) || null}
          options={pageSizeOption}
          onChange={(option) => handleSelectChange(option?.value)}
        />
      </div>
    </div>
  );
}
