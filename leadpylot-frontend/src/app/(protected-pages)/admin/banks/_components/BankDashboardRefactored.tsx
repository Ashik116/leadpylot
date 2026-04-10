// 'use client';

// import BaseTable from '@/components/shared/BaseTable/BaseTable';
// import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
// import { ColumnDef } from '@/components/shared/DataTable';
// import LogoPreview from '@/components/shared/LogoPreview/LogoPreview';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import Badge from '@/components/ui/Badge';
// import Button from '@/components/ui/Button';
// import { useBanks } from '@/services/hooks/useSettings';
// import { apiDeleteBank, apiGetBanks, Bank } from '@/services/SettingsService';
// import classNames from 'classnames';
// import Link from 'next/link';
// import { usePathname, useRouter, useSearchParams } from 'next/navigation';
// import { useMemo, useEffect } from 'react';
// import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
// import { useSetBackUrl } from '@/hooks/useSetBackUrl';
// import { useBanksNavigationStore } from '@/stores/navigationStores';

// const BankDashboardRefactored = () => {
//   const pathname = usePathname();
//   useSetBackUrl(pathname);
//   const router = useRouter();

//   // Pagination state management
//   const searchParams = useSearchParams();
//   const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
//   const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
//   const sortBy = searchParams.get('sortBy') || undefined;
//   const sortOrder = searchParams.get('sortOrder') || undefined;
//   // Fetch banks data
//   const { data: banksResponse, isLoading } = useBanks({
//     page: pageIndex,
//     limit: pageSize,
//     search: searchParams.get('search') || '',
//     sortBy: sortBy || undefined,
//     sortOrder: sortOrder || undefined,
//   });

//   // Define columns for DataTable
//   const columns: ColumnDef<Bank>[] = useMemo(
//     () => [
//       {
//         id: 'state',
//         header: 'Status',
//         accessorKey: 'state',
//         enableSorting: true,
//         cell: (props) => (
//           <div>
//             <Badge
//               className={classNames(
//                 'block w-14 text-center',
//                 props.row.original.state === 'active' ? 'bg-evergreen' : 'bg-rust'
//               )}
//               content={props.row.original.state}
//             />
//           </div>
//         ),
//       },
//       {
//         id: 'logo',
//         header: 'Logo',
//         accessorKey: 'logo',
//         enableSorting: false,
//         cell: (props) => {
//           return (
//             <LogoPreview
//               attachmentId={props.row.original.logo}
//               size="md"
//               alt={`${props.row.original.name} Logo`}
//             />
//           );
//         },
//       },
//       {
//         id: 'name',
//         header: 'Name',
//         accessorKey: 'name',
//         enableSorting: true,
//       },
//       {
//         id: 'details',
//         header: 'Details',
//         cell: (props) => (
//           <div>
//             {props.row.original.country}
//             <br />
//             <strong>LEI:</strong> {props.row.original.lei_code}
//           </div>
//         ),
//       },
//       {
//         id: 'limits',
//         header: 'Limits',
//         cell: (props) => (
//           <div>
//             <strong>Min:</strong> {props.row.original.min_limit}
//             <br />
//             <strong>Max:</strong> {props.row.original.max_limit}
//           </div>
//         ),
//       },
//       {
//         id: 'actions',
//         header: 'Actions',
//         cell: (props) => (
//           <div className="flex items-center gap-2">
//             <Button
//               variant="plain"
//               size="xs"
//               className="text-gray-500 hover:text-blue-700"
//               icon={<ApolloIcon name="pen" className="text-md" />}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 router.push(`/admin/banks/${props.row.original._id}`);
//               }}
//             />
//           </div>
//         ),
//       },
//     ],
//     [router]
//   );

//   // Populate navigation store with banks data
//   useEffect(() => {
//     if (banksResponse?.data) {
//       const addItems = useBanksNavigationStore.getState().addItems;
//       addItems(banksResponse.data);

//       // Set total banks count if available
//       if (banksResponse.meta?.total) {
//         const setTotalItems = useBanksNavigationStore.getState().setTotalItems;
//         setTotalItems(banksResponse.meta.total);
//       }
//     }
//   }, [banksResponse]);

//   const { selected: selectedBanks, handleSelectAll: handleSelectAllBank } = useSelectAllApi({
//     apiFn: apiGetBanks,
//     apiParams: {
//       page: pageIndex,
//       limit: pageSize,
//       search: searchParams.get('search') || '',
//       sortBy: sortBy || undefined,
//       sortOrder: sortOrder || undefined,
//     },
//     total: banksResponse?.meta?.total || 0,
//     returnFullObjects: true,
//   });
//   // BaseTable configuration
//   const tableConfig = useBaseTable({
//     tableName: 'banks',
//     data: banksResponse?.data || [],
//     loading: isLoading,
//     totalItems: banksResponse?.meta?.total || 0,
//     isBackendSortingReady: true,
//     pageIndex,
//     pageSize,
//     columns,

//     search: searchParams.get('search') || '',
//     // tableClassName: 'max-h-[60dvh]',
//     selectable: true,
//     returnFullObjects: true,
//     bulkActionsConfig: {
//       entityName: 'banks',
//       deleteUrl: '/banks/',
//       invalidateQueries: ['banks'],
//       singleDeleteConfig: {
//         deleteFunction: apiDeleteBank,
//       },
//     },
//     extraActions: (
//       <Link href="/admin/banks/create">
//         <Button variant="solid" icon={<ApolloIcon name="plus" className="text-md" />}>
//           Create Bank Account
//         </Button>
//       </Link>
//     ),
//     onRowClick: (row) => router.push(`/admin/banks/${row._id}`),
//     rowClassName: 'cursor-pointer hover:bg-gray-50',
//     selectedRows: selectedBanks,
//     onSelectAll: handleSelectAllBank,
//   });

//   return (
//     <div className="mx-2 flex flex-col gap-4 xl:mx-0">
//       <div className="relative z-10">
//         <BaseTable {...tableConfig} />
//       </div>
//     </div>
//   );
// };

// export default BankDashboardRefactored;
