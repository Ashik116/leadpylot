/**
 * Main hook for TaskDrawer business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGetMyTasks, apiToggleTaskStatus } from '../services/TaskDrawerService';
import type { Task } from '../TaskDrawer.types';

interface UseTaskDrawerProps {
  isOpen: boolean;
  onPendingCountChange?: (count: number) => void;
}

export const useTaskDrawer = ({ isOpen, onPendingCountChange }: UseTaskDrawerProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'Admin';

  // Fetch tasks when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGetMyTasks();
      const tasks = response.data || [];
      setTasks(tasks);
      // Update pending count in parent
      const pending = response.meta?.pending ?? tasks.filter((t: Task) => !t.isDone).length;
      onPendingCountChange?.(pending);
    } catch {
      // Error fetching tasks
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  const toggleTaskStatus = useCallback(
    async (taskId: string, currentStatus: boolean) => {
      setUpdatingTaskId(taskId);
      try {
        await apiToggleTaskStatus(taskId, !currentStatus);

        // Update local state
        setTasks((prev) => {
          const updated = prev.map((task) =>
            task._id === taskId ? { ...task, isDone: !currentStatus } : task
          );
          // Update pending count in parent
          const pending = updated.filter((t) => !t.isDone).length;
          onPendingCountChange?.(pending);
          return updated;
        });
      } catch {
        // Error updating task
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [onPendingCountChange]
  );

  const toggleTaskExpansion = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const isTaskExpanded = useCallback(
    (taskId: string) => {
      return expandedTasks.has(taskId);
    },
    [expandedTasks]
  );

  const isUpdatingTask = useCallback(
    (taskId: string) => {
      return updatingTaskId === taskId;
    },
    [updatingTaskId]
  );

  return {
    tasks,
    loading,
    isAdmin,
    fetchTasks,
    toggleTaskStatus,
    toggleTaskExpansion,
    isTaskExpanded,
    isUpdatingTask,
  };
};

