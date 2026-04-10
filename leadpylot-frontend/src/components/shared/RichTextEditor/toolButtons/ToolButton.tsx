import classNames from '@/utils/classNames';
import type { ComponentProps } from 'react';

export type ToolButtonProps = ComponentProps<'button'> & {
  active?: boolean;
  title?: string;
};

const ToolButton = (props: ToolButtonProps) => {
  const { className, disabled, active, ...rest } = props;

  return (
    <button
      className={classNames(
        'tool-button heading-text hover:text-sand-1 flex items-center rounded-lg p-1.5 text-xl',
        active && 'text-sand-1',
        disabled && 'cursor-not-allowed opacity-20',
        className
      )}
      type="button"
      disabled={disabled}
      {...rest}
    />
  );
};

export default ToolButton;
