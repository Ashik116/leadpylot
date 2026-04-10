// Sort data locally if backend sorting is not ready

import { useMemo, useState } from 'react';

const useFrontendSorting = ({
  data,
  columns,
  isBackendSortingReady,
}: {
  data: any;
  columns: any[];
  isBackendSortingReady?: boolean;
}) => {
  const [localSort, setLocalSort] = useState<{ key: string; order: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    if (!localSort || !data.length || !isBackendSortingReady) return data;

    const column = columns.find(
      (col) => col.id === localSort.key || (col as any).accessorKey === localSort.key
    );

    const sortType = (column as any)?.sortType;

    return [...data].sort((a, b) => {
      const aValue = a[localSort.key];
      const bValue = b[localSort.key];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      switch (sortType) {
        case 'date':
          const dateA = new Date(aValue).getTime();
          const dateB = new Date(bValue).getTime();
          return localSort.order === 'asc' ? dateA - dateB : dateB - dateA;

        case 'priority':
          const priorityOrder = ['High', 'Medium', 'Low'];
          const aRank = priorityOrder.indexOf(aValue);
          const bRank = priorityOrder.indexOf(bValue);
          return localSort.order === 'asc' ? aRank - bRank : bRank - aRank;

        default:
          if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
            return localSort.order === 'asc'
              ? Number(aValue) - Number(bValue)
              : Number(bValue) - Number(aValue);
          }
          return localSort.order === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
      }
    });
  }, [localSort, data, isBackendSortingReady, columns]);
  return {
    sortedData,
    setLocalSort,
  };
};

export default useFrontendSorting;
