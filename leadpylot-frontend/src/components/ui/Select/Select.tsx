/* eslint-disable @typescript-eslint/no-unused-vars */
import cn from '../utils/classNames';
import ReactSelect from 'react-select';
import CreatableSelect from 'react-select/creatable';
import AsyncSelect from 'react-select/async';
import { useConfig } from '../ConfigProvider';
import { useForm, useFormItem } from '../Form/context';
import { useInputGroup } from '../InputGroup/context';
import DefaultOption from './Option';
import Spinner from '../Spinner/Spinner';
import { CONTROL_SIZES } from '../utils/constants';
import type { CommonProps, TypeAttributes } from '../@types/common';
import type {
  Props as ReactSelectProps,
  StylesConfig,
  ClassNamesConfig,
  GroupBase,
} from 'react-select';
import type { AsyncProps } from 'react-select/async';
import type { CreatableProps } from 'react-select/creatable';
import type { Ref, JSX } from 'react';
import ApolloIcon from '../ApolloIcon';
import { useModalDetection } from '@/utils/hooks/useModalDetection';

const DefaultDropdownIndicator = () => {
  return (
    <div className="select-dropdown-indicator">
      <ApolloIcon name="chevron-arrow-down" />
    </div>
  );
};

interface DefaultClearIndicatorProps {
  innerProps: JSX.IntrinsicElements['div'];
  ref: Ref<HTMLElement>;
}

const DefaultClearIndicator = ({
  innerProps: { ref, ...restInnerProps },
}: DefaultClearIndicatorProps) => {
  return (
    <div {...restInnerProps} ref={ref}>
      <div className="select-clear-indicator">
        <ApolloIcon name="cross" />
      </div>
    </div>
  );
};

interface DefaultLoadingIndicatorProps {
  selectProps: { themeColor?: string };
}

const DefaultLoadingIndicator = ({ selectProps }: DefaultLoadingIndicatorProps) => {
  const { themeColor } = selectProps;
  return <Spinner className={`select-loading-indicatior text-${themeColor}`} />;
};

const MultiSelectOption = (props: any) => {
  const { innerProps, label, isSelected, isDisabled } = props;
  return (
    <div
      className={cn(
        'select-option flex cursor-pointer items-center justify-between px-3 py-2',
        !isDisabled && !isSelected && 'hover:bg-sand-4',
        isSelected ? 'bg-green-50 font-medium' : 'text-gray-700',
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
      {...innerProps}
    >
      <span>{label}</span>
      {isSelected && <ApolloIcon name="check" className="h-4 w-4 text-green-600" />}
    </div>
  );
};

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = CommonProps &
  ReactSelectProps<Option, IsMulti, Group> &
  AsyncProps<Option, IsMulti, Group> &
  CreatableProps<Option, IsMulti, Group> & {
    invalid?: boolean;
    size?: TypeAttributes.ControlSize;
    menuPortalTarget?: Element | null;
    field?: any;
    componentAs?: ReactSelect | CreatableSelect | AsyncSelect;
    optionsClassName?: string;
    fileName?: string;
    selectMultipleOptions?: boolean;
  };

function Select<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group>) {
  const {
    components,
    componentAs: Component = ReactSelect,
    size,
    styles,
    className,
    classNames,
    field,
    invalid,
    menuPortalTarget,
    optionsClassName,
    fileName,
    selectMultipleOptions,
    ...rest
  } = props;

  const { controlSize } = useConfig();
  const formControlSize = useForm()?.size;
  const formItemInvalid = useFormItem()?.invalid;
  const inputGroupSize = useInputGroup()?.size;
  const { selectRef, isInModal } = useModalDetection();

  const selectSize = (size ||
    inputGroupSize ||
    formControlSize ||
    controlSize) as keyof typeof CONTROL_SIZES;

  const isSelectInvalid = invalid || formItemInvalid;

  const selectClass = cn(`select select-${selectSize}`, className);
  // Dynamically determine menuPortalTarget
  const getMenuPortalTarget = () => {
    // If explicitly provided, use it
    if (menuPortalTarget !== undefined) {
      return menuPortalTarget;
    }

    // If not in browser, return null
    if (typeof document === 'undefined') {
      return null;
    }

    // If in modal, use document.body to ensure dropdown appears on top
    if (isInModal) {
      return document.parentElement;
    }

    // Default case: use document.documentElement (which is more reliable than parentElement)
    return document.parentElement;
  };

  return (
    <div ref={selectRef}>
      <Component<Option, IsMulti, Group>
        fileName={fileName}
        className={selectClass}
        classNames={
          {
            control: (state) =>
              cn(
                'select-control',
                CONTROL_SIZES[selectSize].minH,
                state.isDisabled && 'opacity-50 cursor-not-allowed',
                (() => {
                  const classes: string[] = ['bg-white'];

                  const { isFocused } = state;

                  if (isFocused) {
                    classes.push('select-control-focused ring-1 ring-border border-border');
                  }

                  if (isSelectInvalid) {
                    classes.push('select-control-invalid');
                  }

                  if (isFocused && isSelectInvalid) {
                    classes.push('ring-rust border-rust');
                  }

                  return classes;
                })()
              ),

            valueContainer: ({ isMulti, hasValue, selectProps }) =>
              cn(
                'select-value-container',
                isMulti && hasValue && selectProps.controlShouldRenderValue
                  ? 'flex text-nowrap'
                  : 'flex items-center'
              ),
            input: ({ value, isDisabled }) =>
              cn(
                'select-input-container',
                isDisabled ? 'invisible' : 'visible',
                value ? '[transform:translateZ(0)]' : 'absolute'
              ),
            placeholder: () =>
              cn('select-placeholder', isSelectInvalid ? 'text-rust' : 'text-sand-2'),
            indicatorsContainer: () => 'select-indicators-container',
            singleValue: () => 'select-single-value',
            multiValue: () => cn('select-multi-value', 'bg-sand-4 border-0 shadow-inner'),
            multiValueLabel: () => 'select-multi-value-label',
            multiValueRemove: () => 'select-multi-value-remove',
            menu: () => cn('select-menu', optionsClassName),
            ...classNames,
          } as ClassNamesConfig<Option, IsMulti, Group>
        }
        classNamePrefix={'select'}
        styles={
          {
            control: () => ({}),
            valueContainer: () => ({}),
            input: ({ margin, paddingTop, paddingBottom, ...provided }) => ({ ...provided }),
            placeholder: () => ({}),
            singleValue: () => ({}),
            multiValue: () => ({}),
            multiValueLabel: () => ({}),
            multiValueRemove: () => ({}),
            groupHeading: (base) => ({
              ...base,
              color: selectMultipleOptions ? '#16a34a' : base.color,
              fontWeight: selectMultipleOptions ? '600' : base.fontWeight,
            }),
            menu: ({
              backgroundColor,
              marginTop,
              marginBottom,
              border,
              borderRadius,
              boxShadow,
              ...provided
            }) => ({
              ...provided,
              zIndex: isInModal ? 9999 : 9999, // Higher z-index for modals
              minWidth: optionsClassName ? optionsClassName : 'auto',
            }),
            ...styles,
          } as StylesConfig<Option, IsMulti, Group>
        }
        components={{
          IndicatorSeparator: () => null,
          Option: selectMultipleOptions ? MultiSelectOption : DefaultOption,
          LoadingIndicator: DefaultLoadingIndicator,
          DropdownIndicator: props?.isClearable
            ? DefaultDropdownIndicator
            : DefaultDropdownIndicator,
          ClearIndicator: DefaultClearIndicator,
          ...components,
        }}
        isMulti={selectMultipleOptions || (rest as any).isMulti}
        closeMenuOnSelect={selectMultipleOptions ? false : (rest as any).closeMenuOnSelect}
        hideSelectedOptions={selectMultipleOptions ? false : (rest as any).hideSelectedOptions}
        menuPortalTarget={getMenuPortalTarget()}
        ariaLabel="Select option"
        screenReaderStatus={() => null}
        {...field}
        {...rest}
      />
    </div>
  );
}

export default Select;