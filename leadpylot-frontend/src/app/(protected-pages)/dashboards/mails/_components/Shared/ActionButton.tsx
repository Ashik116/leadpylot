'use client';

/**
 * ActionButton Component
 * Reusable action button with animated label on hover
 */

import React from 'react';
import Button from '@/components/ui/Button';

interface ActionButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'plain' | 'solid' | 'default' | 'destructive' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onHoverStart?: (id: string) => void;
  onHoverEnd?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export default function ActionButton({
  id,
  icon,
  label,
  title,
  onClick,
  loading = false,
  disabled = false,
  variant = 'plain',
  size = 'sm',
  showLabel = false,
  onHoverStart,
  onHoverEnd,
  children,
  className,
}: ActionButtonProps) {
  const handleMouseEnter = () => {
    onHoverStart?.(id);
  };

  const handleMouseLeave = () => {
    onHoverEnd?.();
  };

  const labelWrapperClasses = [
    'ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-in-out',
    'group-hover:ml-1 group-hover:max-w-[160px] group-hover:opacity-100',
    'group-focus-visible:ml-1 group-focus-visible:max-w-[160px] group-focus-visible:opacity-100',
    showLabel ? 'ml-1 max-w-[160px] opacity-100' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelInnerClasses = [
    'inline-block origin-center scale-x-0 transform text-black transition-transform duration-200 ease-in-out',
    'group-hover:scale-x-100 group-focus-visible:scale-x-100',
    showLabel ? 'scale-x-100' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderContent = () => {
    if (children) {
      return (
        <div className="flex items-center gap-1 overflow-hidden">
          {icon && <span className="flex items-center text-base">{icon}</span>}
          <div className="flex items-center gap-1">{children}</div>
          {label && (
            <span className={labelWrapperClasses}>
              <span className={labelInnerClasses}>{label}</span>
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center overflow-hidden">
        {icon && <span className="flex items-center text-base">{icon}</span>}
        {label && (
          <span className={labelWrapperClasses}>
            <span className={labelInnerClasses}>{label}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <Button
      size={size}
      variant={variant as any}
      icon={undefined}
      className={['group inline-flex items-center', className].filter(Boolean).join(' ')}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      title={title || label}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderContent()}
    </Button>
  );
}
