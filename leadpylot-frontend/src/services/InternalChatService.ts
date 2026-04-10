import ApiService from './ApiService';

// ============================================================================
// Types
// ============================================================================

export interface CreateChatMessageRequest {
  taskId: string;
  message: string;
}

export interface ChatMessage {
  _id: string;
  task: string;
  sender: {
    _id: string;
    login: string;
  };
  message: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface ChatMessagesResponse {
  success: boolean;
  message: string;
  data: {
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface CreateChatMessageResponse {
  success: boolean;
  message: string;
  data: ChatMessage;
}

export interface UpdateChatMessageRequest {
  message: string;
}

export interface UpdateChatMessageResponse {
  success: boolean;
  message: string;
  data: ChatMessage;
}

export interface DeleteChatMessageResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new chat message
 */
export async function apiCreateChatMessage(
  data: CreateChatMessageRequest
): Promise<CreateChatMessageResponse> {
  return ApiService.fetchDataWithAxios<CreateChatMessageResponse, CreateChatMessageRequest>({
    url: '/api/internal-chat/create',
    method: 'POST',
    data,
  });
}

/**
 * Get chat messages by task ID
 */
export async function apiGetChatMessagesByTask(taskId: string): Promise<ChatMessagesResponse> {
  return ApiService.fetchDataWithAxios<ChatMessagesResponse>({
    url: `/api/internal-chat/get-by-task/${taskId}`,
    method: 'GET',
  });
}

/**
 * Update a chat message
 */
export async function apiUpdateChatMessage(
  messageId: string,
  data: UpdateChatMessageRequest
): Promise<UpdateChatMessageResponse> {
  return ApiService.fetchDataWithAxios<UpdateChatMessageResponse, UpdateChatMessageRequest>({
    url: `/api/internal-chat/update/${messageId}`,
    method: 'PUT',
    data,
  });
}

/**
 * Delete a chat message
 */
export async function apiDeleteChatMessage(
  messageId: string
): Promise<DeleteChatMessageResponse> {
  return ApiService.fetchDataWithAxios<DeleteChatMessageResponse>({
    url: `/api/internal-chat/delete/${messageId}`,
    method: 'DELETE',
  });
}
