'use client';

import React from 'react';
import classNames from 'classnames';
import type { OptionProps } from 'react-select';
import Select from '../Select';
import ApolloIcon from '../ApolloIcon';
import type { GroupBase } from 'react-select';

const ADD_NEW_VALUE = '__add_new__';

export type BaseOption = {
  value: string;
  label: string;
  _id?: string;
  name?: string;
  [key: string]: unknown;
};

export interface AddNewOptionConfig {
  /** Label for the add-new option. Default: '+ Add new' */
  label?: string;
  /** Internal value. Default: '__add_new__' */
  value?: string;
  /** Tailwind color class for the label. Default: 'text-blue-600' */
  colorClass?: string;
}

export interface SelectWithAddOptionProps<O extends BaseOption = BaseOption> {
  options: O[];
  value: O | null;
  onChange: (option: O | null) => void;
  /** When the add-new option is selected, this value is passed to onChange. Parent should open create flow. */
  onAddNewSelect?: () => void;
  /** Add-new option config. Use false to disable. Omit or use {} for defaults. */
  addNewOption?: false | AddNewOptionConfig;
  /** When provided, shows edit (pen) icon on each option. Clicking calls onEdit(id, option). */
  onEdit?: (id: string, option: O) => void;
  /** Extract id for edit. Default: o => o._id ?? o.value */
  getEditId?: (option: O) => string | undefined;
  placeholder?: string;
  isClearable?: boolean;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  [key: string]: unknown;
}

function createAddNewOption(
  config: false | AddNewOptionConfig | undefined
): BaseOption | null {
  if (config === false) return null;
  const label = config?.label ?? '+ Add new';
  const value = config?.value ?? ADD_NEW_VALUE;
  return {
    value,
    label,
    isAddNew: true,
    [ADD_NEW_VALUE]: true,
  };
}

function SelectWithAddOptionInner<O extends BaseOption = BaseOption>(
  props: SelectWithAddOptionProps<O>
) {
  const {
    options: optionsProp,
    value,
    onChange,
    onAddNewSelect,
    addNewOption = {},
    onEdit,
    getEditId = (o) => (o._id as string | undefined) ?? o.value,
    placeholder,
    isClearable = true,
    id,
    disabled,
    invalid,
    className,
    ...rest
  } = props;

  const addNewOpt = createAddNewOption(addNewOption);
  const addNewValue = addNewOpt?.value ?? ADD_NEW_VALUE;
  const addNewColorClass =
    addNewOption && typeof addNewOption === 'object'
      ? (addNewOption.colorClass ?? 'text-blue-600')
      : 'text-blue-600';

  const options: O[] = React.useMemo(() => {
    if (!addNewOpt) return optionsProp;
    const addItem = addNewOpt as O;
    return [addItem, ...optionsProp];
  }, [optionsProp, addNewOpt]);

  const effectiveValue = React.useMemo(() => {
    if (!value || value.value === addNewValue) return null;
    return options.find((o) => o.value === value.value && o.value !== addNewValue) ?? value;
  }, [value, options, addNewValue]);

  const handleChange = React.useCallback(
    (opt: O | null) => {
      if (opt?.value === addNewValue) {
        onAddNewSelect?.();
        return;
      }
      onChange(opt);
    },
    [onChange, onAddNewSelect, addNewValue]
  );

  const OptionComponent = React.useCallback(
    (optionProps: OptionProps<O, false, GroupBase<O>>) => {
      const { data, label, innerProps, isSelected, isDisabled } = optionProps;
      const isAddNew =
        (data as O & { isAddNew?: boolean }).isAddNew ||
        (data as O & { [k: string]: unknown })[ADD_NEW_VALUE] ||
        data.value === addNewValue;

      const handlePenClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const editId = getEditId(data);
        if (editId && onEdit) {
          onEdit(editId, data);
        }
      };

      const showEdit = !isAddNew && onEdit && getEditId(data);

      return (
        <div
          className={classNames(
            'select-option flex cursor-pointer items-center justify-between px-3 py-2',
            !isDisabled && !isSelected && 'hover:bg-sand-4',
            isSelected ? 'bg-green-50 font-medium' : 'text-gray-700',
            isDisabled && 'cursor-not-allowed opacity-50'
          )}
          {...innerProps}
        >
          <span className={isAddNew ? addNewColorClass : ''}>{label}</span>
          {showEdit && (
            <button
              type="button"
              onClick={handlePenClick}
              className="ml-2 shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-ocean-2"
              aria-label="Edit"
            >
              <ApolloIcon name="pen" className="text-md" />
            </button>
          )}
        </div>
      );
    },
    [addNewValue, addNewColorClass, onEdit, getEditId]
  );

  return (
    <Select<O, false, GroupBase<O>>
      id={id}
      options={options}
      value={effectiveValue}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable={isClearable}
      isDisabled={disabled}
      invalid={invalid}
      className={className}
      components={{ Option: OptionComponent as React.ComponentType<OptionProps<O, false, GroupBase<O>>> }}
      {...rest}
    />
  );
}

const SelectWithAddOption = SelectWithAddOptionInner as <O extends BaseOption = BaseOption>(
  props: SelectWithAddOptionProps<O>
) => React.ReactElement;

export default SelectWithAddOption;
