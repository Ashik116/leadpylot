import { useContext, useCallback, useState } from 'react';
import classNames from 'classnames';
import CheckboxGroupContext from './context';
import type { CommonProps } from '../@types/common';
import type { CheckboxValue } from './context';
import type { ChangeEvent, Ref } from 'react';

export interface CheckboxProps extends CommonProps {
  checked?: boolean;
  checkboxClass?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  labelRef?: Ref<HTMLLabelElement>;
  name?: string;
  onChange?: (values: boolean, e: ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  ref?: Ref<HTMLInputElement>;
  value?: CheckboxValue;
}

const Checkbox = (props: CheckboxProps) => {
  const {
    name: nameContext,
    value: groupValue,
    onChange: onGroupChange,
  } = useContext(CheckboxGroupContext);

  const {
    checked: controlledChecked,
    className,
    onChange,
    children,
    disabled,
    readOnly,
    name = nameContext,
    defaultChecked,
    value,
    labelRef,
    ref,
    ...rest
  } = props;

  // Determine if this is a controlled component
  const isControlled = typeof controlledChecked !== 'undefined';
  const isInGroup = typeof groupValue !== 'undefined' && typeof value !== 'undefined';

  // Initialize the internal state with a safe default value
  const [checkboxChecked, setCheckboxChecked] = useState(() => {
    if (isInGroup) {
      return groupValue.some((i) => i === value) || false;
    }
    return defaultChecked || false;
  });

  const getControlProps = () => {
    // For group checkboxes
    if (isInGroup) {
      return { checked: groupValue.includes(value as never) };
    }

    // For controlled checkboxes (outside of a group)
    if (isControlled) {
      return { checked: controlledChecked };
    }

    // For uncontrolled checkboxes
    return { defaultChecked };
  };

  const controlProps = getControlProps();

  const onCheckboxChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled || readOnly) {
        return;
      }

      // Determine the next checked state
      let nextChecked: boolean;

      if (isInGroup) {
        // For group checkboxes
        nextChecked = !groupValue.includes(value as never);
      } else if (isControlled) {
        // For controlled checkboxes, we use the inverse of the current controlled value
        nextChecked = !controlledChecked;
      } else {
        // For uncontrolled checkboxes
        nextChecked = !checkboxChecked;
        // Only update internal state for uncontrolled components
        setCheckboxChecked(nextChecked);
      }

      // Call the appropriate callbacks
      onChange?.(nextChecked, e);
      if (isInGroup) {
        onGroupChange?.(value as CheckboxValue, nextChecked, e);
      }
    },
    [
      isControlled,
      isInGroup,
      controlledChecked,
      checkboxChecked,
      disabled,
      readOnly,
      setCheckboxChecked,
      onChange,
      value,
      onGroupChange,
      groupValue,
    ]
  );

  const checkboxColorClass = disabled && 'disabled';
  const labelDefaultClass = `checkbox-label`;
  const labelDisabledClass = disabled && 'disabled';

  const labelClass = classNames(labelDefaultClass, labelDisabledClass);

  return (
    <label ref={labelRef} className={`cursor-pointer ${labelClass}`}>
      <span className="checkbox-wrapper relative">
        <input
          ref={ref}
          className={classNames('checkbox rounded-none border-none', checkboxColorClass, className)}
          type="checkbox"
          disabled={disabled}
          readOnly={readOnly}
          name={name}
          onChange={onCheckboxChange}
          {...controlProps}
          {...rest}
        />
      </span>
      {children ? (
        <span className={classNames(disabled ? 'opacity-50' : '')}>{children}</span>
      ) : null}
    </label>
  );
};

export default Checkbox;
