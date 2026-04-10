import ApiService from './ApiService';

export type CloudinaryUploadResult = {
  documentId: string;
  public_url: string;
};

export const apiCloudinaryUploadSingle = async (file: File): Promise<CloudinaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const result = await ApiService.fetchDataWithAxios<any>({
    url: '/attachments/cloudinary/upload',
    method: 'POST',
    data: formData as any,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return {
    documentId: result?.data?.documentId || '',
    public_url: result?.data?.public_url || '',
  };
};


export interface DeleteAttachmentResponse {
  status: string;
  message: string;
  data: {
    deletedAttachment: {
      id: string;
      filename: string;
      attachmentType: string;
    };
    cleanup: {
      documentDeleted: boolean;
      fileDeleted: boolean;
      referencesRemoved: {
        notifications: number;
        openings: number;
        teams: number;
        confirmations: number;
        paymentVouchers: number;
        offers: number;
      };
    };
  };
}

export const apiGetFileAttachment = async (attachmentId: string) => {
  return ApiService.fetchDataWithAxios<Blob>({
    url: `/attachments/${attachmentId}/view`,
    method: 'GET',
    responseType: 'blob', // Required to properly handle binary data
  });
};

export const apiDeleteAttachment = async (attachmentId: string) => {
  return ApiService.fetchDataWithAxios<DeleteAttachmentResponse>({
    url: `/attachments/${attachmentId}`,
    method: 'DELETE',
  });
};
export const apiOfferDeleteAttachment = async (attachmentId: string, offerId: string) => {
  return ApiService.fetchDataWithAxios<DeleteAttachmentResponse>({
    url: `/offers/${offerId}/documents/${attachmentId}`,
    method: 'DELETE',
  });
};
export const apiTargetDeleteAttachment = async (
  attachmentId: string,
  documentId: string,
  table: string
) => {
  return ApiService.fetchDataWithAxios<DeleteAttachmentResponse>({
    url: `${table}/${documentId}/documents/${attachmentId}`,
    method: 'DELETE',
  });
};
