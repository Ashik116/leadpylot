import ApiService from './ApiService';

// ============================================================================
// Types
// ============================================================================

export interface Label {
    _id: string;
    title: string;
    color: string;
    board_id?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateLabelRequest {
    title: string;
    color: string;
    board_id: string;
}

export interface UpdateLabelRequest {
    title: string;
    color: string;
}

export interface LabelResponse {
    success: boolean;
    message: string;
    data: Label;
}

export interface LabelsResponse {
    success: boolean;
    message: string;
    data: Label[];
}

export interface DeleteLabelResponse {
    success: boolean;
    message: string;
    data?: any;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get labels for a specific board
 */
export async function apiGetBoardLabels(boardId: string): Promise<LabelsResponse> {
    return ApiService.fetchDataWithAxios<LabelsResponse>({
        url: `/api/labels/board/${boardId}`,
        method: 'GET',
    });
}

/**
 * Create a new label
 */
export async function apiCreateLabel(data: CreateLabelRequest): Promise<LabelResponse> {
    return ApiService.fetchDataWithAxios<LabelResponse, CreateLabelRequest>({
        url: '/api/labels',
        method: 'POST',
        data,
    });
}

/**
 * Update an existing label
 */
export async function apiUpdateLabel(id: string, data: UpdateLabelRequest): Promise<LabelResponse> {
    return ApiService.fetchDataWithAxios<LabelResponse, UpdateLabelRequest>({
        url: `/api/labels/${id}`,
        method: 'PUT',
        data,
    });
}

/**
 * Delete a label
 */
export async function apiDeleteLabel(id: string): Promise<DeleteLabelResponse> {
    return ApiService.fetchDataWithAxios<DeleteLabelResponse>({
        url: `/api/labels/${id}`,
        method: 'DELETE',
    });
}
