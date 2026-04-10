import ApiService from './ApiService';

// Types for the file upload service
export interface FileUploadData {
    files: File[];
    documentTypes: string[];
}

export interface FileUploadRequest {
    tableName: string;
    id: string;
    data: FileUploadData;
}

export interface FileUploadResponse {
    success: boolean;
    message: string;
    data?: any;
    _id?: string;
}

/**
 * Dynamic File Upload Service
 * 
 * This service provides a unified way to upload files to any entity
 * following the API pattern: POST :tablename/:id
 * 
 * @param tableName - The table/entity name (e.g., 'offers', 'openings', 'confirmations', 'payment-vouchers')
 * @param id - The entity ID to upload files to
 * @param data - Object containing files array and documentTypes array
 * @returns Promise with upload response
 */
export const apiUploadFiles = async (
    tableName: string,
    id: string,
    data: FileUploadData
): Promise<FileUploadResponse> => {
    try {
        // Create FormData for file upload
        const formData = new FormData();

        // Append files
        data.files.forEach((file) => {
            formData.append('files', file);
        });

        // Append document types
        data.documentTypes.forEach((documentType) => {
            formData.append('documentTypes', documentType);
        });

        const response = await ApiService.fetchDataWithAxios<FileUploadResponse>({
            url: `/${tableName}/${id}`,
            method: 'POST',
            data: formData as any,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response;
    } catch (error) {
        console.error(`Error uploading files to ${tableName}/${id}:`, error);
        throw error;
    }
};

/**
 * Alternative API function that accepts a single document type
 * for backward compatibility
 */
export const apiUploadFilesWithSingleType = async (
    tableName: string,
    id: string,
    files: File[],
    documentType: string
): Promise<FileUploadResponse> => {
    return apiUploadFiles(tableName, id, {
        files,
        documentTypes: [documentType],
    });
};

/**
 * Upload files to entity documents endpoint
 * Alternative endpoint: POST :tablename/:id/documents
 */
export const apiUploadFilesToDocuments = async (
    tableName: string,
    id: string,
    data: FileUploadData
): Promise<FileUploadResponse> => {
    try {
        const formData = new FormData();

        data.files.forEach((file) => {
            formData.append('files', file);
        });

        data.documentTypes.forEach((documentType) => {
            formData.append('documentTypes', documentType);
        });

        const response = await ApiService.fetchDataWithAxios<FileUploadResponse>({
            url: `/${tableName}/${id}/documents`,
            method: 'POST',
            data: formData as any,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response;
    } catch (error) {
        console.error(`Error uploading files to ${tableName}/${id}/documents:`, error);
        throw error;
    }
}; 