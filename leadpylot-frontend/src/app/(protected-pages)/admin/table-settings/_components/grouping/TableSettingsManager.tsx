'use client';

import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import type { DefaultFilterRule } from '@/services/SettingsService';
import type { User } from '@/services/UsersService';
import {
  useGetDefaultGroupingFieldsPages,
  useUpdateDefaultGroupingFields,
} from '@/services/hooks/useDefaultGroupingFields';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableColumnsPanel from './TableColumnsPanel';
import TablesList from './TablesList';
import UsersList from './UsersList';

interface TableSettingsManagerProps {
  onSaveStateChange?: (canSave: boolean, handleSave: () => void, isSaving: boolean) => void;
}

const TableSettingsManager = ({ onSaveStateChange }: TableSettingsManagerProps) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  // Record<modelName, Record<fieldName, boolean>>
  const [selectedColumns, setSelectedColumns] = useState<Record<string, Record<string, boolean>>>(
    {}
  );
  // Record<modelName, DefaultFilterRule[]>
  const [selectedFilters, setSelectedFilters] = useState<Record<string, DefaultFilterRule[]>>({});

  const { mutate: updateDefaultGroupingFields, isPending: isSaving } =
    useUpdateDefaultGroupingFields();

  const handleUserSelect = (user: User, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers((prev) => [...prev, user]);
    } else {
      setSelectedUsers((prev) => prev.filter((u) => u._id !== user._id));
    }
  };

  const handleTableSelect = (model: string) => {
    setSelectedModel(model);
    // Initialize empty columns for model if it doesn't exist
    if (!selectedColumns[model]) {
      setSelectedColumns((prev) => ({ ...prev, [model]: {} }));
    }
    // Initialize empty filters for model if it doesn't exist
    if (!selectedFilters[model]) {
      setSelectedFilters((prev) => ({ ...prev, [model]: [] }));
    }
  };

  // Fetch paged default grouping fields when a table is selected
  const { data: defaultGroupingFieldsData } = useGetDefaultGroupingFieldsPages(
    selectedModel ? { page: selectedModel.toLowerCase() } : undefined
  );

  // Extract defaultGroupingFields from all users' results and combine them as default columns
  useEffect(() => {
    if (!selectedModel || !defaultGroupingFieldsData?.results) return;

    const results = Array.isArray(defaultGroupingFieldsData.results)
      ? defaultGroupingFieldsData.results.map((result: any) => ({
          _id: result.user_id,
          login: result.user.login,
          ...result,
        }))
      : [];
    setSelectedUsers(results);
    if (results.length === 0) return;

    // Combine defaultGroupingFields from all users
    const lowerModel = selectedModel.toLowerCase();
    const columnsRecord: Record<string, boolean> = {};

    results.forEach((result: any) => {
      const modelFields = result?.defaultGroupingFields?.[lowerModel];
      if (modelFields && typeof modelFields === 'object') {
        // Merge all fields from all users - if any user has a field set to true, include it
        Object.entries(modelFields).forEach(([field, value]) => {
          if (value === true) {
            columnsRecord[field] = true;
          }
        });
      }
    });

    // Set combined columns if any were found
    if (Object.keys(columnsRecord).length > 0) {
      setSelectedColumns((prev) => ({
        ...prev,
        [selectedModel]: columnsRecord,
      }));
    }
  }, [selectedModel, defaultGroupingFieldsData]);

  // Get current model's columns as Map (for TableColumnsPanel compatibility)
  const currentModelColumns = useMemo(() => {
    if (!selectedModel || !selectedColumns[selectedModel]) return undefined;
    return new Map(Object.entries(selectedColumns[selectedModel]));
  }, [selectedModel, selectedColumns]);

  // Get current model's filters
  const currentModelFilters = useMemo(() => {
    if (!selectedModel) return [];
    return selectedFilters[selectedModel] || [];
  }, [selectedModel, selectedFilters]);

  const handleColumnToggle = (fieldName: string, checked: boolean) => {
    if (!selectedModel) return;

    setSelectedColumns((prev) => ({
      ...prev,
      [selectedModel]: { ...(prev[selectedModel] || {}), [fieldName]: checked },
    }));
  };

  const handleFiltersChange = (filters: DefaultFilterRule[]) => {
    if (!selectedModel) return;
    setSelectedFilters((prev) => ({ ...prev, [selectedModel]: filters }));
  };

  const handleSave = useCallback(() => {
    if (selectedUsers.length === 0) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select at least one user
        </Notification>
      );
      return;
    }

    if (!selectedModel) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select a table
        </Notification>
      );
      return;
    }

    const modelColumns = selectedColumns[selectedModel];
    const hasSelectedColumns =
      modelColumns && Object.values(modelColumns).some((value) => value === true);

    if (!hasSelectedColumns) {
      toast.push(
        <Notification title="Error" type="danger">
          Please select at least one column
        </Notification>
      );
      return;
    }

    // Build defaultGroupingFields object - only include fields with true values
    const defaultGroupingFields: Record<string, Record<string, boolean>> = {};

    Object.entries(selectedColumns).forEach(([model, columns]) => {
      const modelFields: Record<string, boolean> = {};
      Object.entries(columns).forEach(([field, value]) => {
        if (value === true) {
          modelFields[field] = true;
        }
      });

      if (Object.keys(modelFields).length > 0) {
        defaultGroupingFields[model.toLowerCase()] = modelFields;
      }
    });

    // Build defaultFilter object - only include models with filters
    const defaultFilter: Record<string, DefaultFilterRule[]> = {};
    Object.entries(selectedFilters).forEach(([model, filters]) => {
      if (filters.length > 0) {
        defaultFilter[model.toLowerCase()] = filters;
      }
    });

    const payload = {
      user_ids: selectedUsers.map((u) => u._id),
      defaultGroupingFields,
      ...(Object.keys(defaultFilter).length > 0 && { defaultFilter }),
    };

    updateDefaultGroupingFields(payload, {
      onSuccess: () => {
        toast.push(
          <Notification title="Success" type="success">
            Default grouping fields saved successfully
          </Notification>
        );
      },
      onError: (error) => {
        toast.push(
          <Notification title="Error" type="danger">
            {error.message || 'Failed to save default grouping fields'}
          </Notification>
        );
      },
    });
  }, [selectedUsers, selectedModel, selectedColumns, selectedFilters, updateDefaultGroupingFields]);

  // Get list of tables that have at least one selected column
  const tablesWithColumns = useMemo(() => {
    return Object.entries(selectedColumns)
      .filter(([_, columns]) => Object.values(columns).some((value) => value === true))
      .map(([model]) => model);
  }, [selectedColumns]);

  const hasSelectedColumns = useMemo(() => {
    if (!selectedModel || !selectedColumns[selectedModel]) return false;
    return Object.values(selectedColumns[selectedModel]).some((value) => value === true);
  }, [selectedModel, selectedColumns]);

  const canSave = useMemo(() => {
    return Boolean(selectedUsers.length > 0 && selectedModel && hasSelectedColumns);
  }, [selectedUsers.length, selectedModel, hasSelectedColumns]);

  // Expose save state to parent
  useEffect(() => {
    onSaveStateChange?.(canSave, handleSave, isSaving);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, handleSave, isSaving]);

  return (
    <div className="flex max-h-[95vh] flex-col bg-gray-50">
      {/* Main Content - Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 2 - Tables */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white">
          <TablesList
            onTableSelect={handleTableSelect}
            selectedModel={selectedModel}
            tablesWithColumns={tablesWithColumns}
          />
        </div>
        {/* Column 1 - Users */}
        {/* Column 3 - Columns & Filters */}
        <div className="flex-1 overflow-hidden bg-white">
          <TableColumnsPanel
            selectedModel={selectedModel}
            selectedUserIds={selectedUsers.map((u) => u._id)}
            onColumnToggle={handleColumnToggle}
            selectedColumns={currentModelColumns}
            onFiltersChange={handleFiltersChange}
            selectedFilters={currentModelFilters}
          />
        </div>
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white">
          <UsersList
            onUserSelect={handleUserSelect}
            selectedUserIds={selectedUsers.map((u) => u._id)}
          />
        </div>
      </div>
    </div>
  );
};

export default TableSettingsManager;
