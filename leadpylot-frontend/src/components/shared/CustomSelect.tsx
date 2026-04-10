import classNames from 'classnames';
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io';
import ApolloIcon from '../ui/ApolloIcon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: SelectOption | null;
  onChange?: (value: SelectOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuIsOpen?: boolean;
  onBlur?: () => void;
  classNameOptions?: string;
  menuPosition?: 'auto' | 'top' | 'bottom';
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  menuIsOpen,
  onBlur,
  classNameOptions,
  menuPosition = 'auto',
  ...props
}) => {
  const displayOptions = options && options.length > 0 ? options : [];
  const selectRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(value || null);
  // const [parentWidth, setParentWidth] = useState<number>(0);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: string; left: string } | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (disabled) return;
    onBlur?.();
  };

  const handleSelect = (option: SelectOption) => {
    setSelectedOption(option);
    onChange?.(option);
    onBlur?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideSelect = selectRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideSelect && !isInsideDropdown) {
        onBlur?.();
      }
    };

    if (menuIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuIsOpen, onBlur]);

  // Update selected option when value prop changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedOption(value || null);
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (menuIsOpen && selectRef.current) {
      const updatePosition = () => {
        const rect = selectRef.current!.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Calculate dynamic height based on options count
        const optionHeight = 32; // Approximate height per option
        const maxOptions = Math.min(displayOptions?.length || 0, 6); // Max 6 options visible
        const dropdownHeight =
          displayOptions?.length === 0 ? 40 : Math.max(40, maxOptions * optionHeight);

        let top = rect.bottom + 4;
        let left = rect.left;

        if (menuPosition === 'top') {
          top = rect.top - dropdownHeight - 4;
        } else if (menuPosition === 'auto') {
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;

          if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
            top = rect.top - dropdownHeight - 4;
          }
        }

        // Ensure dropdown stays within viewport with better margin handling
        if (top < 4) top = 4;
        if (top + dropdownHeight > viewportHeight - 4) top = viewportHeight - dropdownHeight - 4;
        if (left < 4) left = 4;
        if (left + rect.width > window.innerWidth - 4) left = window.innerWidth - rect.width - 4;

        setDropdownPosition({ top: `${top}px`, left: `${left}px` });
      };

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(updatePosition);

      // Add event listeners for dynamic updates
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    } else {
      // Reset position when menu closes
      const timer = setTimeout(() => {
        setDropdownPosition(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [menuIsOpen, menuPosition]);

  return (
    <div ref={selectRef} className={`relative w-full ${className}`}>
      {/* Control Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded border border-gray-200 bg-white px-2 text-sm hover:bg-gray-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={`truncate text-left ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {menuIsOpen ? <ApolloIcon name="chevron-arrow-down" /> : <ApolloIcon name="chevron-arrow-up" />}
      </button>

      {/* Dropdown Menu - Rendered at document root */}
      {menuIsOpen &&
        dropdownPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className={classNames(
              'fixed z-[999999] overflow-auto rounded border border-gray-200 bg-white shadow-lg',
              classNameOptions
            )}
            style={{
              top: dropdownPosition?.top || 0,
              left: dropdownPosition?.left || 0,
              maxHeight: displayOptions?.length === 0 ? '40px' : '192px', // 6 * 32px = 192px
            }}
            {...props}
          >
            {!displayOptions || displayOptions?.length === 0 ? (
              <div className="flex h-full w-full cursor-pointer items-center justify-center border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-100">
                No options
              </div>
            ) : (
              displayOptions?.map((option, index) => {
                // Simple fallback for any option format
                let displayText = '';
                if (typeof option === 'string') {
                  displayText = option;
                } else if (option && typeof option === 'object') {
                  displayText = option?.label || option?.value || `Option ${index + 1}`;
                } else {
                  displayText = `Option ${index + 1}`;
                }

                return (
                  <div
                    key={index}
                    onClick={() => handleSelect(option)}
                    className="w-full cursor-pointer border-b border-gray-100 px-2 py-1 text-left text-sm last:border-b-0 hover:bg-gray-100"
                  >
                    {displayText}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomSelect;
