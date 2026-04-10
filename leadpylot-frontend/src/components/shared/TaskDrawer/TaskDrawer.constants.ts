/**
 * Constants for TaskDrawer component
 */

import type { TaskFilter } from './TaskDrawer.types';

export const TASK_FILTERS: TaskFilter[] = ['pending', 'completed', 'all'];

export const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
] as const;

export const PRIORITY_CONFIG = {
  high: {
    label: 'high',
    color: 'bg-red-50 text-red-800 border-red-200',
    icon: 'exclamation-circle',
  },
  medium: {
    label: 'medium',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    icon: 'exclamation-triangle',
  },
  low: {
    label: 'low',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: 'info-circle',
  },
  default: {
    label: 'low',
    color: 'bg-gray-50 text-gray-800 border-gray-200',
    icon: 'info-circle',
  },
} as const;

export const EMPTY_STATE_MESSAGES = {
  pending: {
    title: 'No pending tasks',
    subtitle: 'All caught up! 🎉',
  },
  completed: {
    title: 'No completed tasks',
    subtitle: 'Complete some tasks to see them here',
  },
  all: {
    title: 'No tasks yet',
    subtitle: 'Tasks will appear here when created',
  },
} as const;

export const MAX_COMMENT_HEIGHT = 'max-h-60';
export const DRAWER_WIDTH = 640;

