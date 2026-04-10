'use client';

import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import classNames from '@/utils/classNames';
import { useEffect, useId, useState, type ReactNode } from 'react';

const DEFAULT_PICKER_FALLBACK = '#000000';

/**
 * Normalizes a string to a 6-digit hex for `<input type="color">` (supports #rgb, #rrggbb, #rrggbbaa).
 */
export function toPickerHex(
  value: string | undefined | null,
  fallback: string = DEFAULT_PICKER_FALLBACK
): string {
  if (!value) return fallback;
  const v = String(value).trim();
  const m6 = /^#([0-9A-Fa-f]{6})$/i.exec(v);
  if (m6) return v.toLowerCase();
  const m3 = /^#([0-9A-Fa-f]{3})$/i.exec(v);
  if (m3) {
    const [r, g, b] = m3[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const m8 = /^#([0-9A-Fa-f]{8})$/i.exec(v);
  if (m8) return `#${m8[1].slice(0, 6)}`.toLowerCase();
  return fallback;
}

const isValidHex = (hex: string): boolean =>
  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);

export type HexColorPickerControlProps = {
  value?: string;
  onChange?: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  colorInputClassName?: string;
  textInputClassName?: string;
};

/** Color swatch + hex text only (no label). Use inside custom layouts or dropdowns. */
export function HexColorPickerControl({
  value = '',
  onChange,
  disabled = false,
  className,
  colorInputClassName,
  textInputClassName,
}: HexColorPickerControlProps) {
  const colorInputId = useId();
  const displayHex = toPickerHex(value || undefined);
  const [hexTextInput, setHexTextInput] = useState(value || '');

  useEffect(() => {
    setHexTextInput(value || '');
  }, [value]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setHexTextInput(inputValue);
    if (isValidHex(inputValue)) {
      onChange?.(inputValue.toLowerCase());
    } else if (inputValue === '') {
      onChange?.('');
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    setHexTextInput(hexColor);
    onChange?.(hexColor);
  };

  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <input
        id="color-picker-input"
        type="color"
        value={displayHex}
        onChange={handleColorInputChange}
        disabled={disabled}
        className="size-9"
      />


      <Input
        type="text"
        value={hexTextInput}
        onChange={handleHexInputChange}
        placeholder="#3b82f6"
        disabled={disabled}
        className={classNames('relative flex-1 font-mono text-sm', textInputClassName)}
      />
    </div>
  );
}

export type HexColorPickerFieldProps = {
  value?: string;
  onChange?: (hex: string) => void;
  disabled?: boolean;
  label?: string;
  extra?: ReactNode;
  invalid?: boolean;
  errorMessage?: string;
  className?: string;
  colorInputClassName?: string;
  textInputClassName?: string;
};

/** Labeled field with validation messaging — same UX as project `color_code` and admin sources. */
export function HexColorPickerField({
  value = '',
  onChange,
  disabled = false,
  label = 'Color',
  extra,
  invalid,
  errorMessage,
  className,
  colorInputClassName,
  textInputClassName,
}: HexColorPickerFieldProps) {
  return (
    <FormItem
      label={label}
      extra={extra}
      invalid={invalid}
      errorMessage={errorMessage}
      className={className ?? 'text-sm'}
    >
      <HexColorPickerControl
        value={value}
        onChange={onChange}
        disabled={disabled}
        colorInputClassName={colorInputClassName}
        textInputClassName={textInputClassName}
      />
    </FormItem>
  );
}
