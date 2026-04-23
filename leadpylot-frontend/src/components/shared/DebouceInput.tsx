import Input from '@/components/ui/Input';
import useDebounce from '@/utils/hooks/useDebounce';
import type { ChangeEvent, Ref } from 'react';
import type { InputProps } from '@/components/ui/Input';
import { useState, useImperativeHandle, forwardRef, useRef, useCallback, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import classNames from '@/utils/classNames';

type DebouceInputProps = InputProps & {
  wait?: number;
  ref?: Ref<HTMLInputElement | DebounceInputRef>;
  allowClear?: boolean;
};

export interface DebounceInputRef {
  clear: () => void;
  focus: () => void;
  blur: () => void;
}

const DebouceInput = forwardRef<DebounceInputRef, DebouceInputProps>((props, ref) => {
  const { wait = 500, allowClear = true, value, defaultValue, onChange, ...rest } = props;
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value prop when it changes (for controlled inputs)
  // This is necessary to keep the input in sync when the value prop changes externally
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleDebounceFn(value: ChangeEvent<HTMLInputElement>) {
    onChange?.(value);
  }

  const debounceFn = useDebounce(handleDebounceFn, wait);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debounceFn(e);
  };

  const handleClear = useCallback(() => {
    setInputValue('');
    // Create a synthetic event to trigger onChange with empty value
    const syntheticEvent = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
  }, [onChange]);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      clear: handleClear,
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }),
    [handleClear]
  );

  const showClearButton = allowClear && inputValue && inputValue.toString().length > 0;

  return (
    <div className="relative w-full">
      <Input
        className={classNames('w-full', rest.className)}
        ref={inputRef}
        {...rest}
        value={inputValue}
        onChange={handleInputChange}
        suffix={
          showClearButton ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-4 w-4 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 dark:text-[var(--dm-text-muted)] dark:hover:text-[var(--dm-text-primary)]"
              aria-label="Clear input"
            >
              <HiX size={14} />
            </button>
          ) : (
            rest.suffix
          )
        }
      />
    </div>
  );
});

DebouceInput.displayName = 'DebouceInput';

export default DebouceInput;
