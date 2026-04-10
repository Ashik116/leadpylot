import { BANK_OPTION_STYLES, BANK_STATE_TEXT_STYLES } from '@/app/(protected-pages)/admin/banks/_components/BANK_STATE_BADGE_STYLES';
import classNames from 'classnames';
// import { HiCheck } from 'react-icons/hi';
import type { ReactNode } from 'react';
import type { OptionProps as ReactSelectOptionProps } from 'react-select';



const DEFAULT_BADGE_STYLE = 'bg-sand-3 text-sand-9';

type DefaultOptionProps<T> = {
  customLabel?: (data: T, label: string) => ReactNode;
  fileName?: string;
};


const Option = <T,>(props: ReactSelectOptionProps<T> & DefaultOptionProps<T>) => {
  const { innerProps, label, isSelected, isDisabled, data, customLabel } = props;
  const fieldName = (props as any)?.selectProps?.fileName as string | undefined;
  const stateValue = (data as any)?.state as string | undefined;
  const badgeClass = stateValue
    ? BANK_OPTION_STYLES[stateValue.toLowerCase()] || DEFAULT_BADGE_STYLE
    : undefined;
  const textClass = stateValue
    ? BANK_STATE_TEXT_STYLES[stateValue.toLowerCase()] || ''
    : '';
  return (
    <div
      className={classNames(
        'select-option',
        !isDisabled && !isSelected && 'hover:bg-sand-4',
        isSelected && 'bg-sand-1 text-white',
        isDisabled && 'cursor-not-allowed opacity-50'
      )}
      {...innerProps}
    >
      {customLabel ? customLabel(data, label) : (
        <div className={classNames(`flex items-center justify-between w-full`)}>

          <div className={`ml-2 flex items-center ${textClass}`}>
            {fieldName === "bank_id" && stateValue && (
              <p className={`w-3 h-3 rounded-full mr-1 ${badgeClass}`} />
            )}
            {label}</div>
          {/* {fieldName === "bank_id" && stateValue && (
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium capitalize ${badgeClass}`}>{stateValue}</span>
          )} */}
        </div>
      )}
      {/* {isSelected && <HiCheck className="text-xl" />} */}
    </div>
  );
};

export default Option;
