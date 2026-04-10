import React from 'react';
import classNames from '@/utils/classNames';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface StatusIndicatorProps {
  hasStatus: boolean;
  trueLabel?: string;
  falseLabel?: string;
  trueClassName?: string;
  falseClassName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'gradient';
  showIcon?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  hasStatus,
  trueLabel = 'Yes',
  falseLabel = 'No',
  trueClassName,
  falseClassName,
  className,
  size = 'md',
  variant = 'default',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const defaultTrueClasses = 'bg-emerald-500 text-white shadow-sm';
  const defaultFalseClasses = 'bg-rose-500 text-white shadow-sm';

  const variantClasses = {
    default: '',
    outlined: hasStatus
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-rose-50 text-rose-700 border border-rose-200',
    gradient: hasStatus
      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
      : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md',
  };

  const baseClasses = classNames(
    'inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-200 ease-in-out',
    'hover:scale-105 active:scale-95',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeClasses[size],
    variantClasses[variant],
    hasStatus ? trueClassName || defaultTrueClasses : falseClassName || defaultFalseClasses,
    hasStatus ? 'focus:ring-emerald-500' : 'focus:ring-rose-500',
    className
  );

  const renderIcon = () => {
    if (!showIcon) return null;

    if (hasStatus) {
      return <ApolloIcon name="check" className="h-3 w-3 shrink-0" />;
    }

    return (
      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="whitespace-nowrap">
      <span className={baseClasses}>
        {renderIcon()}
        <span className="font-semibold">{hasStatus ? trueLabel : falseLabel}</span>
      </span>
    </div>
  );
};

export default StatusIndicator;
