'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { DatePicker } from '@/components/shared/form/DatePicker';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import type { DefaultFilterRule } from '@/services/SettingsService';
import type { MetadataFilterOption } from '@/stores/universalGroupingFilterStore';

interface InlineFilterBuilderProps {
    filters: DefaultFilterRule[];
    availableFields: MetadataFilterOption[];
    onFiltersChange: (filters: DefaultFilterRule[]) => void;
}

interface FieldValueOption {
    _id: string;
    value: string;
}

const ALL_OPERATORS = [
    { value: '=', label: 'Equals (=)' },
    { value: '!=', label: 'Not Equals (!=)' },
    { value: '>', label: 'Greater Than (>)' },
    { value: '<', label: 'Less Than (<)' },
    { value: '>=', label: 'Greater or Equal (>=)' },
    { value: '<=', label: 'Less or Equal (<=)' },
    { value: 'in', label: 'In' },
    { value: 'not in', label: 'Not In' },
    { value: 'between', label: 'Between' },
    { value: 'ilike', label: 'Contains (ilike)' },
    { value: 'not ilike', label: 'Not Contains' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
];

const InlineFilterBuilder = ({
    filters,
    availableFields,
    onFiltersChange,
}: InlineFilterBuilderProps) => {

    const addFilter = () => {
        const newFilter: DefaultFilterRule = {
            field: '',
            operator: '=',
            value: '',
        };
        onFiltersChange([...filters, newFilter]);
    };

    const removeFilter = (index: number) => {
        onFiltersChange(filters.filter((_, i) => i !== index));
    };

    const updateFilter = (index: number, updates: Partial<DefaultFilterRule>) => {
        const updated = filters.map((filter, i) =>
            i === index ? { ...filter, ...updates } : filter
        );
        onFiltersChange(updated);
    };

    const getFieldOptions = () => {
        return availableFields.map((field) => ({
            value: field.field,
            label: field.label || field.field,
        }));
    };

    const getSelectedField = (fieldName: string) => {
        return availableFields.find((f) => f.field === fieldName);
    };

    const getFieldValueOptions = (fieldName: string): FieldValueOption[] => {
        const field = getSelectedField(fieldName);
        return (field?.values as FieldValueOption[]) || [];
    };

    const isFieldWithValues = (fieldName: string) => {
        const field = getSelectedField(fieldName);
        return field?.values && Array.isArray(field.values) && field.values.length > 0;
    };

    const isDateField = (fieldName: string) => {
        const field = getSelectedField(fieldName);
        return field?.type === 'date' || fieldName.includes('date') || fieldName.includes('_at');
    };

    const getOperatorOptions = (fieldName: string) => {
        const field = getSelectedField(fieldName);
        if (field?.operators && Array.isArray(field.operators)) {
            // Return operators that match the field's available operators
            return ALL_OPERATORS.filter((op) => field.operators.includes(op.value));
        }
        // Default operators if field doesn't specify
        return ALL_OPERATORS;
    };

    const handleValueChange = (index: number, value: string) => {
        const filter = filters[index];
        const operator = filter.operator;

        // Handle array values for 'in', 'not in', 'between'
        if (operator === 'in' || operator === 'not in') {
            // Split by comma and trim
            const values = value.split(',').map((v) => v.trim()).filter(Boolean);
            updateFilter(index, { value: values });
        } else if (operator === 'between') {
            // Split by comma for between (two values)
            const values = value.split(',').map((v) => v.trim()).filter(Boolean);
            if (values.length === 2) {
                updateFilter(index, { value: [values[0], values[1]] });
            } else {
                updateFilter(index, { value: value });
            }
        } else {
            // Single value
            updateFilter(index, { value });
        }
    };

    const handleSelectValueChange = (index: number, selectedOptions: any) => {
        const filter = filters[index];
        const operator = filter.operator;

        if (operator === 'in' || operator === 'not in') {
            // Multiple selection - extract _id values
            const values = Array.isArray(selectedOptions)
                ? selectedOptions.map((opt: any) => opt.value || opt._id)
                : [];
            updateFilter(index, { value: values });
        } else {
            // Single selection - use _id
            const value = selectedOptions?.value || selectedOptions?._id || selectedOptions;
            updateFilter(index, { value });
        }
    };

    const formatValueForDisplay = (value: any): string => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return String(value || '');
    };

    const parseDateValue = (value: any): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
            // Parse date string in local timezone to avoid timezone shifts
            // Expected format: YYYY-MM-DD
            const parts = value.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const day = parseInt(parts[2], 10);
                const date = new Date(year, month, day);
                // Validate the date
                if (
                    date.getFullYear() === year &&
                    date.getMonth() === month &&
                    date.getDate() === day
                ) {
                    return date;
                }
            }
            // Fallback to standard parsing if format doesn't match
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        }
        return null;
    };

    const formatDateForStorage = (date: Date | null): string => {
        if (!date) return '';
        // Format date in local timezone to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // YYYY-MM-DD format
    };

    const handleDateChange = (index: number, date: Date | null) => {
        const filter = filters[index];
        const operator = filter.operator;

        if (operator === 'between') {
            // For between, we need to handle array of two dates
            const currentValue = Array.isArray(filter.value) ? filter.value : [];
            // This will be handled by handleDateRangeChange
            return;
        } else {
            // Single date value
            const dateString = formatDateForStorage(date);
            updateFilter(index, { value: dateString });
        }
    };

    const handleDateRangeChange = (index: number, dateIndex: 0 | 1, date: Date | null) => {
        const filter = filters[index];
        const currentValue = Array.isArray(filter.value) ? filter.value : ['', ''];
        const newValue = [...currentValue];
        newValue[dateIndex] = formatDateForStorage(date);
        updateFilter(index, { value: newValue });
    };

    const getSelectedValueOptions = (filter: DefaultFilterRule) => {
        if (!filter.field || !isFieldWithValues(filter.field)) {
            return null;
        }

        const valueOptions = getFieldValueOptions(filter.field);
        const operator = filter.operator;

        if (operator === 'in' || operator === 'not in') {
            // Multiple selection - return array of option objects
            if (Array.isArray(filter.value)) {
                return valueOptions
                    .filter((opt) => Array.isArray(filter.value) && filter.value.includes(opt._id))
                    .map((opt) => ({
                        value: opt._id,
                        label: opt.value,
                    }));
            }
            return [];
        } else {
            // Single selection - return single option object
            const selectedId = filter.value;
            const selectedOption = valueOptions.find((opt) => opt._id === selectedId);
            return selectedOption
                ? {
                    value: selectedOption._id,
                    label: selectedOption.value,
                }
                : null;
        }
    };

    return (
        <div className="rounded-lg">  <div
            className={classNames(
                'overflow-hidden transition-all duration-300 ease-in-out max-h-full opacity-100'
            )}
        >
            <div>
                {filters.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">No filters configured</p>
                        <Button
                            variant="plain"
                            size="sm"
                            onClick={addFilter}
                            icon={<ApolloIcon name="plus" />}
                        >
                            Add Filter
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filters.map((filter, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2"
                            >
                                <div className="flex-1 grid grid-cols-12 gap-2">
                                    {/* Field Select */}
                                    <div className="col-span-4">
                                        <Select
                                            placeholder="Field"
                                            value={getFieldOptions().find((opt) => opt.value === filter.field) || null}
                                            options={getFieldOptions()}
                                            onChange={(option: any) => {
                                                const newField = option?.value || '';
                                                const field = getSelectedField(newField);
                                                // Reset value when field changes
                                                // If new field has operators, validate current operator
                                                const currentOperator = filter.operator;
                                                const availableOperators = field?.operators || [];
                                                const isValidOperator =
                                                    availableOperators.length === 0 ||
                                                    availableOperators.includes(currentOperator);

                                                updateFilter(index, {
                                                    field: newField,
                                                    value: '',
                                                    operator: isValidOperator ? currentOperator : (availableOperators[0] || '='),
                                                });
                                            }}
                                            isSearchable
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            menuPosition="fixed"
                                        />
                                    </div>

                                    {/* Operator Select */}
                                    <div className="col-span-3">
                                        <Select
                                            placeholder="Operator"
                                            value={getOperatorOptions(filter.field).find((opt) => opt.value === filter.operator) || null}
                                            options={getOperatorOptions(filter.field)}
                                            onChange={(option: any) =>
                                                updateFilter(index, {
                                                    operator: option?.value || '=',
                                                    value: '', // Reset value when operator changes
                                                })
                                            }
                                            isSearchable
                                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                            menuPosition="fixed"
                                        />
                                    </div>

                                    {/* Value Input/Select */}
                                    <div className="col-span-4">
                                        {filter.field && isFieldWithValues(filter.field) ? (
                                            <Select
                                                placeholder={
                                                    filter.operator === 'in' || filter.operator === 'not in'
                                                        ? 'Select values...'
                                                        : 'Select value'
                                                }
                                                value={getSelectedValueOptions(filter)}
                                                options={getFieldValueOptions(filter.field).map((opt) => ({
                                                    value: opt._id,
                                                    label: opt.value,
                                                }))}
                                                onChange={(option: any) => handleSelectValueChange(index, option)}
                                                isMulti={filter.operator === 'in' || filter.operator === 'not in'}
                                                isSearchable
                                                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                                menuPosition="fixed"
                                            />
                                        ) : filter.operator === 'is_empty' || filter.operator === 'is_not_empty' ? (
                                            <div className="flex items-center px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-md bg-gray-50">
                                                No value needed
                                            </div>
                                        ) : filter.field && isDateField(filter.field) && filter.operator === 'between' ? (
                                            <div className="flex items-center gap-2">
                                                <DatePicker
                                                    placeholder="Start date"
                                                    value={
                                                        Array.isArray(filter.value) && filter.value[0]
                                                            ? parseDateValue(filter.value[0]) || undefined
                                                            : undefined
                                                    }
                                                    onChange={(date) => handleDateRangeChange(index, 0, date || null)}
                                                />
                                                <span className="text-gray-400 text-sm">to</span>
                                                <DatePicker
                                                    placeholder="End date"
                                                    value={
                                                        Array.isArray(filter.value) && filter.value[1]
                                                            ? parseDateValue(filter.value[1]) || undefined
                                                            : undefined
                                                    }
                                                    onChange={(date) => handleDateRangeChange(index, 1, date || null)}
                                                />
                                            </div>
                                        ) : filter.field && isDateField(filter.field) ? (
                                            <DatePicker
                                                placeholder="Select date"
                                                value={parseDateValue(filter.value) || undefined}
                                                onChange={(date) => handleDateChange(index, date || null)}
                                            />
                                        ) : (
                                            <Input
                                                placeholder={
                                                    filter.operator === 'between'
                                                        ? 'Value1, Value2'
                                                        : filter.operator === 'in' || filter.operator === 'not in'
                                                            ? 'Value1, Value2, ...'
                                                            : 'Value'
                                                }
                                                value={formatValueForDisplay(filter.value)}
                                                onChange={(e) => handleValueChange(index, e.target.value)}
                                            />
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    <div className="col-span-1">
                                        <Button
                                            variant="plain"
                                            size="sm"
                                            onClick={() => removeFilter(index)}
                                            icon={<ApolloIcon name="cross" />}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="plain"
                            size="sm"
                            onClick={addFilter}
                            icon={<ApolloIcon name="plus" />}
                            className="w-full"
                        >
                            Add Filter
                        </Button>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};

export default InlineFilterBuilder;

