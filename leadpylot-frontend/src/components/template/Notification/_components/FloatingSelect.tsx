'use client';

/**
 * FloatingSelect — reusable floating dropdown used by NotificationSort & NotificationFilter.
 *
 * Renders a Button trigger + a fixed-strategy Floating UI menu.
 * Works correctly inside drawers, sticky headers, and tablet viewports.
 */

import  { useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import classNames from '@/utils/classNames';
import { HiCheck, HiChevronDown } from 'react-icons/hi';
import Button from '@/components/ui/Button';

export interface FloatingSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FloatingSelectProps<T extends string = string> {
  value: T;
  options: FloatingSelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the trigger button */
  ariaLabel: string;
  /** Accessible name for the option list */
  listLabel?: string;
  /** Fallback label when no option matches */
  fallbackLabel?: string;
  /** Portal target — e.g. drawer content node. Defaults to document body. */
  portalRoot?: HTMLElement | null;
  /** When true, the trigger stretches to fill its parent width */
  block?: boolean;
  /** Trigger button size — defaults to 'sm' */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Trigger border-radius override, e.g. 'rounded-lg' */
  rounded?: string;
}

function FloatingSelect<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  listLabel,
  fallbackLabel,
  portalRoot,
  block = false,
  size = 'sm',
  rounded,
}: FloatingSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: block ? 'bottom-start' : 'bottom-end',
    strategy: 'fixed',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const currentLabel = options.find((o) => o.value === value)?.label ?? fallbackLabel ?? options[0]?.label ?? '';

  return (
    <div className={block ? 'w-full' : 'shrink-0'}>
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant="default"
        size={size}
        block={block}
        icon={<HiChevronDown className="h-3.5 w-3.5 opacity-70" />}
        iconAlignment="end"
        className={classNames('!text-xs', block && '!justify-between text-black font-normal !transform-none active:!scale-100', rounded)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        {currentLabel}
      </Button>

      {open && (
        <FloatingPortal root={portalRoot ?? undefined}>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className=" outline-none"
            >
              <ul
                role="listbox"
                aria-label={listLabel ?? ariaLabel}
                className={classNames(
                  'min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg',
                  block ? 'max-h-60 overflow-y-auto' : 'overflow-hidden',
                )}
                style={block ? { minWidth: refs.reference.current?.getBoundingClientRect().width } : undefined}
              >
                {options.map((option) => {
                  const selected = value === option.value;
                  return (
                    <li key={option.value} role="option" aria-selected={selected}>
                      <Button
                        variant="plain"
                        size="xs"
                        block
                        icon={
                          selected ? (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              <HiCheck className="h-3.5 w-3.5 text-blue-600" />
                            </span>
                          ) : undefined
                        }
                        iconAlignment="start"
                        gapClass="gap-1.5"
                        className={classNames(
                          '!justify-start !rounded-none !px-3 !py-2 !text-xs !font-medium',
                          selected
                            ? '!bg-blue-50 !text-blue-700'
                            : '!text-gray-700 hover:!bg-gray-50'
                        )}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {option.label}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}

export default FloatingSelect;
