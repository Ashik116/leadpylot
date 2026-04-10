import React from 'react';

interface ChecklistProgressProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
}

export const ChecklistProgress: React.FC<ChecklistProgressProps> = ({
  progress,
  className = '',
  showLabel = true,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Progress
          </span>
          <span className="text-xs font-semibold text-black/80">
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
};
