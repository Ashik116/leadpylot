// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable react-hooks/exhaustive-deps */
// 'use client';

// import { SearchParams } from '@/@types/common';
// import CommonActionBar from '@/components/shared/ActionBar/CommonActionBar';
// import ConfirmDialog from '@/components/shared/ConfirmDialog';
// import DataTable, { ColumnDef, OnSortParam } from '@/components/shared/DataTable';
// import RoleGuard from '@/components/shared/RoleGuard';
// import ApolloIcon from '@/components/ui/ApolloIcon';
// import Button from '@/components/ui/Button';
// import Card from '@/components/ui/Card';
// import Checkbox from '@/components/ui/Checkbox/Checkbox';
// import { Role } from '@/configs/navigation.config/auth.route.config';
// import { useColumnCustomization } from '@/hooks/useColumnCustomization';
// import { useBulkDeleteProjects, useProjects } from '@/services/hooks/useProjects';
// import { Name, Project } from '@/services/ProjectsService';
// import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
// import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
// import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
// import { getPaginationOptions } from '@/utils/paginationNumber';
// import { useSession } from '@/hooks/useSession';
// import dynamic from 'next/dynamic';
// import Link from 'next/link';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { ProjectCardSkeleton } from './_components/ProjectCard';
// const ProjectCard = dynamic(
//   () => import('./_components/ProjectCard').then((mod) => mod.ProjectCard),
//   {
//     ssr: false,
//     loading: () => <ProjectCardSkeleton />,
//   }
// );

// // Create a type that extends Project but explicitly defines name as potentially being a Name object
// interface ExtendedProject extends Omit<Project, 'name'> {
//   name: string | Name;
//   agentsCount?: number;
//   voipserver_name?: string;
//   mailserver_name?: string;
// }

// function ProjectsWrapper({ searchParams }: { searchParams: SearchParams }) {
//   // Selected items store integration
//   const { setSelectedItems, clearSelectedItems } = useSelectedItemsStore();
//   const { setCurrentPageColumns } = useCurrentPageColumnsStore();

//   // Provide default values for searchParams
//   const { pageIndex = '1', pageSize = '50', sortKey = null, order = '' } = searchParams || {};
//   const { data: session } = useSession();
//   const nextSearchParams = useSearchParams();
//   const search = nextSearchParams.get('search');

//   const { data: projects, isLoading } = useProjects({
//     search: search || undefined,
//     role: session?.user?.role,
//   });
//   const { onAppendQueryParams } = useAppendQueryParams();
//   const router = useRouter();

//   // State for bulk actions
//   const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
//   const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
//   const [isColumnOrderDialogOpen, setIsColumnOrderDialogOpen] = useState(false);
//   const customizeButtonRef = useRef<HTMLButtonElement>(null);

//   // Bulk delete mutation
//   const bulkDeleteProjectsMutation = useBulkDeleteProjects();

//   const handlePaginationChange = (page: number) => {
//     onAppendQueryParams({
//       pageIndex: String(page),
//     });
//   };

//   const handleSelectChange = (value: number) => {
//     onAppendQueryParams({
//       pageSize: String(value),
//       pageIndex: '1',
//     });
//   };

//   const handleSort = (sort: OnSortParam) => {
//     onAppendQueryParams({
//       order: sort.order,
//       sortKey: sort.key as string,
//     });
//   };

//   const handleRowClick = (projectId: string) => {
//     if (session?.user.role === 'Admin') {
//       router.push(`/dashboards/projects/${projectId}`);
//     }
//   };

//   // Bulk action handlers
//   const handleClearSelection = () => {
//     setSelectedProjects([]);
//     clearSelectedItems(); // Clear the global store as well
//   };

//   const handleDeleteProjects = async () => {
//     if (selectedProjects.length === 0) return;

//     bulkDeleteProjectsMutation.mutate(selectedProjects, {
//       onSuccess: () => {
//         setDeleteConfirmDialogOpen(false);
//         setSelectedProjects([]);
//         clearSelectedItems(); // Clear the global store
//       },
//     });
//   };

//   const getProjectName = (name: string | Name): string => {
//     if (typeof name === 'string') return name;
//     return name.en_US || '';
//   };

//   // Sort and paginate data
//   const sortedAndPaginatedData = useMemo(() => {
//     if (!Array.isArray(projects)) {
//       if (!projects?.data) return [];

//       // First create a copy to avoid mutating the original data
//       const processedData = [...projects.data] as ExtendedProject[];

//       // Apply sorting if sort key and order are defined
//       if (sortKey && order) {
//         processedData.sort((a, b) => {
//           // Handle name property specially
//           if (sortKey === 'name') {
//             const aName = getProjectName(a.name);
//             const bName = getProjectName(b.name);
//             return order === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
//           }

//           // Handle other properties
//           const aValue = a[sortKey as keyof ExtendedProject];
//           const bValue = b[sortKey as keyof ExtendedProject];

//           // Handle string comparison
//           if (typeof aValue === 'string' && typeof bValue === 'string') {
//             return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
//           }

//           // Handle number comparison
//           if (aValue === bValue) return 0;
//           if (aValue === undefined || aValue === null) return 1;
//           if (bValue === undefined || bValue === null) return -1;

//           return order === 'asc' ? (aValue < bValue ? -1 : 1) : aValue < bValue ? 1 : -1;
//         });
//       }
//       // Apply pagination
//       const startIndex = (Number(pageIndex) - 1) * Number(pageSize);
//       const endIndex = startIndex + Number(pageSize);
//       return processedData.slice(startIndex, endIndex);
//     }
//     return [];
//   }, [projects, pageIndex, pageSize, sortKey, order]);

//   // Handle select all projects toggle
//   const handleSelectAllProjects = useCallback(
//     (visibleProjectIds: string[]) => {
//       const allSelected =
//         visibleProjectIds.length > 0 &&
//         visibleProjectIds.every((id) => selectedProjects.includes(id));

//       let newSelectedProjects: string[];

//       if (allSelected) {
//         newSelectedProjects = selectedProjects.filter((id) => !visibleProjectIds.includes(id));
//       } else {
//         newSelectedProjects = [...selectedProjects];
//         visibleProjectIds.forEach((id) => {
//           if (!newSelectedProjects.includes(id)) {
//             newSelectedProjects.push(id);
//           }
//         });
//       }

//       setSelectedProjects(newSelectedProjects);

//       // Get the full project objects for the selected projects and store in global store
//       const selectedProjectObjects: Record<string, any>[] = [];
//       newSelectedProjects.forEach((projectId) => {
//         const foundProject = sortedAndPaginatedData.find((project) => project._id === projectId);
//         if (foundProject) {
//           selectedProjectObjects.push(foundProject as Record<string, any>);
//         }
//       });

//       // Store the selected items in the global store
//       setSelectedItems(selectedProjectObjects, 'projects');
//     },
//     [selectedProjects]
//   );

//   // Checkbox toggle for single project
//   const handleCheckboxChange = useCallback(
//     (projectId: string, projectData: any) => {
//       const newSelectedProjects = selectedProjects.includes(projectId)
//         ? selectedProjects.filter((id) => id !== projectId)
//         : [...selectedProjects, projectId];

//       setSelectedProjects(newSelectedProjects);

//       // Get the full project objects for the selected projects and store in global store
//       const selectedProjectObjects: Record<string, any>[] = [];
//       newSelectedProjects.forEach((projectId) => {
//         const foundProject = sortedAndPaginatedData.find((project) => project._id === projectId);
//         if (foundProject) {
//           selectedProjectObjects.push(foundProject as Record<string, any>);
//         }
//       });

//       // Store the selected items in the global store
//       setSelectedItems(selectedProjectObjects, 'projects');
//     },
//     [selectedProjects]
//   );

//   const columns: ColumnDef<ExtendedProject>[] = useMemo(() => {
//     const baseColumns: ColumnDef<ExtendedProject>[] = [];

//     // Add checkbox column for Admin users
//     if (session?.user?.role === 'Admin') {
//       baseColumns.push({
//         id: 'checkbox',
//         maxSize: 30,
//         enableResizing: false,
//         header: () => {
//           // Use only the currently visible (paginated) projects
//           const visibleProjectIds = sortedAndPaginatedData?.map((project) => project._id) || [];
//           const allSelected =
//             visibleProjectIds.length > 0 &&
//             visibleProjectIds.every((id) => selectedProjects.includes(id));
//           return (
//             <div className="flex items-center justify-center">
//               <Checkbox
//                 checked={allSelected}
//                 onChange={() => handleSelectAllProjects(visibleProjectIds)}
//                 disabled={isLoading || visibleProjectIds.length === 0}
//               />
//             </div>
//           );
//         },
//         cell: ({ row }) => {
//           const projectId = row.original._id;
//           return (
//             <div
//               className="flex items-center justify-center"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 e.preventDefault();
//               }}
//             >
//               <Checkbox
//                 checked={selectedProjects.includes(projectId)}
//                 onChange={() => handleCheckboxChange(projectId, row.original)}
//                 disabled={isLoading}
//               />
//             </div>
//           );
//         },
//       });
//     }

//     // Add project name column for all users
//     baseColumns.push({
//       header: 'Project Name',
//       accessorKey: 'name',
//       cell: ({ row }) => {
//         return <span>{getProjectName(row.original.name)}</span>;
//       },
//     });

//     // Only add additional columns if user is Admin
//     if (session?.user?.role === 'Admin') {
//       // Add Agents column
//       baseColumns.push({
//         header: 'Agents',
//         accessorKey: 'agentsCount',
//       });

//       // Add VOIP Server column
//       baseColumns.push({
//         header: 'VOIP Server',
//         accessorKey: 'voipserver_name',
//       });

//       // Add Mail Server column
//       baseColumns.push({
//         header: 'Mail Server',
//         accessorKey: 'mailserver_name',
//       });
//     }

//     return baseColumns;
//   }, [selectedProjects, handleSelectAllProjects, sortedAndPaginatedData, isLoading]);

//   // Use the common column customization hook
//   // Use the common column customization hook
//   const { columnVisibility, renderableColumns, handleColumnVisibilityChange } =
//     useColumnCustomization({
//       tableName: 'projects',
//       columns,
//     });

//   useEffect(() => {
//     setCurrentPageColumns(columns, 'projects');
//   }, [columns]);

//   return (
//     <Card>
//       {session?.user?.role !== 'Agent' && (
//         <>
//           <div className="mb-2 flex items-center justify-between">
//             <div>
//               <h1>Projects</h1>
//               <p>
//                 Total projects:{' '}
//                 {Array.isArray(projects) ? projects.length || 0 : projects?.meta?.total || 0}
//               </p>
//             </div>

//             <div>
//               <RoleGuard>
//                 <Link href="/dashboards/projects/create">
//                   <Button variant="solid" icon={<ApolloIcon name="plus" />}>
//                     Create <span className="hidden md:inline">Project</span>
//                   </Button>
//                 </Link>
//               </RoleGuard>
//             </div>
//           </div>
//         </>
//       )}
//       {/* for admin */}
//       <RoleGuard>
//         <CommonActionBar
//           selectedItems={selectedProjects}
//           handleClearSelection={handleClearSelection}
//           onAppendQueryParams={onAppendQueryParams}
//           search={search || ''}
//           allColumns={columns}
//           columnVisibility={columnVisibility}
//           handleColumnVisibilityChange={handleColumnVisibilityChange}
//           setDeleteConfirmDialogOpen={setDeleteConfirmDialogOpen}
//           setIsColumnOrderDialogOpen={setIsColumnOrderDialogOpen}
//           customizeButtonRef={customizeButtonRef}
//           isColumnOrderDialogOpen={isColumnOrderDialogOpen}
//           tableName="projects"
//         />
//       </RoleGuard>

//       <RoleGuard role={Role.AGENT}>
//         {Array.isArray(projects) && projects.length > 0 ? (
//           <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
//             {projects.map((project: any, key: number) => (
//               <div key={key}>
//                 <ProjectCard projectData={project} />
//               </div>
//             ))}
//           </div>
//         ) : (
//           <div className="flex flex-col items-center justify-center py-12">
//             <ApolloIcon name="folder" className="mb-4 text-6xl text-gray-300" />
//             <p className="text-lg font-medium text-gray-500">Projects not assigned</p>
//             <p className="mt-2 text-sm text-gray-400">No projects have been assigned to you yet.</p>
//           </div>
//         )}
//       </RoleGuard>
//       <RoleGuard>
//         <DataTable
//           columns={renderableColumns}
//           data={sortedAndPaginatedData}
//           noData={!Array.isArray(projects) && projects?.data?.length === 0}
//           loading={isLoading}
//           pagingData={{
//             pageIndex: Number(pageIndex),
//             pageSize: Number(pageSize),
//             total: !Array.isArray(projects) ? (projects?.data?.length ?? 0) : 0,
//           }}
//           pageSizes={getPaginationOptions(
//             Array.isArray(projects) ? projects.length : projects?.meta?.total || 0
//           )}
//           onPaginationChange={handlePaginationChange}
//           onSelectChange={handleSelectChange}
//           onSort={handleSort}
//           rowClassName="cursor-pointer hover:bg-gray-50"
//           onRowClick={(row) => handleRowClick(row.original._id)}
//           tableClassName="max-h-[70dvh]"
//           selectable={false} // We're using our custom checkbox column
//         />
//       </RoleGuard>

//       {/* Delete Confirmation Dialog */}
//       <ConfirmDialog
//         type="warning"
//         isOpen={deleteConfirmDialogOpen}
//         title="Delete Projects"
//         onCancel={() => setDeleteConfirmDialogOpen(false)}
//         onConfirm={handleDeleteProjects}
//         confirmButtonProps={{ disabled: bulkDeleteProjectsMutation.isPending }}
//       >
//         <p>
//           Are you sure you want to delete {selectedProjects.length} project
//           {selectedProjects.length !== 1 ? 's' : ''}?
//         </p>
//         <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
//       </ConfirmDialog>
//     </Card>
//   );
// }

// export default ProjectsWrapper;
