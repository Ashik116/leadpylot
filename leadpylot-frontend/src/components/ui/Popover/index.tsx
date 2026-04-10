import React, { useState } from 'react';

import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  useId,
  Placement,
} from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';

export interface PopoverProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: Placement;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  floatingClassName?: string;
  dismissOnOutsideClick?: boolean;
  /**
   * When false, blur/focus moving out of the trigger does not auto-close the popover.
   * Use inside nested menus (e.g. profile dropdown) so opening/closing or moving the
   * pointer does not dismiss due to FloatingFocusManager focus-out semantics.
   */
  closeOnFocusOut?: boolean;
  /** Portal root - when set, popover renders inside this element (e.g. to keep inside a modal) */
  portalRoot?: HTMLElement | null;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  placement = 'bottom',
  isOpen: controlledIsOpen,
  onOpenChange: setControlledIsOpen,
  className,
  floatingClassName,
  dismissOnOutsideClick = true,
  closeOnFocusOut = true,
  portalRoot,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const labelId = useId();
  const descriptionId = useId();

  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const setIsOpen = setControlledIsOpen ?? setUncontrolledIsOpen;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
    placement,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: dismissOnOutsideClick });
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      {React.cloneElement(
        children,
        getReferenceProps({
          ...(children.props as Record<string, unknown>),
          ref: (node: HTMLElement | null) => {
            refs.setReference(node);
          },
        } as any)
      )}

      <FloatingPortal root={portalRoot ?? undefined}>
        <AnimatePresence>
          {isOpen && (
            <FloatingFocusManager context={context} modal={false} closeOnFocusOut={closeOnFocusOut}>
              <div
                ref={(node) => {
                  refs.setFloating(node);
                }}
                style={floatingStyles}
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                {...getFloatingProps()}
                // Must be above Dialogs (z-[100002]) and their overlays (z-[100001])
                className={classNames('z-[100010] outline-none', floatingClassName)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={classNames(
                    'min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl',
                    className
                  )}
                >
                  {content}
                </motion.div>
              </div>
            </FloatingFocusManager>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
};

export default Popover;
