import { useState } from 'react';
import Input from '@/components/ui/Input'
import { InputProps } from '@/components/ui/Input';
import type { MouseEvent, Ref } from 'react';
import ApolloIcon from '../ui/ApolloIcon';

interface PasswordInputProps extends InputProps {
  onVisibleChange?: (visible: boolean) => void;
  ref?: Ref<HTMLInputElement>;
  disableSuffix?: boolean;
}

const PasswordInput = (props: PasswordInputProps) => {
  const { onVisibleChange, ref, disableSuffix = false, ...rest } = props;

  const [pwInputType, setPwInputType] = useState('password');

  const onPasswordVisibleClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const nextValue = pwInputType === 'password' ? 'text' : 'password';
    setPwInputType(nextValue);
    onVisibleChange?.(nextValue === 'text');
  };

  return (
    <Input
      {...rest}
      ref={ref}
      type={pwInputType}
      suffix={
        disableSuffix ? null : (
          <span
            className="cursor-pointer text-xl select-none"
            role="button"
            onClick={onPasswordVisibleClick}
          >
            {pwInputType === 'password' ? (
              <ApolloIcon name="eye-filled" className="text-lg" />
            ) : (
              <ApolloIcon name="eye-slash" className="text-lg" />
            )}
          </span>
        )
      }
    />
  );
};

export default PasswordInput;
