import React, { ReactElement, memo } from 'react';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AsyncMultiSelect from '@/components/shared/AsyncMultiSelect';
import SelectComponent from '@/components/shared/SelectComponent';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { HexColorPickerField } from '@/components/shared/HexColorPicker';
import type { FieldDefinition, FieldType } from './types';
import type { TypeAttributes } from '@/components/ui/@types/common';

interface FormFieldProps {
  field: FieldDefinition;
  register: any; // UseFormRegister<any> is removed, so we need to adjust type
  control: any; // Control<any> is removed, so we need to adjust type
  errors: any; // FieldErrors<any> is removed, so we need to adjust type
  isLoading?: boolean;
  resetKey?: string | number; // Add resetKey to force remount
  getValues?: (name?: string) => any; // For accessing form values in callbacks
  setValue?: (name: string, value: any, options?: any) => void; // For setting form values in callbacks
}

const FormField = ({
  field,
  register,
  control,
  errors,
  isLoading,
  resetKey,
  getValues,
  setValue,
}: FormFieldProps) => {
  const commonProps = {
    placeholder: field.placeholder,
    disabled: field.disabled || isLoading,
  };

  const renderInput = () => (
    <Input
      size={field.size}
      {...register(field.name, {
        setValueAs:
          field.inputType === 'number'
            ? (value: any) => {
              if (value === '' || value === null || value === undefined) return undefined;
              // Convert German number format (comma as decimal separator) to standard format
              const normalizedValue = typeof value === 'string' ? value.replace(',', '.') : value;
              const num = parseFloat(normalizedValue);
              return isNaN(num) ? undefined : num;
            }
            : undefined,
      })}
      {...commonProps}
      textArea={field.type === 'textarea'}
      type="text"
      className={`text-sm`}
      step={field.step}
      onInput={
        field.inputType === 'number'
          ? (e: React.FormEvent<HTMLInputElement>) => {
            // Only allow digits, comma, dot, and minus sign for number inputs
            const target = e.target as HTMLInputElement;
            target.value = target.value.replace(/[^0-9,.-]/g, '');
          }
          : undefined
      }
    />
  );

  const renderSelect = () => {
    if (!field.options && field.type === 'select') {
      console.error('Select requires options prop');
      return null;
    }

    const selectProps = {
      ...commonProps,
      isMulti: field.isMulti,
      isClearable: field.isClearable,
      isDisabled: field.disabled || isLoading,
      size: (field.size || 'md') as TypeAttributes.ControlSize,
    };

    if (field.type === 'asyncSelect') {
      if (!field.apiUrl || !field.queryKey) {
        console.error('AsyncSelect requires apiUrl and queryKey props');
        return null;
      }

      return (
        <Controller
          key={`${field.name}-${resetKey}`}
          name={field.name}
          control={control}
          render={({ field: { onChange, value } }) => {
            const handleChange = (option: any, actionMeta?: any) => {
              if (field.disabled || isLoading) {
                return;
              }
              if (field.onAsyncSelectChange) {
                let onChangeCalled = false;
                const wrappedOnChange = (val: any) => {
                  onChangeCalled = true;
                  onChange(val);
                };

                field.onAsyncSelectChange(option, actionMeta, setValue, wrappedOnChange, value);

                if (!onChangeCalled) {
                  if (field.isMulti && Array.isArray(option)) {
                    onChange(option);
                  } else if (option && typeof option === 'object' && 'value' in option) {
                    onChange(option);
                  } else {
                    onChange(null);
                  }
                }
              } else {
                if (field.isMulti && Array.isArray(option)) {
                  onChange(option);
                } else if (option && typeof option === 'object' && 'value' in option) {
                  onChange(option);
                } else {
                  onChange(null);
                }
              }
            };

            const mergedComponents = field.customComponents
              ? { ...field.customComponents }
              : undefined;

            return (
              <AsyncMultiSelect
                {...selectProps}
                value={value}
                onChange={handleChange}
                api_url={field.apiUrl || ''}
                queryKey={field.queryKey || ''}
                optLabelKey={field.optLabelKey}
                optValueKey={field.optValueKey}
                searchKey={field.searchKey}
                maxMenuHeight={field.maxMenuHeight}
                sidebarVisible={field.sidebarVisible}
                formatOptionLabel={field.formatOptionLabel}
                components={mergedComponents}
              />
            );
          }}
        />
      );
    }

    if (field.type === 'asyncSelectSingle') {
      if (!field.apiUrl || !field.queryKey) {
        console.error('AsyncSelectSingle requires apiUrl and queryKey props');
        return null;
      }

      return (
        <Controller
          key={`${field.name}-${resetKey}`} // Force remount on reset
          name={field.name}
          control={control}
          render={({ field: { onChange, value } }) => {
            return (
              <SelectComponent
                placeholder={field.placeholder}
                isDisabled={field.disabled || isLoading}
                isClearable={field.isClearable}
                size={selectProps.size}
                value={value}
                onChange={(option: any) => {
                  if (option && typeof option === 'object' && 'value' in option) {
                    onChange(option.value);
                  } else {
                    onChange(option);
                  }
                }}
                apiUrl={field.apiUrl || ''}
                queryKey={field.queryKey || ''}
                optLabelKey={field.optLabelKey}
                optValueKey={field.optValueKey}
                field={{ name: field.name }}
              />
            );
          }}
        />
      );
    }

    return (
      <Controller
        key={`${field.name}-${resetKey}`} // Force remount on reset
        name={field.name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <Select
            {...selectProps}
            value={field.options?.find((option: any) => option.value === value)}
            onChange={(option) => {
              if (field.isMulti && Array.isArray(option)) {
                onChange(option.map((opt: any) => opt.value));
              } else if (option && typeof option === 'object' && 'value' in option) {
                onChange(option.value);
              } else {
                onChange(undefined);
              }
            }}
            options={field.options}
          />
        )}
      />
    );
  };

  const renderDate = () => <Input {...register(field.name)} {...commonProps} type="date" />;

  const renderDatePicker = () => (
    <Controller
      key={`${field.name}-${resetKey}`}
      name={field.name}
      control={control}
      render={({ field: { onChange, value } }) => {
        // Parse the date correctly, accounting for timezone offset
        const parseDate = (val: any) => {
          if (!val) return undefined;
          if (val instanceof Date) return val;
          // For YYYY-MM-DD string format, create date at local midnight
          const [year, month, day] = val.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        // Format date to YYYY-MM-DD in local timezone
        const formatDate = (date: Date | undefined) => {
          if (!date) return undefined;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return (
          <DatePicker
            value={parseDate(value)}
            onChange={(date) => onChange(formatDate(date))}
            placeholder={field.placeholder}
            disabled={field.disabled || isLoading}
          />
        );
      }}
    />
  );

  const renderTimePicker = () => (
    <Controller
      key={`${field.name}-${resetKey}`}
      name={field.name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <TimePicker
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          disabled={field.disabled || isLoading}
          format={field.timeFormat}
          precision={field.timePrecision}
          displayFormat={field.timeDisplayFormat}
        />
      )}
    />
  );

  const renderColor = () => (
    <Controller
      key={`${field.name}-${resetKey}`}
      name={field.name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <HexColorPickerField
          value={value || ''}
          onChange={onChange}
          disabled={field.disabled || isLoading}
          label={field.label}
          errorMessage={error?.message}
          invalid={!!error}
        />
      )}
    />
  );

  const renderCustom = () => {
    if (field.customRender) {
      return <>{field.customRender()}</>;
    }
    return null;
  };

  const fieldComponents: Record<FieldType, () => ReactElement | null> = {
    input: renderInput,
    textarea: renderInput,
    select: renderSelect,
    asyncSelect: renderSelect,
    asyncSelectSingle: renderSelect,
    date: renderDate,
    datepicker: renderDatePicker,
    timepicker: renderTimePicker,
    color: renderColor,
    custom: renderCustom,
  };

  const renderComponent = fieldComponents[field.type];

  // For custom fields, render without FormItem wrapper
  if (field.type === 'custom') {
    return <>{renderComponent()}</>;
  }

  // For color fields, HexColorPickerField already includes FormItem wrapper
  if (field.type === 'color') {
    return <>{renderComponent()}</>;
  }

  return (
    <FormItem
      label={field.label}
      invalid={!!errors[field.name]}
      errorMessage={errors[field.name]?.message as string}
    >
      {renderComponent()}
    </FormItem>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(FormField);
