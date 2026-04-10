import React, { useRef, useEffect, useState } from 'react';
import ReactSelect, { StylesConfig, MenuPosition } from 'react-select';
import cn from '@/components/ui/utils/classNames';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface ReactSelectWrapperProps {
    options: SelectOption[];
    value?: SelectOption | null;
    onChange?: (value: SelectOption | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    optionsClassName?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    menuPosition?: MenuPosition;
    menuIsOpen?: boolean;
    onMenuClose?: () => void;
}

const ReactSelectWrapper: React.FC<ReactSelectWrapperProps> = ({
    options = [],
    value,
    onChange,
    placeholder = 'Select option...',
    disabled = false,
    className = '',
    optionsClassName = '',
    size = 'md',
    menuPosition = 'bottom' as MenuPosition,
    menuIsOpen: controlledMenuIsOpen,
    onMenuClose,
}) => {
    const selectRef = useRef<HTMLDivElement>(null);
    const [parentWidth, setParentWidth] = useState<number>(0);

    // Calculate parent width for proper dropdown sizing
    useEffect(() => {
        const updateWidth = () => {
            if (selectRef.current) {
                const width = selectRef.current.getBoundingClientRect().width;
                setParentWidth(width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Size configurations
    const sizeConfig = {
        xs: {
            control: 'min-h-[24px] text-xs px-2 py-1',
            option: 'px-2 py-1 text-xs',
            placeholder: 'text-xs'
        },
        sm: {
            control: 'min-h-[32px] text-sm px-3 py-1.5',
            option: 'px-3 py-1.5 text-sm',
            placeholder: 'text-sm'
        },
        md: {
            control: 'min-h-[40px] text-sm px-3 py-2',
            option: 'px-3 py-2 text-sm',
            placeholder: 'text-sm'
        },
        lg: {
            control: 'min-h-[48px] text-base px-4 py-2.5',
            option: 'px-4 py-2.5 text-base',
            placeholder: 'text-base'
        },
    };


    // Custom styles for react-select using proper react-select styling approach
    const customStyles: StylesConfig<SelectOption, false> = {
        control: (provided, state) => ({
            ...provided,
            minHeight: 'auto',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: state.isFocused ? '0 0 0 2px #3b82f6' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            '&:hover': {
                borderColor: '#9ca3af',
            },
        }),
        valueContainer: (provided) => ({
            ...provided,
            padding: '0',
        }),
        input: (provided) => ({
            ...provided,
            margin: '0',
            padding: '0',
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#6b7280',
            margin: '0',
        }),
        singleValue: (provided) => ({
            ...provided,
            margin: '0',
            color: '#111827',
        }),
        menu: (provided) => ({
            ...provided,
            position: 'fixed',
            zIndex: 999999,
            width: parentWidth ? `${parentWidth}px` : 'auto',
            minWidth: parentWidth ? `${parentWidth}px` : 'auto',
        }),
        menuList: (provided) => ({
            ...provided,
            padding: '4px 0',
            maxHeight: '240px',
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#dbeafe' : state.isFocused ? '#f3f4f6' : 'white',
            color: state.isSelected ? '#1e40af' : '#111827',
            cursor: 'pointer',
            padding: '8px 12px',
            '&:hover': {
                backgroundColor: state.isSelected ? '#bfdbfe' : '#f3f4f6',
            },
        }),
        indicatorSeparator: () => ({
            display: 'none',
        }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: '#6b7280',
            padding: '8px',
            '&:hover': {
                color: '#374151',
            },
        }),
    };


    return (
        <div ref={selectRef} className={cn('w-full', className)}>
            <ReactSelect
                options={options}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                isDisabled={disabled}
                isSearchable={false}
                menuIsOpen={controlledMenuIsOpen}
                onMenuClose={onMenuClose}
                menuPosition={menuPosition}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                styles={customStyles}
                components={{
                    IndicatorSeparator: () => null,
                }}
                classNamePrefix="react-select"
                classNames={{
                    control: () => cn(
                        'border-gray-300 bg-white text-left shadow-sm transition-colors',
                        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        sizeConfig[size].control
                    ),
                    placeholder: () => cn(
                        'text-gray-500',
                        sizeConfig[size].placeholder
                    ),
                    singleValue: () => cn(
                        'text-gray-900',
                        sizeConfig[size].placeholder
                    ),
                    menu: () => cn(
                        'rounded-md border border-gray-200 bg-white shadow-lg',
                        optionsClassName
                    ),
                }}
            />
        </div>
    );
};

export default ReactSelectWrapper;
