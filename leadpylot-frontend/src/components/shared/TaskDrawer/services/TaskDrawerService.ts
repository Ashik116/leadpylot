/**
 * Service layer for TaskDrawer API calls
 */

import ApiService from '@/services/ApiService';
import type {
  MyTasksResponse,
  EmailThreadResponse,
  EmailCommentsResponse,
  Task,
} from '../TaskDrawer.types';

/**
 * Fetch user's tasks
 */
export const apiGetMyTasks = async (): Promise<MyTasksResponse> => {
  return ApiService.fetchDataWithAxios<MyTasksResponse>({
    url: '/todos/my-tasks',
    method: 'GET',
  });
};

/**
 * Toggle task completion status
 */
export const apiToggleTaskStatus = async (
  taskId: string,
  isDone: boolean
): Promise<{ success: boolean; data: Task }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: Task }>({
    url: `/todos/${taskId}/status`,
    method: 'PATCH',
    data: { isDone },
  });
};

/**
 * Fetch email thread by email ID
 */
export const apiGetEmailThread = async (emailId: string): Promise<EmailThreadResponse> => {
  return ApiService.fetchDataWithAxios<EmailThreadResponse>({
    url: `/email-system/${emailId}/thread`,
    method: 'GET',
  });
};

/**
 * Fetch email comments by email ID
 */
export const apiGetEmailComments = async (emailId: string): Promise<EmailCommentsResponse> => {
  return ApiService.fetchDataWithAxios<EmailCommentsResponse>({
    url: `/email-system/${emailId}/internal-comments`,
    method: 'GET',
  });
};

/**
 * Save a new email comment
 */
export const apiSaveEmailComment = async (
  emailId: string,
  text: string,
  mentionedUsers: string[] = []
): Promise<{ success: boolean; data: any }> => {
  return ApiService.fetchDataWithAxios<{ success: boolean; data: any }>({
    url: `/email-system/${emailId}/internal-comments`,
    method: 'POST',
    data: {
      text: text.trim(),
      mentioned_users: mentionedUsers,
    },
  });
};
