'use client';

import { HexColorPickerField } from '@/components/shared/HexColorPicker';

interface UserColorPickerProps {
  value?: string;
  onChange?: (hexColor: string) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
}

const UserColorPicker = ({
  value = '',
  onChange,
  disabled = false,
  label = 'Color Code',
  error,
}: UserColorPickerProps) => {
  return (
    <HexColorPickerField
      value={value}
      onChange={onChange}
      disabled={disabled}
      label={label}
      invalid={!!error}
      errorMessage={error}
    />
  );
};

export default UserColorPicker;
