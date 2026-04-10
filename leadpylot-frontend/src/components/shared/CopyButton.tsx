'use client';
import { useState } from 'react';
import { Notification, toast } from '../ui';
import ApolloIcon from '../ui/ApolloIcon';

const CopyButton = ({ value, className }: { value: string | number; className?: string }) => {
  const [isCopying, setIsCopying] = useState(false);

  const onCopy = async (value: string | number) => {
    try {
      await navigator.clipboard.writeText(value?.toString() || '');
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 3000);
    } catch {
      toast.push(<Notification type="danger">Failed to copy</Notification>);
    }
  };

  return (
    <ApolloIcon
      name={isCopying ? 'copy' : 'command-v-alt'}
      className={`cursor-pointer transition-all ${isCopying ? 'text-green-600 hover:text-green-600' : 'hover:text-blue-500'} flex size-4 items-center justify-center duration-600 ${className}`}
      onClick={async () => {
        if (!isCopying) {
          await onCopy(value);
        }
      }}
    />
  );
};

export default CopyButton;
