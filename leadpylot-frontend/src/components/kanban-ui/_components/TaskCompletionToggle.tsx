'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface TaskCompletionToggleProps {
    isCompleted: boolean;
    onToggle: () => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showOnHover?: boolean;
    disabled?: boolean;
    asIcon?: boolean; // When true, renders just the icon without button wrapper (for use inside other buttons)
}

const sizeMap = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
};

export const TaskCompletionToggle: React.FC<TaskCompletionToggleProps> = ({
    isCompleted,
    onToggle,
    size = 'md',
    className = '',
    showOnHover = false,
    disabled = false,
    asIcon = false,
}) => {
    const sizeClass = sizeMap[size];
    const Icon = isCompleted ? CheckCircle2 : Circle;
    const iconColor = isCompleted ? 'text-emerald-500' : 'text-gray-300';

    const baseClasses = `
    ${sizeClass}
    ${iconColor}
    transition-all duration-200
    ${asIcon ? '' : 'cursor-pointer hover:scale-110'}
    ${showOnHover ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    // When used as an icon inside another button, render just the icon
    if (asIcon) {
        return (
            <span
                className="flex items-center justify-center"
                aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            >
                <Icon className={baseClasses} />
            </span>
        );
    }

    // Default: render as standalone button
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onToggle();
                }
            }}
            disabled={disabled}
            className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded"
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
            <Icon className={baseClasses} />
        </button>
    );
};
