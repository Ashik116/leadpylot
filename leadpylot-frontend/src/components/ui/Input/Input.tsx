'use client';
import { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { useConfig } from '../ConfigProvider';
import { useForm, useFormItem } from '../Form/context';
import { useInputGroup } from '../InputGroup/context';
import { CONTROL_SIZES } from '../utils/constants';
import type { CommonProps, TypeAttributes } from '../@types/common';
import type {
  InputHTMLAttributes,
  ElementType,
  ReactNode,
  HTMLInputTypeAttribute,
  ClassAttributes,
  Ref,
} from 'react';

export interface InputProps
  extends CommonProps,
  Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size' | 'prefix'> {
  asElement?: ElementType;
  disabled?: boolean;
  invalid?: boolean;
  prefix?: string | ReactNode;
  rows?: number;
  ref?: Ref<ElementType | HTMLInputElement | HTMLTextAreaElement>;
  size?: TypeAttributes.ControlSize;
  suffix?: string | ReactNode;
  textArea?: boolean;
  type?: HTMLInputTypeAttribute;
  unstyle?: boolean;
  allowClear?: boolean;
}

const Input = (props: InputProps) => {
  const {
    asElement: Component = 'input',
    className,
    disabled,
    invalid,
    prefix,
    size,
    suffix,
    textArea,
    type = 'text',
    ref,
    rows,
    style,
    unstyle = false,
    // allowClear = false,
    ...rest
  } = props;

  // Initialize with a reasonable default that matches typical icon + padding size
  const [prefixGutter, setPrefixGutter] = useState(prefix ? 18 : 0);
  const [suffixGutter, setSuffixGutter] = useState(suffix ? 18 : 0);
  const [internalError, setInternalError] = useState<string | null>(null);

  const { controlSize, direction } = useConfig();
  const formControlSize = useForm()?.size;
  const formItemInvalid = useFormItem()?.invalid;
  const inputGroupSize = useInputGroup()?.size;

  const inputSize = size || inputGroupSize || formControlSize || controlSize;

  const isInputInvalid = invalid || formItemInvalid;

  const fixControlledValue = (val: string | number | readonly string[] | undefined) => {
    if (typeof val === 'undefined' || val === null) {
      return '';
    }
    return val;
  };

  if ('value' in props) {
    rest.value = fixControlledValue(props.value);
    delete rest.defaultValue;
  }

  const inputDefaultClass = 'input';
  const inputSizeClass = `input-${inputSize} ${CONTROL_SIZES[inputSize].h}`;
  const inputFocusClass = `focus:ring-sand-3 focus-within:ring-sand-3 focus-within:border-sand-3 focus:border-sand-3`;
  const inputWrapperClass = classNames('input-wrapper', prefix || suffix ? className : '');
  const inputClass = classNames(
    inputDefaultClass,
    !textArea && inputSizeClass,
    !isInputInvalid && inputFocusClass,
    !prefix && !suffix ? className : '',
    disabled && 'input-disabled',
    isInputInvalid && 'input-invalid',
    textArea && 'input-textarea'
  );

  const prefixNode = useRef<HTMLDivElement>(null);
  const suffixNode = useRef<HTMLDivElement>(null);
  const prefixMeasuredRef = useRef<number | null>(null);
  const suffixMeasuredRef = useRef<number | null>(null);
  const prefixExistsRef = useRef<boolean>(!!prefix);
  const suffixExistsRef = useRef<boolean>(!!suffix);
  const isMeasuringPrefixRef = useRef<boolean>(false);
  const isMeasuringSuffixRef = useRef<boolean>(false);

  const measurePrefix = (node: HTMLDivElement | null) => {
    if (isMeasuringPrefixRef.current && !node) return;
    prefixNode.current = node;
    if (node) {
      isMeasuringPrefixRef.current = true;
      const width = node.offsetWidth;
      if (width > 0) {
        if (prefixMeasuredRef.current === null || Math.abs(prefixMeasuredRef.current - width) > 1) {
          prefixMeasuredRef.current = width;
          setPrefixGutter((prev) => (Math.abs(prev - width) > 1 ? width : prev));
        }
        isMeasuringPrefixRef.current = false;
      } else {
        requestAnimationFrame(() => {
          if (prefixNode.current === node) {
            const measuredWidth = node.offsetWidth;
            if (measuredWidth > 0) {
              if (prefixMeasuredRef.current === null || Math.abs(prefixMeasuredRef.current - measuredWidth) > 1) {
                prefixMeasuredRef.current = measuredWidth;
                setPrefixGutter((prev) => (Math.abs(prev - measuredWidth) > 1 ? measuredWidth : prev));
              }
            }
            isMeasuringPrefixRef.current = false;
          }
        });
      }
    } else {
      const hasPrefix = !!prefix;
      if (prefixExistsRef.current !== hasPrefix) {
        prefixExistsRef.current = hasPrefix;
        prefixMeasuredRef.current = null;
        const newValue = hasPrefix ? 32 : 0;
        setPrefixGutter((prev) => (prev !== newValue ? newValue : prev));
      }
    }
  };

  const measureSuffix = (node: HTMLDivElement | null) => {
    if (isMeasuringSuffixRef.current && !node) return;
    suffixNode.current = node;
    if (node) {
      isMeasuringSuffixRef.current = true;
      const width = node.offsetWidth;
      if (width > 0) {
        if (suffixMeasuredRef.current === null || Math.abs(suffixMeasuredRef.current - width) > 1) {
          suffixMeasuredRef.current = width;
          setSuffixGutter((prev) => (Math.abs(prev - width) > 1 ? width : prev));
        }
        isMeasuringSuffixRef.current = false;
      } else {
        requestAnimationFrame(() => {
          if (suffixNode.current === node) {
            const measuredWidth = node.offsetWidth;
            if (measuredWidth > 0) {
              if (suffixMeasuredRef.current === null || Math.abs(suffixMeasuredRef.current - measuredWidth) > 1) {
                suffixMeasuredRef.current = measuredWidth;
                setSuffixGutter((prev) => (Math.abs(prev - measuredWidth) > 1 ? measuredWidth : prev));
              }
            }
            isMeasuringSuffixRef.current = false;
          }
        });
      }
    } else {
      const hasSuffix = !!suffix;
      if (suffixExistsRef.current !== hasSuffix) {
        suffixExistsRef.current = hasSuffix;
        suffixMeasuredRef.current = null;
        const newValue = hasSuffix ? 32 : 0;
        setSuffixGutter((prev) => (prev !== newValue ? newValue : prev));
      }
    }
  };

  const getAffixSize = () => {
    if (prefixNode.current) {
      const width = prefixNode.current.offsetWidth;
      if (width > 0 && (prefixMeasuredRef.current === null || Math.abs(prefixMeasuredRef.current - width) > 1)) {
        prefixMeasuredRef.current = width;
        setPrefixGutter(width);
      }
    }
    if (suffixNode.current) {
      const width = suffixNode.current.offsetWidth;
      if (width > 0 && (suffixMeasuredRef.current === null || Math.abs(suffixMeasuredRef.current - width) > 1)) {
        suffixMeasuredRef.current = width;
        setSuffixGutter(width);
      }
    }
  };

  useEffect(() => {
    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;
    const prefixChanged = prefixExistsRef.current !== hasPrefix;
    const suffixChanged = suffixExistsRef.current !== hasSuffix;

    if (hasPrefix || hasSuffix) {
      if (prefixChanged || suffixChanged) {
        if (prefixChanged) {
          prefixExistsRef.current = hasPrefix;
          prefixMeasuredRef.current = null;
        }
        if (suffixChanged) {
          suffixExistsRef.current = hasSuffix;
          suffixMeasuredRef.current = null;
        }
      }
      const rafId = requestAnimationFrame(() => getAffixSize());
      return () => cancelAnimationFrame(rafId);
    } else {
      if (prefixExistsRef.current || suffixExistsRef.current) {
        prefixExistsRef.current = false;
        suffixExistsRef.current = false;
        prefixMeasuredRef.current = null;
        suffixMeasuredRef.current = null;
        requestAnimationFrame(() => {
          setPrefixGutter(0);
          setSuffixGutter(0);
        });
      }
    }
  }, [prefix, suffix]);

  const remToPxConvertion = (pixel: number) => 0.0625 * pixel;

  const affixGutterStyle = () => {
    const leftGutter = prefixGutter > 0 ? `${remToPxConvertion(prefixGutter) + 1}rem` : undefined;
    const rightGutter = suffixGutter > 0 ? `${remToPxConvertion(suffixGutter) + 1}rem` : undefined;
    const gutterStyle: { paddingLeft?: string; paddingRight?: string } = {};

    if (direction === 'ltr') {
      if (prefix && leftGutter) gutterStyle.paddingLeft = leftGutter;
      if (suffix && rightGutter) gutterStyle.paddingRight = rightGutter;
    } else if (direction === 'rtl') {
      if (prefix && leftGutter) gutterStyle.paddingRight = leftGutter;
      if (suffix && rightGutter) gutterStyle.paddingLeft = rightGutter;
    }
    return gutterStyle;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;

    if (type === 'number' && value !== '' && value !== '-' && value !== '.') {
      const numValue = Number(value);
      const minVal = props.min !== undefined ? Number(props.min) : -Infinity;
      const maxVal = props.max !== undefined ? Number(props.max) : Infinity;

      if (!isNaN(numValue)) {
        if (numValue > maxVal) {
          setInternalError(`Maximum value is ${maxVal}`);
          return;
        }
        if (minVal >= 0 && numValue < 0) {
          setInternalError(`Minimum value is ${minVal}`);
          return;
        }
        if (numValue < minVal) {
          setInternalError(`Minimum value is ${minVal}`);
        } else {
          setInternalError(null);
        }
      } else {
        setInternalError(null);
      }
    } else {
      setInternalError(null);
    }

    if (props.onChange) {
      props.onChange(e);
    }
  };

  const inputProps = {
    className: !unstyle ? inputClass : '',
    disabled,
    type,
    ref,
    ...rest,
    onChange: handleValueChange,
  };

  const { multiple, ...textAreaProps } = inputProps;

  const renderTextArea = (
    <textarea
      style={style}
      rows={rows}
      {...(textAreaProps as ClassAttributes<HTMLTextAreaElement>)}
    ></textarea>
  );

  const renderInput = <Component style={{ ...affixGutterStyle(), ...style }} {...inputProps} />;

  const renderAffixInput = (
    <span className={inputWrapperClass}>
      {prefix ? (
        <div ref={measurePrefix} className="input-suffix-start">
          {' '}
          {prefix}{' '}
        </div>
      ) : null}
      {renderInput}
      {suffix ? (
        <div ref={measureSuffix} className="input-suffix-end">
          {suffix}
        </div>
      ) : null}
    </span>
  );

  const renderChildren = () => {
    return (
      <div className="flex flex-col w-full">
        {textArea ? renderTextArea : (prefix || suffix ? renderAffixInput : renderInput)}
        {internalError && (
          <div className="text-red-500 text-xs mt-1 transition-all duration-200">
            {internalError}
          </div>
        )}
      </div>
    );
  };

  return renderChildren();
};

export default Input;
