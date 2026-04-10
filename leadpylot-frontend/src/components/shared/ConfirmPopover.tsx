import React from 'react';
import Popover from '@/components/ui/Popover';
import Button from '@/components/ui/Button';
import type { Placement } from '@floating-ui/react';
import classNames from 'classnames';

interface ConfirmPopoverProps {
  children: React.ReactElement;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
  placement?: Placement;
  floatingClassName?: string;
  /** Portal root - when set, confirmation renders inside this element (e.g. to keep inside a modal) */
  portalRoot?: HTMLElement | null;
}

const ConfirmPopover: React.FC<ConfirmPopoverProps> = ({
  children,
  title = 'Are you sure?',
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-500 hover:bg-red-600 text-white',
  isLoading = false,
  placement = 'bottom',
  floatingClassName,
  portalRoot,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleConfirm = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    onConfirm();
    setIsOpen(false);
  };

  const handleCancel = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    onCancel?.();
    setIsOpen(false);
  };

  const popoverContent = (
    <div className="w-[260px] p-2" data-confirm-popover>
      <h5 className="mb-1 text-sm font-bold">{title}</h5>
      {description && <p className="mb-3 text-xs text-gray-500">{description}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="xs"
          variant="plain"
          onClick={handleCancel}
          disabled={isLoading}
          className="text-gray-600 hover:bg-gray-100"
        >
          {cancelText}
        </Button>
        <Button
          size="xs"
          onClick={handleConfirm}
          loading={isLoading}
          disabled={isLoading}
          className={classNames('flex items-center justify-center rounded px-2.5 py-1 text-xs font-bold ', confirmButtonClass)}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      content={popoverContent}
      placement={placement}
      floatingClassName={floatingClassName}
      portalRoot={portalRoot}
    >
      {children}
    </Popover>
  );
};

export default ConfirmPopover;
