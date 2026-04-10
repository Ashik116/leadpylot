import React from 'react';
import { Label } from '../../types';

interface LabelBadgeProps {
  label: Label;
  onClick?: () => void;
  showName?: boolean;
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  onClick,
  showName = true,
  className = '',
}) => {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
      } ${className}`}
      style={{ backgroundColor: label.color }}
    >
      {showName && label.name}
    </span>
  );
};
