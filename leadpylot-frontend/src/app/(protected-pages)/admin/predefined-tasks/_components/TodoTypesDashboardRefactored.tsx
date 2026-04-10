'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { usePredefinedSubtasks } from '@/services/hooks/usePredefinedSubtasks';
import { useDrawerStore } from '@/stores/drawerStore';
import { TodoTypeFormSidebar } from './TodoTypeFormSidebar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Card from '@/components/ui/Card';
import { apiDeletePredefinedSubtask } from '@/services/PredefinedSubtasksService';
import useNotification from '@/utils/hooks/useNotification';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { StatusBadge } from '@/app/(protected-pages)/dashboards/_components/SharedColumnConfig';
import classNames from '@/utils/classNames';
import { CategoryFormSidebar } from './CategoryFormSidebar';
import { apiDeletePredefinedSubtaskCategory } from '@/services/PredefinedSubtaskCategoriesService';
import { usePredefinedSubtaskCategories } from '@/services/hooks/usePredefinedSubtaskCategories';
import { ColumnDef } from '@/components/shared/DataTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Tooltip from '@/components/ui/Tooltip';

const DESCRIPTION_TOOLTIP_MIN_LENGTH = 35;

function DescriptionCell({ text }: { text: string }) {
  const displayText = text || '-';
  const showTooltip = displayText.length > DESCRIPTION_TOOLTIP_MIN_LENGTH;
  const truncatedText =
    displayText.length > DESCRIPTION_TOOLTIP_MIN_LENGTH
      ? `${displayText.slice(0, DESCRIPTION_TOOLTIP_MIN_LENGTH)}…`
      : displayText;

  const content = (
    <span className="block truncate max-w-full min-w-0 text-sm text-black">
      {truncatedText}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip
        title={displayText}
        hoverOnly
        wrapperClass="block truncate max-w-full min-w-0 cursor-default"
        className="max-w-xs break-words whitespace-normal"
      >
        {content}
      </Tooltip>
    );
  }
  return content;
}

const TodoTypesDashboardRefactored = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const {
    isOpen,
    sidebarType,
    selectedId,
    sidebarKey,
    resetDrawer,
    onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; id: string } | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'tasks' | 'categories'>('tasks');
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  // Use the active row hook
  const taskRow = useActiveRow({ onHandleSidebar, resetDrawer });
  const categoryRow = useActiveRow({ onHandleSidebar, resetDrawer });

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || undefined;
  const isActiveFilter =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;

  const { data: predefinedSubtasksData, isLoading } = usePredefinedSubtasks({
    search: search || undefined,
    isActive: isActiveFilter,
  });

  const predefinedSubtasks = predefinedSubtasksData?.data || [];

  const { data: categoriesData, isLoading: isCategoriesLoading } = usePredefinedSubtaskCategories({
    search: search || undefined,
    isActive: isActiveFilter,
  });

  const categories = categoriesData?.data || [];

  const taskColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'taskTitle',
        sortable: true,
        columnWidth: 140,
        minSize: 70,
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'taskDescription',
        columnWidth: 180,
        minSize: 120,
        cell: (props: any) => (
          <DescriptionCell text={props.row.original?.taskDescription || ''} />
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        accessorKey: 'priority',
        columnWidth: 100,
        minSize: 70,
        cell: (props: any) => {
          const priority = props.row.original?.priority;
          const priorityClass =
            priority === 'high'
              ? 'bg-red-100 text-red-700'
              : priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : priority === 'low'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600';
          return (
            <span
              className={classNames('rounded-full px-2 py-0.5 text-xs font-medium', priorityClass)}
            >
              {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
            </span>
          );
        },
      },
      {
        id: 'category',
        header: 'Category',
        columnWidth: 120,
        minSize: 80,
        cell: (props: any) => {
          const taskCategories = props.row.original?.category || [];
          if (!taskCategories.length) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {taskCategories.map((category: any) => {
                const label =
                  typeof category === 'string'
                    ? category
                    : category?.taskCategoryTitle || 'Category';
                const key =
                  typeof category === 'string'
                    ? category
                    : category?._id || category?.id || category?.taskCategoryTitle;
                return (
                  <span
                    key={key}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        id: 'tags',
        header: 'Tags',
        columnWidth: 140,
        minSize: 120,
        cell: (props: any) => {
          const tags = props.row.original?.tags || [];
          if (!tags.length) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          const formatTag = (t: string) =>
            t.length > 10 ? `${t.slice(0, 10)}…` : t;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag: string, idx: number) => (
                <span
                  key={`${tag}-${idx}`}
                  title={tag}
                  className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                >
                  #{formatTag(tag)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'todo',
        header: 'Todo Items',
        columnWidth: 100,
        minSize: 90,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.todo?.length || 0} item
            {(props.row.original?.todo?.length || 0) !== 1 ? 's' : ''}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        columnWidth: 90,
        minSize: 70,
        cell: (props: any) => (
          <StatusBadge status={props.row.original?.isActive ? 'active' : 'inactive'} />
        ),
      },
      {
        id: 'createdBy',
        header: 'Created By',
        columnWidth: 110,
        minSize: 90,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.createdBy?.login || 'Unknown'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        columnWidth: 110,
        minSize: 90,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.createdAt
              ? new Date(props.row.original.createdAt).toLocaleDateString()
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        columnWidth: 100,
        minSize: 90,
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                taskRow.handleEdit?.(props.row.original?._id);
              }}
            />
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-rust"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                setSelected({
                  name: props.row.original?.taskTitle,
                  id: props.row.original?._id,
                });
                setDeleteConfirmDialogOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    [taskRow, setDeleteConfirmDialogOpen, setSelected]
  );

  const categoryColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'taskCategoryTitle',
        sortable: true,
        columnWidth: 140,
        minSize: 70,
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'taskCategoryDescription',
        columnWidth: 180,
        minSize: 120,
        cell: (props: any) => (
          <DescriptionCell text={props.row.original?.taskCategoryDescription || ''} />
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        columnWidth: 140,
        minSize: 70,
        cell: (props: any) => {
          const tags = props.row.original?.tags || [];
          if (!tags.length) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          const formatTag = (t: string) =>
            t.length > 10 ? `${t.slice(0, 10)}…` : t;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag: string, idx: number) => (
                <span
                  key={`${tag}-${idx}`}
                  title={tag}
                  className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                >
                  #{formatTag(tag)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'standalone',
        header: 'Standalone',
        columnWidth: 100,
        minSize: 80,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.isStandaloneEnabled ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        columnWidth: 90,
        minSize: 80,
        cell: (props: any) => (
          <StatusBadge status={props.row.original?.isActive ? 'active' : 'inactive'} />
        ),
      },
      {
        id: 'createdBy',
        header: 'Created By',
        columnWidth: 110,
        minSize: 90,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.createdBy?.login || 'Unknown'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        columnWidth: 110,
        minSize: 90,
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.createdAt
              ? new Date(props.row.original.createdAt).toLocaleDateString()
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        columnWidth: 100,
        minSize: 90,
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                categoryRow.handleEdit?.(props.row.original?._id);
              }}
            />
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-rust"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCategory({
                  name: props.row.original?.taskCategoryTitle,
                  id: props.row.original?._id,
                });
                setDeleteCategoryDialogOpen(true);
              }}
            />
          </div>
        ),
      },
    ],
    [categoryRow, setDeleteCategoryDialogOpen, setSelectedCategory]
  );

  const categoryTableConfig = useBaseTable({
    tableName: 'predefined-subtask-categories',
    data: categories,
    loading: isCategoriesLoading,
    totalItems: categories.length,
    pageIndex,
    pageSize,
    search,
    columns: categoryColumns,
    returnFullObjects: true,
    selectable: false,
    showPagination: false,
    showNavigation: false,
    showSearchInActionBar: false,
    showActionsDropdown: true,
    onRowClick: (row) => categoryRow.handleRowClick(row?._id),
    rowClassName: categoryRow.getRowClassName,
    setPageInfoFromBaseTable: false,
    preservedFields: ['title'],
    leftCommonActions: (
      <div className="flex items-center gap-2">
        <h5 className="text-base font-semibold leading-tight">
          Predefined Task Categories
        </h5>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
          {categories.length}
        </span>
      </div>
    ),
    extraActions: (
      <div className="flex items-center gap-3">
        <Tabs
          value={activeTab}
          // eslint-disable-next-line react-hooks/immutability
          onChange={(v) => handleTabChange(v as 'tasks' | 'categories')}
          variant="underline"
        >
          <Tabs.TabList className="flex items-center gap-0 border-0 text-sm">
            <Tabs.TabNav value="categories" className="text-sm">Category</Tabs.TabNav>
            <Tabs.TabNav value="tasks" className="text-sm">Tasks</Tabs.TabNav>
          </Tabs.TabList>
        </Tabs>
        <Button
          variant="solid"
          size="xs"
          icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} className="text-md" />}
          onClick={
            !isOpen ? categoryRow.handleAddNew : onOpenSidebar
          }
        >
          {!isOpen ? (
            <>
              Add <span className="hidden md:inline">Task Category</span>
            </>
          ) : (
            ''
          )}
        </Button>
      </div>
    ),
  });

  const taskTableConfig = useBaseTable({
    tableName: 'predefined-subtasks',
    data: predefinedSubtasks,
    loading: isLoading,
    totalItems: predefinedSubtasks.length,
    pageIndex,
    pageSize,
    search,
    columns: taskColumns,
    returnFullObjects: true,
    selectable: false,
    showPagination: false,
    showNavigation: false,
    showSearchInActionBar: false,
    showActionsDropdown: true,
    onRowClick: (row) => taskRow.handleRowClick(row?._id),
    rowClassName: taskRow.getRowClassName,
    setPageInfoFromBaseTable: false,
    preservedFields: ['title'],
    leftCommonActions: (
      <div className="flex items-center gap-2">
        <h5 className="text-base font-semibold leading-tight">
          Predefined Tasks
        </h5>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
          {predefinedSubtasks.length}
        </span>
      </div>
    ),
    extraActions: (
      <div className="flex items-center gap-3">
        <Tabs
          value={activeTab}
          onChange={(v) => handleTabChange(v as 'tasks' | 'categories')}
          variant="underline"
        >
          <Tabs.TabList className="flex items-center gap-0 border-0 text-sm">
            <Tabs.TabNav value="categories" className="text-sm">Category</Tabs.TabNav>
            <Tabs.TabNav value="tasks" className="text-sm">Tasks</Tabs.TabNav>
          </Tabs.TabList>
        </Tabs>
        <Button
          variant="solid"
          size="xs"
          icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} className="text-md" />}
          onClick={
            !isOpen ? taskRow.handleAddNew : onOpenSidebar
          }
        >
          {!isOpen ? (
            <>
              Add <span className="hidden md:inline">Predefined Task</span>
            </>
          ) : (
            ''
          )}
        </Button>
      </div>
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiDeletePredefinedSubtask(id);
      } catch (error: any) {
        throw error;
      }
    },
    onMutate: async (deletedId) => {
      try {
        await queryClient?.cancelQueries({ queryKey: ['predefinedSubtasks'] });
        const previousPredefinedSubtasks = queryClient?.getQueryData(['predefinedSubtasks']);
        queryClient?.setQueryData(['predefinedSubtasks'], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData?.data?.filter((item: any) => item?._id !== deletedId) || [],
          };
        });
        return { previousPredefinedSubtasks };
      } catch {
        // Silently handle cancel errors
        return { previousPredefinedSubtasks: undefined };
      }
    },
    onSuccess: async () => {
      openNotification?.({ type: 'success', massage: 'Predefined subtask deleted successfully' });
      setDeleteConfirmDialogOpen(false);
      setSelected(null);
      taskRow.handleDelete?.();
      await queryClient?.invalidateQueries({ queryKey: ['predefinedSubtasks'] });
    },
    onError: async (err: any, deletedId, context) => {
      if (context?.previousPredefinedSubtasks) {
        queryClient?.setQueryData(['predefinedSubtasks'], context.previousPredefinedSubtasks);
      }
      const errorMessage =
        err?.response?.data?.error || err?.message || 'Failed to delete predefined subtask';
      openNotification?.({ type: 'danger', massage: errorMessage });
    },
    onSettled: async () => {
      await queryClient?.invalidateQueries({ queryKey: ['predefinedSubtasks'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiDeletePredefinedSubtaskCategory(id);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: async () => {
      openNotification?.({ type: 'success', massage: 'Category deleted successfully' });
      setDeleteCategoryDialogOpen(false);
      setSelectedCategory(null);
      categoryRow.handleDelete?.();
      await queryClient?.invalidateQueries({ queryKey: ['predefinedSubtaskCategories'] });
    },
    onError: async (err: any) => {
      const errorMessage =
        err?.response?.data?.error || err?.message || 'Failed to delete category';
      openNotification?.({ type: 'danger', massage: errorMessage });
    },
    onSettled: async () => {
      await queryClient?.invalidateQueries({ queryKey: ['predefinedSubtaskCategories'] });
    },
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  const resetTabState = () => {
    resetDrawer();
    setSelected(null);
    setSelectedCategory(null);
    setDeleteConfirmDialogOpen(false);
    setDeleteCategoryDialogOpen(false);
  };

  const handleTabChange = (tab: 'tasks' | 'categories') => {
    if (tab === activeTab) return;
    resetTabState();
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col gap-4  px-4 py-2">
      <div>
        <div className={layout.container}>
          {/* Main content */}
          <div className={`${layout.mainContent} relative z-10 flex flex-col gap-2`}>
            <div className="w-full">
              {activeTab === 'tasks' ? (
                <BaseTable
                  {...taskTableConfig}
                  dynamicallyColumnSizeFit={true}
                  tableLayout="fixed"
                  enableColumnResizing={true}
                  commonActionBarClasses="mt-0 mb-1"
                />
              ) : (
                <BaseTable
                  {...categoryTableConfig}
                  dynamicallyColumnSizeFit={true}
                  tableLayout="fixed"
                  enableColumnResizing={true}
                  commonActionBarClasses="mt-0 mb-1"
                />
              )}
            </div>
          </div>

          {/* Right sidebar for create/edit - max height so buttons stay visible on small screens */}
          <div
            className={`${layout.sidebar} flex max-h-[calc(100vh-6rem)] min-h-0 flex-col border-b-2 lg:border-b-0 lg:border-l-2 border-gray-100 lg:pl-2 text-sm`}
            style={layout.sidebarStyles}
          >
            <Card className="flex min-h-0 flex-1 flex-col border-none p-0">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 flex items-center justify-between">
                  <h6 className="text-base capitalize mb-1">
                    {activeTab === 'tasks'
                      ? sidebarType === 'create'
                        ? 'Add New Task'
                        : predefinedSubtasksData?.data?.find(
                          (item: any) => item._id === selectedId
                        )?.taskTitle || 'Predefined Task'
                      : sidebarType === 'create'
                        ? 'Add New Category'
                        : categoriesData?.data?.find((item: any) => item._id === selectedId)
                          ?.taskCategoryTitle || 'Category'}
                  </h6>
                  <Button
                    variant="secondary"
                    size="xs"
                    className="bg-sand-1 hover:bg-sand-2"
                    icon={<ApolloIcon name="times" className="" />}
                    onClick={resetDrawer || onOpenSidebar}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {sidebarType &&
                    (activeTab === 'tasks' ? (
                      <TodoTypeFormSidebar
                        key={`todo-type-${sidebarType}-${selectedId}-${sidebarKey}`}
                        type={sidebarType as 'create' | 'edit'}
                        todoTypeId={selectedId || undefined}
                        onClose={taskRow.handleFormSuccess}
                      />
                    ) : (
                      <CategoryFormSidebar
                        key={`category-${sidebarType}-${selectedId}-${sidebarKey}`}
                        type={sidebarType as 'create' | 'edit'}
                        categoryId={selectedId || undefined}
                        onClose={categoryRow.handleFormSuccess}
                      />
                    ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmDialogOpen}
        title="Warning"
        onCancel={() => {
          setDeleteConfirmDialogOpen(false);
          setSelected(null);
        }}
        onConfirm={async () => {
          if (selected?.id) {
            deleteMutation?.mutate(selected.id);
          }
        }}
        confirmButtonProps={{ disabled: deleteMutation.isPending }}
      >
        <p>Are you sure you want to delete &quot;{selected?.name}&quot;?</p>
        <p className="mt-2 text-sm text-gray-600">
          If this predefined task is being used by any todos, deletion will be prevented.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        type="warning"
        isOpen={deleteCategoryDialogOpen}
        title="Warning"
        onCancel={() => {
          setDeleteCategoryDialogOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={async () => {
          if (selectedCategory?.id) {
            deleteCategoryMutation?.mutate(selectedCategory.id);
          }
        }}
        confirmButtonProps={{ disabled: deleteCategoryMutation.isPending }}
      >
        <p>Are you sure you want to delete &quot;{selectedCategory?.name}&quot;?</p>
        <p className="mt-2 text-sm text-gray-600">
          You can also deactivate a category instead of deleting it.
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default TodoTypesDashboardRefactored;
