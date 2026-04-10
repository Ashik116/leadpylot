import { ChecklistItem } from '../types';
import dayjs from 'dayjs';

// Calculate checklist progress percentage
export const calculateChecklistProgress = (items: ChecklistItem[]): number => {
  if (items.length === 0) return 0;
  const completedCount = items.filter((item) => item.completed).length;
  return Math.round((completedCount / items.length) * 100);
};

// Format item due date for display
export const formatItemDueDate = (date?: string, time?: string): string | null => {
  if (!date) return null;
  
  try {
    const dateObj = dayjs(date);
    const formattedDate = dateObj.format('MMM D'); // "Jan 10"
    
    if (time) {
      return formattedDate; // Just show date, time shown separately if needed
    }
    
    return formattedDate;
  } catch {
    return null;
  }
};

// Check if item due date is overdue
export const isItemDueDateOverdue = (date?: string, time?: string): boolean => {
  if (!date) return false;
  
  try {
    const dueDateTime = time 
      ? dayjs(`${date} ${time}`, 'YYYY-MM-DD h:mm A')
      : dayjs(date).endOf('day');
    
    return dueDateTime.isBefore(dayjs());
  } catch {
    return false;
  }
};

// Check if item due date is due soon (within 24 hours)
export const isItemDueDateSoon = (date?: string, time?: string): boolean => {
  if (!date) return false;
  
  try {
    const dueDateTime = time 
      ? dayjs(`${date} ${time}`, 'YYYY-MM-DD h:mm A')
      : dayjs(date).endOf('day');
    
    const now = dayjs();
    const hoursUntilDue = dueDateTime.diff(now, 'hour', true);
    
    return hoursUntilDue >= 0 && hoursUntilDue <= 24;
  } catch {
    return false;
  }
};
