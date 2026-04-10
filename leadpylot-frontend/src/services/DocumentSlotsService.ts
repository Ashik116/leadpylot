import ApiService from './ApiService';

export interface SlotMetadata {
  label: string;
  stage: string;
  direction: string;
  description: string;
}

export interface DocumentSlotsMetadataResponse {
  success: boolean;
  data: {
    valid_slots: string[];
    metadata: Record<string, SlotMetadata>;
  };
}

export interface DocumentSlotItem {
  _id: string;
  [key: string]: any;
}

export interface DocumentSlot {
  documents: DocumentSlotItem[];
  emails: any[];
  updated_at: string;
  updated_by: {
    _id: string;
    name: string;
    login: string;
  };
  metadata: SlotMetadata;
}

export interface OfferDocumentSlotsResponse {
  success: boolean;
  data: {
    offer_id: string;
    document_slots: Record<string, DocumentSlot>;
  };
}

export interface PinEmailToSlotRequest {
  email_id: string;
}

export interface PinToSlotBulkRequest {
  document_ids: string[];
  email_ids?: string[];
}

export interface PinToSlotBulkMultiOfferPayload {
  offer_ids: string[];
  document_ids?: string[];
  email_ids?: string[];
}

export interface SlotUpdateResponse {
  success: boolean;
  message: string;
  data: {
    offer_id?: string;
    lead_id?: string;
    slot_name?: string;
    documents: any[];
    emails: any[];
    updated_at: string;
    updated_by: any;
    metadata: SlotMetadata;
  };
}

export const apiGetSlotsMetadata = async (): Promise<DocumentSlotsMetadataResponse> => {
  return ApiService.fetchDataWithAxios<DocumentSlotsMetadataResponse>({
    method: 'GET',
    url: '/document-slots/metadata',
  });
};

export const apiGetOfferDocumentSlots = async (
  offerId: string
): Promise<OfferDocumentSlotsResponse> => {
  return ApiService.fetchDataWithAxios<OfferDocumentSlotsResponse>({
    method: 'GET',
    url: `/document-slots/offers/${offerId}`,
  });
};

export const apiPinEmailToOfferSlot = async (
  offerId: string,
  slotName: string,
  emailId: string
): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'POST',
    url: `/document-slots/offers/${offerId}/slots/${slotName}/emails`,
    data: { email_id: emailId },
  });
};

export const apiPinToSlotBulk = async (
  offerId: string,
  slotName: string,
  payload: PinToSlotBulkRequest
): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'POST',
    url: `/document-slots/offers/${offerId}/slots/${slotName}/bulk`,
    data: {
      document_ids: payload.document_ids,
      ...(payload.email_ids?.length ? { email_ids: payload.email_ids } : {}),
    },
  });
};

export const apiPinToSlotBulkMultiOffer = async (
  slotName: string,
  payload: PinToSlotBulkMultiOfferPayload
): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'POST',
    url: `/document-slots/offers/slots/${slotName}/bulk`,
    data: {
      offer_ids: payload.offer_ids,
      ...(payload.document_ids?.length ? { document_ids: payload.document_ids } : {}),
      ...(payload.email_ids?.length ? { email_ids: payload.email_ids } : {}),
    },
  });
};

export const apiPinEmailToLeadLastEmail = async (
  leadId: string,
  emailId: string
): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'POST',
    url: `/document-slots/leads/${leadId}/last-email/emails`,
    data: { email_id: emailId },
  });
};

export const apiGetLeadLastEmail = async (leadId: string): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'GET',
    url: `/document-slots/leads/${leadId}/last-email`,
  });
};

export const apiDeleteSlotDocument = async (
  offerId: string,
  slotName: string,
  documentId: string,
  documentType?: 'documents' | 'emails'
): Promise<SlotUpdateResponse> => {
  console.log({ offerId, slotName, documentId, documentType });
  // return null as any;
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'DELETE',
    url: `/document-slots/offers/${offerId}/slots/${slotName}/${documentType || 'documents'}/${documentId}`,
  });
};

export const apiDeleteSlotEmail = async (
  offerId: string,
  slotName: string,
  emailId: string
): Promise<SlotUpdateResponse> => {
  return ApiService.fetchDataWithAxios<SlotUpdateResponse>({
    method: 'DELETE',
    url: `/document-slots/offers/${offerId}/slots/${slotName}/emails/${emailId}`,
  });
};
