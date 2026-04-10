'use client';

import { HexColorPickerField } from '@/components/shared/HexColorPicker';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

type SourceColorFormItemProps<T extends FieldValues> = {
  control: Control<T>;
  disabled?: boolean;
  errorMessage?: string;
  invalid?: boolean;
  name: Path<T>;
};

/** Source create / update / details — uses shared HexColorPickerField (same as project color_code). */
export function SourceColorFormItem<T extends FieldValues>({
  control,
  disabled,
  errorMessage,
  invalid,
  name,
}: SourceColorFormItemProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <HexColorPickerField
          label="Color"
          extra="Optional hex, e.g. #3B82F6"
          value={field.value ?? ''}
          onChange={field.onChange}
          disabled={disabled}
          invalid={invalid}
          errorMessage={errorMessage}
        />
      )}
    />
  );
}
