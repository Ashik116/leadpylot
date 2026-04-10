'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';
import type { DefaultFilterRule } from '@/services/SettingsService';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import classNames from '@/utils/classNames';
import { useEffect, useState } from 'react';
import InlineFilterBuilder from './InlineFilterBuilder';

interface TableColumnsPanelProps {
    selectedModel?: string;
    selectedUserIds?: string[];
    onColumnToggle?: (fieldName: string, checked: boolean) => void;
    selectedColumns?: Map<string, boolean>;
    onFiltersChange?: (filters: DefaultFilterRule[]) => void;
    selectedFilters?: DefaultFilterRule[];
}


const TableColumnsPanel = ({
    selectedModel,
    selectedUserIds = [],
    onColumnToggle,
    selectedColumns,
    onFiltersChange,
    selectedFilters = [],
}: TableColumnsPanelProps) => {
    const { data: metadataOptions, isLoading, error } = useMetadataOptions(selectedModel || '', {
        enabled: !!selectedModel,
    });

    // Fetch existing settings when users or model changes


    // Initialize selected columns from existing settings or prop
    const [localSelectedColumns, setLocalSelectedColumns] = useState<Map<string, boolean>>(selectedColumns || new Map());

    // State to control filter section visibility
    const [showFilters, setShowFilters] = useState(false);

    // Update local state when existing settings are loaded


    // Use local state if no prop provided, otherwise use prop
    const currentSelectedColumns = selectedColumns || localSelectedColumns;

    const handleColumnToggle = (fieldName: string, checked: boolean) => {
        const newMap = new Map(currentSelectedColumns);
        newMap.set(fieldName, checked);
        setLocalSelectedColumns(newMap);
        onColumnToggle?.(fieldName, checked);
    };

    if (!selectedModel) {
        return (
            <Card className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-2">
                    <h3 className="text-sm font-semibold text-gray-900">Columns</h3>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center pt-10">
                    <ApolloIcon name="grid" className=" text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">Select a table to view columns</p>
                </div>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Columns</h3>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <ApolloIcon name="loading" className="animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading columns...</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Columns</h3>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-red-600">Failed to load columns</p>
                    </div>
                </div>
            </Card>
        );
    }

    const filterOptions = metadataOptions?.filterOptions || [];
    const groupOptions = metadataOptions?.groupOptions || [];
    const allColumns = [
        ...filterOptions.map((opt) => ({ ...opt, source: 'filter' as const })), ...groupOptions.map((opt) => ({ ...opt, source: 'group' as const })),
    ];

    // Remove duplicates based on field name
    const uniqueColumns = Array.from(
        new Map(allColumns.map((col) => [col.field, col])).values()
    );

    return (
        <Card className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-gray-200 px-4">
                <div className="flex items-center justify-between py-1">
                    <h3 className="text-sm font-semibold text-gray-900">Columns & Filters</h3>
                    {selectedModel && filterOptions.length > 0 && (
                        <Button
                            variant="plain"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            icon={<ApolloIcon name={showFilters ? 'times' : 'filter'} />}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Columns */}
                <div
                    className={classNames(
                        'overflow-y-auto px-4 py-4 transition-all duration-200',
                        showFilters ? 'flex-1 border-r border-gray-200' : 'flex-1'
                    )}
                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                    {uniqueColumns.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-sm text-gray-500">No columns available</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {uniqueColumns.map((column) => {
                                const columnLabel = column.label || column.field;
                                const columnType = column.type || 'unknown';

                                const isChecked = currentSelectedColumns.get(column.field) || false;

                                return (
                                    <div
                                        key={column.field}
                                        className={classNames(
                                            'flex items-center gap-3 px-2 py-2.5 transition-colors',
                                            isChecked
                                                ? 'bg-blue-50/50'
                                                : 'hover:bg-gray-50'
                                        )}
                                    >
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={(checked) => handleColumnToggle(column.field, checked)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-900 truncate">{columnLabel}</span>
                                                <span
                                                    className={classNames(
                                                        'text-xs font-medium',
                                                        columnType === 'string'
                                                            ? 'text-blue-600'
                                                            : columnType === 'number'
                                                                ? 'text-green-600'
                                                                : columnType === 'date'
                                                                    ? 'text-purple-600'
                                                                    : 'text-gray-500'
                                                    )}
                                                >
                                                    {columnType}
                                                </span>
                                            </div>
                                            {column.field && (
                                                <div className="mt-0.5 text-xs text-gray-400 font-mono truncate">
                                                    {column.field}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Side - Default Filters */}
                {selectedModel && filterOptions.length > 0 && (
                    <div
                        className={classNames(
                            'overflow-hidden border-l border-gray-200 transition-all duration-300 ease-in-out',
                            showFilters
                                ? 'w-1/2 opacity-100'
                                : 'w-0 opacity-0 pointer-events-none'
                        )}
                    >
                        <div
                            className={classNames(
                                'h-full overflow-y-auto px-4 py-4 transition-all duration-300 ease-in-out',
                                showFilters
                                    ? 'translate-x-0 opacity-100'
                                    : 'translate-x-4 opacity-0'
                            )}
                            style={{ maxHeight: 'calc(100vh - 200px)' }}
                        >
                            <InlineFilterBuilder
                                filters={selectedFilters}
                                availableFields={filterOptions}
                                onFiltersChange={onFiltersChange || (() => { })}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default TableColumnsPanel;

