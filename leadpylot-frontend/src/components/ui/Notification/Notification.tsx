import { useCallback, useState } from 'react';
import classNames from 'classnames';
import useTimeout from '../hooks/useTimeout';
import CloseButton from '../CloseButton';
import StatusIcon from '../StatusIcon';
import type { CommonProps, TypeAttributes } from '../@types/common';
import type { ReactNode, MouseEvent, Ref } from 'react';

export interface NotificationProps extends CommonProps {
  closable?: boolean;
  customIcon?: ReactNode | string;
  duration?: number;
  onClose?: (e: MouseEvent<any>) => void;
  ref?: Ref<HTMLDivElement>;
  title?: string;
  triggerByToast?: boolean;
  type?: TypeAttributes.Status;
  width?: number | string;
  // When true, the notification width will expand to fit its content
  autoWidth?: boolean;
  onClick?: () => void;
}

const Notification = (props: NotificationProps) => {
  const {
    className,
    children,
    closable = true,
    customIcon,
    duration = 3000,
    onClose,
    style,
    ref,
    title,
    triggerByToast,
    type,
    width = 350,
    autoWidth = false,
    onClick,
    ...rest
  } = props;

  const [display, setDisplay] = useState('show');

  // Disable auto-close: only close when user clicks the close button
  const { clear } = useTimeout(onClose as () => void, duration, closable ? true : false);

  const handleClose = useCallback(
    (e: MouseEvent<any>) => {
      setDisplay('hiding');
      onClose?.(e);
      clear();
      if (!triggerByToast) {
        setTimeout(() => {
          setDisplay('hide');
        }, 400);
      }
    },
    [onClose, clear, triggerByToast]
  );

  const notificationClass = classNames('notification', className);

  if (display === 'hide') {
    return null;
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.();
        3;
        handleClose(e);
      }}
      ref={ref}
      {...rest}
      className={notificationClass}
      style={{
        width: autoWidth ? 'fit-content' : width,
        maxWidth: autoWidth ? '90vw' : undefined,
        // Ensure long unbroken content doesn’t overflow
        wordBreak: autoWidth ? 'break-word' : undefined,
        overflowWrap: autoWidth ? 'anywhere' : undefined,
        whiteSpace: autoWidth ? 'normal' : undefined,
        ...style,
      }}
    >
      <div className={classNames('flex p-2', !children && 'no-child')}>
        {type && !customIcon ? (
          <div className="mt-0.5 mr-3">
            <StatusIcon type={type} />
          </div>
        ) : null}
        {customIcon && <div className="mr-3">{customIcon}</div>}
        <div>
          {title && (
            <div className={classNames('notification-title', children ? 'mb-1' : '')}>{title}</div>
          )}
          <div className={classNames('notification-description', !title && children ? 'mt-1' : '')}>
            {children}
          </div>
        </div>
      </div>
      {!closable && (
        <CloseButton
          className="absolute top-2 right-2 z-30"
          absolute={true}
          onClick={handleClose}
        />
      )}
    </div>
  );
};

export default Notification;
