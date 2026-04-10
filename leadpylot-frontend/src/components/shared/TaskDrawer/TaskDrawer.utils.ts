/**
 * Utility functions for TaskDrawer component
 */

import { format } from 'date-fns';
import { AVATAR_COLORS, PRIORITY_CONFIG } from './TaskDrawer.constants';
import type { TaskPriority } from './TaskDrawer.types';

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Get user initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

/**
 * Get avatar color from email address
 */
export const getAvatarColor = (email: string): string => {
  const index = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

/**
 * Convert priority number (1-5) to label
 */
export const getPriorityLabel = (priority: TaskPriority): string => {
  if (typeof priority === 'string') return priority; // Already a label

  // Database uses 1-5: 1 = lowest, 5 = highest
  if (priority >= 4) return 'high';
  if (priority >= 3) return 'medium';
  return 'low';
};

/**
 * Get priority badge colors
 */
export const getPriorityColor = (priority: TaskPriority): string => {
  const label = getPriorityLabel(priority);
  return PRIORITY_CONFIG[label as keyof typeof PRIORITY_CONFIG]?.color || PRIORITY_CONFIG.default.color;
};

/**
 * Get priority icon name
 */
export const getPriorityIcon = (priority: TaskPriority): string => {
  const label = getPriorityLabel(priority);
  return PRIORITY_CONFIG[label as keyof typeof PRIORITY_CONFIG]?.icon || PRIORITY_CONFIG.default.icon;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string, formatStr: string = 'MMM d, yyyy h:mm a'): string => {
  return format(new Date(date), formatStr);
};

/**
 * Check if due date is overdue
 */
export const isOverdue = (dueDate: string, isDone: boolean): boolean => {
  if (isDone) return false;
  return new Date(dueDate) < new Date();
};

