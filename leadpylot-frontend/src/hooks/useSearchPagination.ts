/* eslint-disable @typescript-eslint/no-unused-vars */
import { useLeads } from '@/services/hooks/useLeads';
import { GetAllLeadsResponse } from '@/services/LeadsService';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

interface SearchAndPaganationProps {
  total?: number;
  page?: number;
  pageSize?: number;
  onPaginationChange?: React.Dispatch<React.SetStateAction<number>>;
  onPageSizeChange?: React.Dispatch<React.SetStateAction<number>>;
}

export const useSearchAndPaganation = ({
  total: externalTotal,
  page: externalPage,
  pageSize: externalPageSize,
  onPaginationChange: externalOnPaginationChange,
  onPageSizeChange: externalOnPageSizeChange,
}: SearchAndPaganationProps = {}) => {
  const searchParams = useSearchParams();
  const search = searchParams.get('search');
  const showInactive = searchParams.get('showInactive') === 'true';
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);
  const page = externalPage !== undefined ? externalPage : internalPage;
  const pageSize = externalPageSize !== undefined ? externalPageSize : internalPageSize;
  const setPage = externalOnPaginationChange || setInternalPage;
  const setPageSize = externalOnPageSizeChange || setInternalPageSize;

  // Get status from URL params and convert to number if it exists
  const statusParam = searchParams.get('status');
  const totalParam = searchParams.get('total');
  const parsedStatus = statusParam ? parseInt(statusParam, 10) : undefined;
  const parsedTotal = totalParam ? parseInt(totalParam, 10) : 0;
  // Initialize filter data from URL params, but only if total > 0
  const [filterData, setFilterData] = useState<number | undefined>(
    parsedTotal && parsedTotal > 0 ? parsedStatus : undefined
  );
  //   // Data fetching
  //   const {
  //     data: leadsData,
  //     isLoading,
  //     isRefetching,
  //     refetch,
  //   } = useLeads<GetAllLeadsResponse>({
  //     page,
  //     // If total parameter is provided and greater than 0, use it as the limit
  //     limit: parsedTotal && parsedTotal > 0 ? parsedTotal : pageSize,
  //     search: search || undefined,
  //   });

  const { onAppendQueryParams } = useAppendQueryParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    fileInputRef,
    onAppendQueryParams,
    search,
    parsedTotal,
    showInactive,
  };
};
