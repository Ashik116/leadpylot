import classNames from 'classnames';
import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import type { CommonProps } from '../@types/common';
import ApolloIcon from '../ApolloIcon';
import Button from '../Button';

export interface CloseButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  absolute?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
  resetDefaultClass?: boolean;
}

const CloseButton = (props: CloseButtonProps) => {
  const { ref, ...rest } = props;

  return (
    <Button size="xs" ref={ref} className={classNames('')} variant="plain" {...rest}>
      <ApolloIcon name="cross" className="text-sm" />
    </Button>
  );
};

export default CloseButton;
