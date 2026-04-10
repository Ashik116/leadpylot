import type { ButtonProps } from '@/components/ui/Button';
import Button from '@/components/ui/Button';
import type { DialogProps } from '@/components/ui/Dialog';
import Dialog from '@/components/ui/Dialog';
import React, { type ReactNode } from 'react';

type StatusType = 'info' | 'success' | 'warning' | 'danger';

interface ConfirmDialogProps extends DialogProps {
  cancelText?: ReactNode | string;
  confirmText?: ReactNode | string;
  confirmButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
  type?: StatusType;
  title?: ReactNode | string;

  onCancel?: () => void;
  handleCancel?: () => void;
  onConfirm?: () => void;
  
  // Optional: Stop event propagation to prevent parent click handlers (e.g., prevent modal opening)
  stopPropagation?: boolean;
}

/*
const StatusIcon = ({ status }: { status: StatusType }) => {
  switch (status) {
    case 'info':
      return (
        <Avatar className="bg-blue-100 text-blue-600" shape="circle">
          <span className="text-2xl">
            <HiOutlineInformationCircle />
          </span>
        </Avatar>
      );
    case 'success':
      return (
        <Avatar className="bg-emerald-100 text-emerald-600" shape="circle">
          <span className="text-2xl">
            <HiCheckCircle />
          </span>
        </Avatar>
      );
    case 'warning':
      return (
        <Avatar className="bg-amber-100 text-amber-600" shape="circle">
          <span className="text-2xl">
            <HiOutlineExclamationCircle />
          </span>
        </Avatar>
      );
    case 'danger':
      return (
        <Avatar className="bg-red-100 text-red-600" shape="circle">
          <span className="text-2xl">
            <HiOutlineExclamation />
          </span>
        </Avatar>
      );

    default:
      return null;
  }
};
*/
const ConfirmDialog = (props: ConfirmDialogProps) => {
  const {
    /*type = 'info',*/
    title,
    children,
    onCancel,
    handleCancel,
    onConfirm,
    cancelText = 'Cancel',
    confirmText = 'Confirm',
    confirmButtonProps,
    cancelButtonProps,
    stopPropagation = false,
    ...rest
  } = props;

  const handleConfirm = (e?: React.MouseEvent) => {
    if (stopPropagation && e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onConfirm?.();
  };

  const handleCancelClick = (e?: React.MouseEvent) => {
    if (stopPropagation && e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (handleCancel) {
      handleCancel();
    } else {
      onCancel?.();
    }
  };

  return (
    <Dialog onClose={onCancel} {...rest}>
      <h4 className="mb-2">{title}</h4>
      {children}
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="solid"
          onClick={handleCancelClick}
          onMouseDown={stopPropagation ? (e) => {
            e.stopPropagation();
            e.preventDefault();
          } : undefined}
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        <Button 
          size="sm" 
          variant="success" 
          onClick={handleConfirm}
          onMouseDown={stopPropagation ? (e) => {
            e.stopPropagation();
            e.preventDefault();
          } : undefined}
          {...confirmButtonProps}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;
