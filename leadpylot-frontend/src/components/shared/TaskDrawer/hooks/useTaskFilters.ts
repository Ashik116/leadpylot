/**
 * Hook for managing task filters
 */

import { useMemo } from 'react';
import type { Task, TaskFilter } from '../TaskDrawer.types';

interface UseTaskFiltersProps {
  tasks: Task[];
  filter: TaskFilter;
}

export const useTaskFilters = ({ tasks, filter }: UseTaskFiltersProps) => {
  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasks.filter((task) => !task.isDone);
    if (filter === 'completed') return tasks.filter((task) => task.isDone);
    return tasks;
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => !t.isDone).length;
    const completed = tasks.filter((t) => t.isDone).length;
    return {
      pending,
      completed,
      all: tasks.length,
    };
  }, [tasks]);

  return {
    filteredTasks,
    counts,
  };
};

