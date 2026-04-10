'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Select from '@/components/ui/Select';
import CreatableSelect from 'react-select/creatable';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import { FaFilter } from 'react-icons/fa';
import dayjs from 'dayjs';
import type { MetadataFilterOption, MetadataGroupOption } from '@/stores/filterStateStore';
import ColumnHeaderGroupBy from './ColumnHeaderGroupBy';

export interface ColumnFilterValue {
  operator: string;
  value: any;
}

/**
 * Maps table column IDs to their corresponding metadata API field names.
 * Only needed when the column ID differs from the metadata field name.
 * e.g. column "agent" → metadata field "user_id"
 */
export type ColumnToFieldMap = Record<string, string>;

/**
 * Maps raw API values to human-readable labels for specific fields.
 * e.g. { duplicate_status: { '0': 'New', '1': '10 Week Duplicate', '2': 'Duplicate' } }
 */
export type FieldValueLabels = Record<string, Record<string, string>>;

export interface ColumnHeaderFilterProps {
  columnId: string;
  filterOptions: MetadataFilterOption[];
  activeFilter?: ColumnFilterValue | null;
  onApply: (fieldName: string, operator: string, value: any) => void;
  onClear: (fieldName: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  fieldValueLabels?: FieldValueLabels;
  groupOptions?: MetadataGroupOption[];
  activeGroupBy?: string[];
  onToggleGroupBy?: (field: string) => void;
  showGroupByInDropdown?: boolean;
}

export const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  not_equals: '!=',
  contains: 'Contains',
  not_contains: 'Not Contains',
  in: 'In',
  not_in: 'Not In',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equal: '>=',
  less_than_or_equal: '<=',
  between: 'Between',
  is_empty: 'Is Empty',
  is_not_empty: 'Is Not Empty',
  '=': '=',
  '!=': '!=',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
  ilike: 'Contains',
  'not ilike': 'Not Contains',
  'not in': 'Not In',
};

const COLUMN_FILTER_OPERATOR_EXCLUSIONS: Record<string, string[]> = {
  lead_source_no: ['=', '!=', 'like', 'is_not_empty'],
  contact_name: ['=', '!=', 'like', 'is_not_empty'],
  phone: ['=', '!=', 'like', 'is_not_empty'],
  email_from: ['=', '!=', 'like', 'is_not_empty'],
};

function getVisibleOperators(
  fieldName: string,
  operators: string[],
  activeOperator?: string | null
): string[] {
  const normalizedFieldName = fieldName.split('.').pop() || fieldName;
  const excludedOperators = COLUMN_FILTER_OPERATOR_EXCLUSIONS[normalizedFieldName];

  if (!excludedOperators?.length) {
    return operators;
  }

  const visibleOperators = operators.filter((op) => !excludedOperators.includes(op));

  if (visibleOperators.length === 0) {
    return operators;
  }

  if (activeOperator && operators.includes(activeOperator) && !visibleOperators.includes(activeOperator)) {
    return [activeOperator, ...visibleOperators];
  }

  return visibleOperators;
}

function ColumnHeaderFilter({
  columnId,
  filterOptions,
  activeFilter,
  onApply,
  onClear,
  columnToFieldMap,
  fieldValueLabels,
  groupOptions,
  activeGroupBy,
  onToggleGroupBy,
  showGroupByInDropdown = false,
}: ColumnHeaderFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [operatorOverride, setOperatorOverride] = useState<string | null>(null);
  const [valueOverride, setValueOverride] = useState<any>(null);
  const isMountedRef = useRef(true);
  const iconRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const operator = operatorOverride ?? (activeFilter?.operator || '');
  const value = valueOverride ?? (activeFilter?.value ?? '');
  const setOperator = (op: string) => setOperatorOverride(op);
  const setValue = (val: any) => setValueOverride(val);

  // Resolve the actual metadata field name for this column
  const metadataField = columnToFieldMap?.[columnId] || columnId;

  const fieldMeta = useMemo(
    () => filterOptions.find((f) => f.field === metadataField),
    [filterOptions, metadataField]
  );

  const visibleOperators = useMemo(
    () => (fieldMeta ? getVisibleOperators(metadataField, fieldMeta.operators, activeFilter?.operator) : []),
    [activeFilter?.operator, fieldMeta, metadataField]
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!isOpen && fieldMeta) {
        setOperator(activeFilter?.operator || visibleOperators[0] || fieldMeta.operators[0] || 'equals');
        setValue(activeFilter?.value ?? '');
      }
      setIsOpen((prev) => !prev);
    },
    [isOpen, fieldMeta, activeFilter, visibleOperators]
  );

  const handleApply = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!operator) return;
      if (!isNoValueOperator(operator) && (value === '' || value === null || value === undefined))
        return;

      let finalValue = isNoValueOperator(operator) ? true : value;

      // Convert to number for numeric fields
      if (fieldMeta && (fieldMeta.type === 'number' || fieldMeta.type === 'Number')) {
        if (Array.isArray(finalValue)) {
          finalValue = finalValue.map((v: any) => (v !== '' && v !== null && v !== undefined ? Number(v) : v));
        } else if (typeof finalValue === 'string' && finalValue !== '') {
          finalValue = Number(finalValue);
        }
      }

      onApply(metadataField, operator, finalValue);
      setIsOpen(false);
    },
    [metadataField, operator, value, onApply, fieldMeta]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOperatorOverride(null);
      setValueOverride(null);
      onClear(metadataField);
      setIsOpen(false);
    },
    [metadataField, onClear]
  );

  const handleGroupByToggle = useCallback(
    (field: string) => {
      if (!onToggleGroupBy) return;
      onToggleGroupBy(field);
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setIsOpen(true);
        }
      });
    },
    [onToggleGroupBy]
  );

  if (!fieldMeta) return null;

  const operatorOptions = visibleOperators.map((op) => ({
    value: op,
    label: OPERATOR_LABELS[op] || op,
  }));

  const hasActiveFilter = !!activeFilter;
  const hasActiveGroupBy = !!(showGroupByInDropdown && activeGroupBy?.includes(metadataField));
  const isTriggerActive = hasActiveFilter || hasActiveGroupBy;
  const noValueNeeded = isNoValueOperator(operator);
  const isMultiSelectOperator = operator === 'in' || operator === 'not_in';
  const hasPresetValues = !!(fieldMeta.values && fieldMeta.values.length > 0);
  const hasAnyValueInput = Array.isArray(value)
    ? value.some((v) => v !== '' && v !== null && v !== undefined)
    : value !== '' && value !== null && value !== undefined;
  const canApplyFilter = !!operator && (noValueNeeded || hasAnyValueInput);

  return (
    <>
      <div
        ref={iconRef}
        className="ml-0.5 inline-flex shrink-0 cursor-pointer items-center"
        onClick={handleToggle}
        title="Filter this column"
      >
        <FaFilter
          className={`text-[11px] ${isTriggerActive ? 'text-blue-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}
        />
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-100030"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <DropdownContent
              iconRef={iconRef}
              dropdownRef={dropdownRef}
              fieldMeta={fieldMeta}
              metadataField={metadataField}
              operator={operator}
              setOperator={setOperator}
              value={value}
              setValue={setValue}
              operatorOptions={operatorOptions}
              noValueNeeded={noValueNeeded}
              isMultiSelectOperator={isMultiSelectOperator}
              hasPresetValues={hasPresetValues}
              canApplyFilter={canApplyFilter}
              handleApply={handleApply}
              handleClear={handleClear}
              onCancel={(e: React.MouseEvent) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              isActive={hasActiveFilter}
              fieldValueLabels={fieldValueLabels}
              columnId={columnId}
              groupOptions={groupOptions}
              activeGroupBy={activeGroupBy || []}
              onToggleGroupBy={handleGroupByToggle}
              columnToFieldMap={columnToFieldMap}
              showGroupByInDropdown={showGroupByInDropdown}
            />
          </>,
          document.body
        )}
    </>
  );
}

function isNoValueOperator(op: string): boolean {
  return ['is_empty', 'is_not_empty'].includes(op);
}

interface DropdownContentProps {
  iconRef: React.RefObject<HTMLDivElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  fieldMeta: MetadataFilterOption;
  metadataField: string;
  operator: string;
  setOperator: (op: string) => void;
  value: any;
  setValue: (val: any) => void;
  operatorOptions: { value: string; label: string }[];
  noValueNeeded: boolean;
  isMultiSelectOperator: boolean;
  hasPresetValues: boolean;
  canApplyFilter: boolean;
  handleApply: (e: React.MouseEvent) => void;
  handleClear: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
  isActive: boolean;
  fieldValueLabels?: FieldValueLabels;
  columnId: string;
  groupOptions?: MetadataGroupOption[];
  activeGroupBy: string[];
  onToggleGroupBy?: (field: string) => void;
  columnToFieldMap?: ColumnToFieldMap;
  showGroupByInDropdown: boolean;
}

function DropdownContent({
  iconRef,
  dropdownRef,
  fieldMeta,
  metadataField,
  operator,
  setOperator,
  value,
  setValue,
  operatorOptions,
  noValueNeeded,
  isMultiSelectOperator,
  hasPresetValues,
  canApplyFilter,
  handleApply,
  handleClear,
  onCancel,
  isActive,
  fieldValueLabels,
  columnId,
  groupOptions,
  activeGroupBy,
  onToggleGroupBy,
  columnToFieldMap,
  showGroupByInDropdown,
}: DropdownContentProps) {
  const position = useMemo(() => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const dropdownWidth = 260;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - 8;
    }
    return { top: rect.bottom + 4, left };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconRef.current]);

  if (!position) return null;

  const showGroupByAction =
    showGroupByInDropdown && !!onToggleGroupBy && !!groupOptions && groupOptions.length > 0;

  const labelOverrides = fieldValueLabels?.[metadataField];
  const valueOptions = hasPresetValues
    ? fieldMeta.values!.map((v) => ({
      value: String(v._id),
      label: labelOverrides?.[String(v._id)] || labelOverrides?.[String(v.value)] || String(v.value),
    }))
    : [];

  return (
    <div
      ref={dropdownRef}
      className="fixed z-100031 w-[260px] rounded-md border border-gray-200 bg-white p-3 shadow-lg"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={
          showGroupByAction
            ? 'mb-2 flex items-center justify-between gap-2 border-b border-gray-200 pb-2'
            : 'mb-2'
        }
      >
        <div className="text-xs font-semibold text-gray-500 uppercase">
          {fieldMeta.label}
        </div>
        {showGroupByAction && (
          <ColumnHeaderGroupBy
            columnId={columnId}
            groupOptions={groupOptions}
            activeGroupBy={activeGroupBy}
            onToggleGroupBy={onToggleGroupBy}
            columnToFieldMap={columnToFieldMap}
            alwaysVisible
            renderAsOutlineButton
          />
        )}
      </div>

      <div className="mb-2">
        <label className="mb-1 block text-xs text-gray-500">Operator</label>
        <Select
          size="sm"
          placeholder="Select operator"
          value={operatorOptions.find((o) => o.value === operator) || null}
          options={operatorOptions}
          onChange={(selected: any) => {
            const newOp = selected?.value || '';
            setOperator(newOp);
            if (isNoValueOperator(newOp)) {
              setValue('');
            }
          }}
        />
      </div>

      {!noValueNeeded && (
        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-500">Value</label>
          <ValueInput
            fieldMeta={fieldMeta}
            operator={operator}
            value={value}
            setValue={setValue}
            valueOptions={valueOptions}
            isMultiSelectOperator={isMultiSelectOperator}
            hasPresetValues={hasPresetValues}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="xs"
          variant="solid"
          onClick={handleApply}
          disabled={!canApplyFilter}
          className="flex-1"
        >
          Filter
        </Button>
        {isActive ? (
          <Button
            size="xs"
            variant="plain"
            onClick={handleClear}
            className="flex-1"
          >
            Clear
          </Button>
        ) : (
          <Button
            size="xs"
            variant="plain"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

interface ValueInputProps {
  fieldMeta: MetadataFilterOption;
  operator: string;
  value: any;
  setValue: (val: any) => void;
  valueOptions: { value: string; label: string }[];
  isMultiSelectOperator: boolean;
  hasPresetValues: boolean;
}

function ValueInput({
  fieldMeta,
  operator,
  value,
  setValue,
  valueOptions,
  isMultiSelectOperator,
  hasPresetValues,
}: ValueInputProps) {
  const fieldType = fieldMeta.type;

  if (operator === 'between') {
    if (fieldType === 'date' || fieldType === 'Date') {
      const [start, end] = Array.isArray(value) ? value : [null, null];
      return (
        <DatePicker.DatePickerRange
          placeholder="Select range"
          size="sm"
          value={[start ? new Date(start) : null, end ? new Date(end) : null]}
          onChange={(dates: [Date | null, Date | null]) => {
            setValue([
              dates[0] ? dayjs(dates[0]).format('YYYY-MM-DD') : null,
              dates[1] ? dayjs(dates[1]).format('YYYY-MM-DD') : null,
            ]);
          }}
        />
      );
    }
    const [min, max] = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="flex gap-1">
        <Input
          size="sm"
          type="number"
          placeholder="Min"
          value={min}
          onChange={(e: any) => setValue([e.target?.value ?? e, max])}
        />
        <Input
          size="sm"
          type="number"
          placeholder="Max"
          value={max}
          onChange={(e: any) => setValue([min, e.target?.value ?? e])}
        />
      </div>
    );
  }

  if (fieldType === 'date' || fieldType === 'Date') {
    return (
      <DatePicker
        placeholder="Select date"
        size="sm"
        value={value ? new Date(value) : null}
        onChange={(date: Date | null) => {
          setValue(date ? dayjs(date).format('YYYY-MM-DD') : '');
        }}
      />
    );
  }

  if (isMultiSelectOperator && hasPresetValues) {
    const selectedValues = Array.isArray(value)
      ? valueOptions.filter((o) => value.includes(o.value))
      : [];
    return (
      <Select
        size="sm"
        isMulti
        placeholder="Select values"
        value={selectedValues}
        options={valueOptions}
        onChange={(selected: any) => {
          setValue(selected ? selected.map((s: any) => s.value) : []);
        }}
      />
    );
  }

  if (isMultiSelectOperator && !hasPresetValues) {
    return (
      <CreatableMultiInput value={value} setValue={setValue} />
    );
  }

  if (hasPresetValues) {
    const selectedOption = valueOptions.find((o) => o.value === String(value)) || null;
    return (
      <Select
        size="sm"
        placeholder="Select value"
        value={selectedOption}
        options={valueOptions}
        onChange={(selected: any) => {
          setValue(selected?.value || '');
        }}
      />
    );
  }

  if (fieldType === 'number' || fieldType === 'Number') {
    return (
      <Input
        size="sm"
        type="number"
        placeholder="Enter value"
        value={value}
        onChange={(e: any) => setValue(e.target?.value ?? e)}
      />
    );
  }

  return (
    <Input
      size="sm"
      type="text"
      placeholder="Enter value"
      value={value}
      onChange={(e: any) => setValue(e.target?.value ?? e)}
    />
  );
}

function CreatableMultiInput({
  value,
  setValue,
}: {
  value: any;
  setValue: (val: any) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const currentValues = Array.isArray(value) ? value : [];
  const selectedTags = currentValues.map((v: any) => ({
    value: String(v),
    label: String(v),
  }));

  return (
    <Select
      size="sm"
      isMulti
      placeholder="Type and press Enter"
      value={selectedTags}
      componentAs={CreatableSelect}
      options={[]}
      inputValue={inputValue}
      onInputChange={(val: string, meta: any) => {
        if (meta.action !== 'input-blur' && meta.action !== 'menu-close') {
          setInputValue(val);
        }
      }}
      formatCreateLabel={(input: string) => `Add "${input}"`}
      createOptionPosition="first"
      onCreateOption={(input: string) => {
        setValue([...currentValues, input]);
        setInputValue('');
      }}
      onChange={(selected: any) => {
        setValue(selected ? selected.map((s: any) => s.value) : []);
      }}
    />
  );
}

export default ColumnHeaderFilter;
