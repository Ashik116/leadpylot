'use client';

import { useState, useCallback, useEffect } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';

interface StarButtonProps {
  emailId: string;
  isStarred?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  tooltipText?: string;
  onToggle?: (emailId: string, isStarred: boolean) => Promise<void>;
}

export default function StarButton({
  emailId,
  isStarred = false,
  size = 'sm',
  className = '',
  tooltipText,
  onToggle,
}: StarButtonProps) {
  const [optimisticStarred, setOptimisticStarred] = useState(isStarred);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setOptimisticStarred(isStarred);
  }, [isStarred]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!onToggle || isLoading) return;

      const newValue = !optimisticStarred;
      setOptimisticStarred(newValue);
      setIsLoading(true);

      try {
        await onToggle(emailId, newValue);
      } catch (error) {
        setOptimisticStarred(optimisticStarred);
        console.error('Error toggling star:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [optimisticStarred, onToggle, emailId, isLoading]
  );

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
  };

  const defaultTooltipText = optimisticStarred ? 'Unstar' : 'Star';
  const tooltip = tooltipText || defaultTooltipText;

  const button = (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`prevent-select shrink-0 rounded p-1 transition-colors hover:bg-yellow-50 mt-1 ${optimisticStarred ? 'opacity-100' : 'opacity-50 hover:opacity-100'
        } ${isLoading ? 'cursor-wait' : ''} ${className}`}
    >
      <ApolloIcon
        name={optimisticStarred ? 'star-filled' : 'star-empty'}
        className={sizeClasses[size]}
      />
    </button>
  );

  return (
    <Tooltip title={tooltip} placement="top">
      {button}
    </Tooltip>
  );
}
