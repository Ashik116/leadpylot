import Modal from 'react-modal';
import classNames from 'classnames';
import CloseButton from '../CloseButton';
import { motion } from 'framer-motion';
import useWindowSize from '../hooks/useWindowSize';
import type ReactModal from 'react-modal';
import type { MouseEvent, KeyboardEvent } from 'react';

export interface DialogProps extends ReactModal.Props {
  closable?: boolean;
  contentClassName?: string;
  height?: string | number;
  onClose?: (e: MouseEvent<HTMLSpanElement>) => void;
  width?: string | number;
}

const Dialog = (props: DialogProps) => {
  const currentSize = useWindowSize();

  const {
    bodyOpenClassName,
    children,
    className,
    closable = true,
    closeTimeoutMS = 150,
    contentClassName,
    height,
    isOpen,
    onClose,
    onRequestClose,
    overlayClassName,
    portalClassName,
    style,
    width = 520,
    ...rest
  } = props;

  const onCloseClick = (e: MouseEvent<HTMLSpanElement>) => {
    onClose?.(e);
  };

  const handleRequestClose = (e: MouseEvent | KeyboardEvent) => {
    (onRequestClose ?? onClose)?.(e as MouseEvent<HTMLSpanElement>);
  };

  const renderCloseButton = (
    <div className="absolute top-1 right-1 z-20">
      <CloseButton onClick={onCloseClick} />
    </div>
  );

  const contentStyle = {
    content: {
      inset: 'unset',
    },
    ...style,
  };

  if (width !== undefined) {
    contentStyle.content.width = width;

    if (typeof currentSize.width !== 'undefined' && currentSize.width <= Number(width)) {
      contentStyle.content.width = 'auto';
    }
  }

  if (height !== undefined) {
    contentStyle.content.height = height;
  }

  const defaultDialogContentClass = 'dialog-content';

  const dialogClass = classNames(defaultDialogContentClass, contentClassName);

  return (
    <Modal
      className={{
        base: classNames('dialog z-40', className as string),
        afterOpen: 'dialog-after-open',
        beforeClose: 'dialog-before-close',
      }}
      overlayClassName={{
        base: classNames('dialog-overlay z-40', overlayClassName as string),
        afterOpen: 'dialog-overlay-after-open',
        beforeClose: 'dialog-overlay-before-close',
      }}
      portalClassName={classNames('dialog-portal', portalClassName)}
      bodyOpenClassName={classNames('dialog-open', bodyOpenClassName)}
      ariaHideApp={false}
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      shouldCloseOnOverlayClick={true}
      style={{ ...contentStyle }}
      closeTimeoutMS={closeTimeoutMS}
      {...rest}
    >
      <motion.div
        className={`${dialogClass}`}
        initial={{ transform: 'scale(0.9)' }}
        animate={{
          transform: isOpen ? 'scale(1)' : 'scale(0.9)',
        }}
      >
        {closable && renderCloseButton}
        {children}
      </motion.div>
    </Modal>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;
