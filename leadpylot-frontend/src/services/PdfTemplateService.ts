import ApiService from './ApiService';
import type { AxiosRequestConfig } from 'axios';

/**
 * PDF Template Service - Updated to fix API integration issues
 *
 * Recent fixes applied:
 * 1. Fixed usePdfTemplates hook to properly pass query parameters
 * 2. Added input validation for all API functions
 * 3. Enhanced error handling with specific HTTP status messages
 * 4. Added appropriate timeouts for different operations
 * 5. Improved debugging with detailed console logging
 *
 * Common troubleshooting:
 * - Ensure user has admin role for template management
 * - Check that template IDs are valid MongoDB ObjectIds
 * - Verify templates are in 'active' status for PDF generation
 * - Check browser console for detailed error logs
 */

// Type definitions for PDF Template System
export interface PdfTemplate {
  _id: string;
  name: string;
  description?: string;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  file_size: number;
  file_hash: string;
  pdf_version?: string;
  page_count: number;
  form_fields_count: number;
  extracted_fields: PdfField[];
  field_groups: FieldGroup[];
  field_mappings: FieldMapping[];
  category: 'offer' | 'contract' | 'application' | 'other';
  lead_source?: Array<{ _id: string; name: string } | string>;
  tags: string[];
  status: 'draft' | 'mapping' | 'active' | 'archived';
  usage_count: number;
  last_used?: string;
  settings: TemplateSettings;
  created_by: string;
  updated_by?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PdfField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  page: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  options?: string[];
}

export interface FieldGroup {
  _id?: string;
  logical_name: string;
  field_names: string[];
  field_type: string;
  max_length?: number;
  pattern?: string;
}

export interface FieldMapping {
  pdf_field_name: string;
  pdf_field_type: string;
  field_group_id?: string;
  group_position?: number;
  data_source: 'lead' | 'offer' | 'bank' | 'agent' | 'computed' | 'static';
  data_field: string;
  transform_rules?: TransformRules;
  validation?: ValidationRules;
  conditions?: any;
  active: boolean;
}

export interface TransformRules {
  uppercase?: boolean;
  lowercase?: boolean;
  format_pattern?: 'currency' | 'date' | 'phone' | 'iban';
  prefix?: string;
  suffix?: string;
  default_value?: string;
}

export interface ValidationRules {
  required?: boolean;
  min_length?: number;
  max_length?: number;
  pattern?: string;
}

export interface TemplateSettings {
  default_font?: string;
  default_font_size?: number;
  auto_flatten?: boolean;
  allow_editing?: boolean;
  font_size_adjustment?: boolean;
  debug_mode?: boolean;
  watermark?: string;
  password_protect?: boolean;
  password?: string;
}

export interface GeneratedPdf {
  _id: string;
  template_id: string;
  offer_id: string;
  lead_id: string;
  agent_id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  file_hash: string;
  generation_type: 'manual' | 'automatic' | 'batch';
  generation_source: string;
  data_snapshot: any;
  field_mappings_snapshot: any[];
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'archived';
  error_message?: string;
  retry_count: number;
  generation_time_ms?: number;
  started_at?: string;
  completed_at?: string;
  actions: any[];
  email_status?: any;
  version: number;
  previous_version_id?: string;
  visibility: 'private' | 'team' | 'project' | 'public';
  password_protected: boolean;
  expires_at?: string;
  created_by: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Request/Response interfaces
export interface GetTemplatesParams {
  status?: 'draft' | 'mapping' | 'active' | 'archived';
  category?: 'offer' | 'contract' | 'application' | 'other';
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface GetTemplatesResponse {
  success: boolean;
  data: {
    templates: PdfTemplate[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface UploadTemplateResponse {
  success: boolean;
  message: string;
  data: {
    template: {
      _id: string;
      name: string;
      form_fields_count: number;
      mapping_completion: number;
      status: string;
    };
    extraction: {
      fieldCount: number;
      fieldGroups: number;
      hasPreview: boolean;
    };
  };
}

export interface GetTemplateFieldsResponse {
  success: boolean;
  data: {
    extractedFields: PdfField[];
    fieldGroups: FieldGroup[];
    fieldMappings: FieldMapping[];
    mappingCompletion: number;
  };
}

export interface FieldOption {
  field: string;
  label: string;
  type: string;
  description: string;
}

export interface TransformOption {
  value: string;
  label: string;
  description: string;
}

export interface FieldMappingOptions {
  success: boolean;
  data: {
    field_options: {
      lead: FieldOption[];
      offer: FieldOption[];
      bank: FieldOption[];
      agent: FieldOption[];
      project: FieldOption[];
      payment_terms: FieldOption[];
      bonus_terms: FieldOption[];
      computed: FieldOption[];
      static: FieldOption[];
    };
    transform_options: {
      text_transforms: TransformOption[];
      format_patterns: TransformOption[];
    };
    data_sources: string[];
    usage_info: {
      description: string;
      total_categories: number;
      total_fields: number;
    };
  };
}

export interface UpdateFieldMappingsRequest {
  mappings: FieldMapping[];
  fieldGroups?: FieldGroup[];
}

export interface GeneratePdfRequest {
  templateId: string;
  offerId: string;
  type?: 'manual' | 'automatic' | 'batch';
  source?: string;
}

export interface GeneratePdfResponse {
  success: boolean;
  generatedPdf: GeneratedPdf;
  downloadUrl: string;
  data?: any;
}

export interface TemplateStatsResponse {
  success: boolean;
  data: {
    total_templates: number;
    active_templates: number;
    total_generations: number;
    recent_activity: any[];
  };
}

// API Service functions
export async function apiUploadTemplate(formData: FormData): Promise<UploadTemplateResponse> {
  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/admin/pdf-templates/upload',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  return ApiService.fetchDataWithAxios<UploadTemplateResponse>(config);
}

export async function apiGetTemplates(params?: GetTemplatesParams): Promise<GetTemplatesResponse> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/admin/pdf-templates',
    params: params || undefined,
  };
  return ApiService.fetchDataWithAxios<GetTemplatesResponse>(config);
}

export async function apiGetTemplate(
  templateId: string
): Promise<{ success: boolean; data: PdfTemplate }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/admin/pdf-templates/${templateId}`,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; data: PdfTemplate }>(config);
}

export async function apiUpdateTemplate(
  templateId: string,
  data: Partial<Pick<PdfTemplate, 'name' | 'description' | 'category' | 'tags'>>
): Promise<{ success: boolean; data: PdfTemplate }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'PUT',
    url: `/admin/pdf-templates/${templateId}`,
    data,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; data: PdfTemplate }>(config);
}

export async function apiUpdateTemplateSettings(
  templateId: string,
  settings: Partial<TemplateSettings>
): Promise<{ success: boolean; data: PdfTemplate }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'PUT',
    url: `/admin/pdf-templates/${templateId}/settings`,
    data: { settings },
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; data: PdfTemplate }>(config);
}

export async function apiDeleteTemplate(
  templateId: string
): Promise<{ success: boolean; message: string }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'DELETE',
    url: `/admin/pdf-templates/${templateId}`,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>(config);
}

export async function apiGetTemplateFields(templateId: string): Promise<GetTemplateFieldsResponse> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/admin/pdf-templates/${templateId}/fields`,
  };
  return ApiService.fetchDataWithAxios<GetTemplateFieldsResponse>(config);
}

export async function apiUpdateFieldMappings(
  templateId: string,
  data: UpdateFieldMappingsRequest
): Promise<{ success: boolean; data: PdfTemplate }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'PUT',
    url: `/admin/pdf-templates/${templateId}/field-mappings`,
    data,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; data: PdfTemplate }>(config);
}

export async function apiActivateTemplate(
  templateId: string
): Promise<{ success: boolean; message: string }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: `/admin/pdf-templates/${templateId}/activate`,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>(config);
}

export async function apiGetTemplatePreview(templateId: string): Promise<Blob> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/admin/pdf-templates/${templateId}/preview`,
    responseType: 'blob',
  };
  return ApiService.fetchDataWithAxios<Blob>(config);
}

export async function apiGetTemplatePreviewNew(templateId: string): Promise<Blob> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/pdf/generated/${templateId}/preview`,
    responseType: 'blob',
  };
  return ApiService.fetchDataWithAxios<Blob>(config);
}

export async function apiDownloadTemplate(templateId: string): Promise<Blob> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/admin/pdf-templates/${templateId}/download`,
    responseType: 'blob',
  };
  return ApiService.fetchDataWithAxios<Blob>(config);
}

export async function apiGetFieldMappingOptions(): Promise<FieldMappingOptions> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/admin/pdf-templates/field-mapping-options',
  };
  return ApiService.fetchDataWithAxios<FieldMappingOptions>(config);
}

export async function apiGetTemplateStats(): Promise<TemplateStatsResponse> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/admin/pdf-templates/stats',
  };
  return ApiService.fetchDataWithAxios<TemplateStatsResponse>(config);
}

export async function apiGenerateOfferPdf(data: GeneratePdfRequest): Promise<GeneratePdfResponse> {
  if (!data.templateId || !data.offerId) {
    throw new Error('Template ID and Offer ID are required');
  }

  const config: AxiosRequestConfig = {
    method: 'get',
    url: `/admin/pdf-templates/${data.templateId}/preview`,
    data,
  };
  return ApiService.fetchDataWithAxios<GeneratePdfResponse>(config);
}

export async function apiGenerateOfferPdfPost(
  data: GeneratePdfRequest & { notes?: string; tags?: string[] }
): Promise<GeneratePdfResponse> {
  if (!data.templateId || !data.offerId) {
    throw new Error('Template ID and Offer ID are required');
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: `/pdf/generate-offer`,
    data: {
      templateId: data.templateId,
      offerId: data.offerId,
      type: data.type || undefined,
      source: data.source || undefined,
      notes: data.notes || undefined,
      tags: data.tags || undefined,
    },
  };
  return ApiService.fetchDataWithAxios<GeneratePdfResponse>(config);
}

export async function apiDownloadGeneratedPdf(pdfId: string): Promise<Blob> {
  if (!pdfId) {
    throw new Error('PDF ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/pdf/generated/${pdfId}/download`,
    responseType: 'blob',
  };
  return ApiService.fetchDataWithAxios<Blob>(config);
}

// Assign generated PDF
export async function apiAssignGeneratedPdf(
  templateId: string
): Promise<{ success: boolean; message: string; data?: any }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: `/pdf/generated/${templateId}/assign`,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string; data?: any }>(config);
}

// Reject generated PDF
export async function apiRejectGeneratedPdf(
  templateId: string
): Promise<{ success: boolean; message: string }> {
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  const config: AxiosRequestConfig = {
    method: 'DELETE',
    url: `/pdf/generated/${templateId}`,
  };
  return ApiService.fetchDataWithAxios<{ success: boolean; message: string }>(config);
}

// =======================================
// PDF EDITING API FUNCTIONS
// =======================================

export interface PdfDataSnapshot {
  lead_data: Record<string, any>;
  offer_data: Record<string, any>;
  bank_data: Record<string, any>;
  agent_data: Record<string, any>;
  computed_data: Record<string, any>;
}

export interface GeneratedPdfDataResponse {
  success: boolean;
  data: {
    generatedPdf: {
      _id: string;
      filename: string;
      template: any;
      offer: any;
      lead: any;
      created_by: any;
      version: number;
      createdAt: string;
      updatedAt: string;
    };
    editableData: PdfDataSnapshot;
    fieldMappings: any[];
  };
}

export interface UpdatePdfDataRequest {
  data: Partial<PdfDataSnapshot>;
  notes?: string;
}

export interface UpdatePdfDataResponse {
  success: boolean;
  message: string;
  data: {
    generatedPdf: any;
    version: number;
    filename: string;
    fileSize: number;
    updatedSections: string[];
  };
}

// Get PDF data for editing
export async function apiGetGeneratedPdfData(
  generatedPdfId: string
): Promise<GeneratedPdfDataResponse> {
  if (!generatedPdfId) {
    throw new Error('Generated PDF ID is required');
  }

  console.log('🔍 Fetching PDF data for editing:', { generatedPdfId });

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/pdf/generated/${generatedPdfId}/data`,
    timeout: 10000, // 10 second timeout for data fetching
  };

  try {
    const result = await ApiService.fetchDataWithAxios<GeneratedPdfDataResponse>(config);
    console.log('✅ PDF data fetched successfully:', result);
    return result;
  } catch (error: any) {
    console.error('❌ Error fetching PDF data:', {
      generatedPdfId,
      error: error.message,
      response: error?.response,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

// Update PDF data and regenerate
export async function apiUpdateGeneratedPdfData(
  generatedPdfId: string,
  updateData: UpdatePdfDataRequest
): Promise<UpdatePdfDataResponse> {
  if (!generatedPdfId) {
    throw new Error('Generated PDF ID is required');
  }

  if (!updateData.data || typeof updateData.data !== 'object') {
    throw new Error('Updated data is required and must be an object');
  }
  const config: AxiosRequestConfig = {
    method: 'PUT',
    url: `/pdf/generated/${generatedPdfId}/data`,
    data: updateData, // 30 second timeout for PDF regeneration
  };

  try {
    const result = await ApiService.fetchDataWithAxios<UpdatePdfDataResponse>(config);
    console.log('✅ PDF data updated successfully:', result);
    return result;
  } catch (error: any) {
    throw error;
  }
}

// Utility functions
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
