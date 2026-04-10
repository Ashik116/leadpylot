'use client';

import React from 'react';
import { Task } from '../../types';

interface DraggingCardPreviewProps {
  task: Task;
  /** Scale down when over board selector handle */
  compact?: boolean;
}

/**
 * Lightweight card preview for drag overlay.
 * Avoids heavy SingleTask (labels, checklist, members, etc.) for smoother drag performance.
 */
export const DraggingCardPreview: React.FC<DraggingCardPreviewProps> = ({ task, compact }) => {
  return (
    <div
      className={`rounded-md bg-gray-100 p-3 shadow-2xl ring-2 ring-indigo-500/50 transition-transform ${
        compact ? 'scale-90' : 'scale-105 rotate-2'
      }`}
    >
      <p className="line-clamp-2 text-sm font-medium text-gray-900">{task.title || 'Untitled'}</p>
      {task.status && (
        <span className="mt-1 inline-block text-xs text-gray-500">{task.status}</span>
      )}
    </div>
  );
};
