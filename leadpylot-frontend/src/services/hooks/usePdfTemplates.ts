import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import {
  apiGetTemplates,
  apiGetTemplate,
  apiUploadTemplate,
  apiUpdateTemplate,
  apiUpdateTemplateSettings,
  apiDeleteTemplate,
  apiGetTemplateFields,
  apiUpdateFieldMappings,
  apiActivateTemplate,
  apiGetTemplatePreview,
  apiDownloadTemplate,
  apiGetFieldMappingOptions,
  apiGetTemplateStats,
  apiGenerateOfferPdf,
  apiGenerateOfferPdfPost,
  apiDownloadGeneratedPdf,
  apiAssignGeneratedPdf,
  apiRejectGeneratedPdf,
  apiGetGeneratedPdfData,
  apiUpdateGeneratedPdfData,
  downloadFile,
  type GetTemplatesParams,
  type UpdateFieldMappingsRequest,
  type TemplateSettings,
  type GeneratePdfRequest,
  type UpdatePdfDataRequest,
} from '../PdfTemplateService';
import useNotification from '../../utils/hooks/useNotification';
import { useState } from 'react';
import {
  invalidateDynamicFilters,
  invalidateGroupedLeadQueries,
  invalidateLeadQueries,
} from '@/utils/queryInvalidation';

// Hook for fetching all PDF templates
export function usePdfTemplates(params?: GetTemplatesParams, enabled?: boolean) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['pdf-templates', params],
    queryFn: () => apiGetTemplates(params), // Fix: Pass params to the API call
    enabled: enabled !== undefined ? enabled && !!session : !!session,
    retry: false,
  });
}

// Hook for fetching a single PDF template
export function usePdfTemplate(templateId?: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['pdf-template', templateId],
    queryFn: () => (templateId ? apiGetTemplate(templateId) : Promise.reject('No template ID')),
    enabled: !!session && !!templateId,
    retry: false,
  });
}

// Hook for fetching template fields and mappings
export function useTemplateFields(templateId?: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['template-fields', templateId],
    queryFn: () =>
      templateId ? apiGetTemplateFields(templateId) : Promise.reject('No template ID'),
    enabled: !!session && !!templateId,
    retry: false,
  });
}

// Hook for fetching field mapping options
export function useFieldMappingOptions() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['field-mapping-options'],
    queryFn: apiGetFieldMappingOptions,
    enabled: !!session,
    retry: false,
  });
}

// Hook for fetching template statistics
export function useTemplateStats() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['template-stats'],
    queryFn: apiGetTemplateStats,
    enabled: !!session,
    retry: false,
  });
}

// Hook for uploading PDF template
export function useUploadTemplate() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: apiUploadTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      openNotification({
        type: 'success',
        massage: data.message || 'PDF template has been uploaded and processed.',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to upload PDF template.',
      });
    },
  });
}

// Hook for updating PDF template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async ({ templateId, data: fromData }: { templateId: string; data: any }) => {
      if (fromData.settings) {
        await apiUpdateTemplateSettings(templateId, fromData.settings);
      }
      return await apiUpdateTemplate(templateId, fromData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-template', variables.templateId] });
      openNotification({
        type: 'success',
        massage: 'Template has been updated successfully.',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to update template.',
      });
    },
  });
}

// Hook for updating PDF template settings
export function useUpdateTemplateSettings() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      templateId,
      settings,
    }: {
      templateId: string;
      settings: Partial<TemplateSettings>;
    }) => apiUpdateTemplateSettings(templateId, settings),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-template', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-fields', variables.templateId] });
      openNotification({
        type: 'success',
        massage: 'Template settings updated successfully.',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to update template settings.',
      });
    },
  });
}

// Hook for deleting PDF template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: apiDeleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      openNotification({
        type: 'success',
        massage: 'Template has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to delete template.',
      });
    },
  });
}

// Hook for updating field mappings
export function useUpdateFieldMappings() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateFieldMappingsRequest;
    }) => {
      console.log('🔍 Updating field mappings:', { templateId, data });
      console.log('📤 Payload being sent:', JSON.stringify(data, null, 2));

      try {
        const result = await apiUpdateFieldMappings(templateId, data);
        console.log('✅ API Response:', result);
        return result;
      } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-template', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-fields', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      console.log(data);

      // Show success notification
      openNotification({
        type: 'success',
        massage: 'Field mappings have been saved successfully.',
      });
    },
    onError: (error: any) => {
      console.error('🚨 Mutation Error Details:', {
        error,
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
      });

      let errorMessage = 'Failed to update field mappings.';

      // Extract detailed error information
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.details) {
        const details = error.response.data.details;
        if (typeof details === 'object') {
          errorMessage = `Validation failed: ${Object.values(details).join(', ')}`;
        } else {
          errorMessage = `Validation failed: ${details}`;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
}

// Hook for activating template
export function useActivateTemplate() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: apiActivateTemplate,
    onSuccess: (data, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      openNotification({
        type: 'success',
        massage: 'Template has been activated successfully.',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to activate template.',
      });
    },
  });
}

// Hook for downloading template preview
export function useTemplatePreview() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { openNotification } = useNotification();

  const downloadPreview = async (templateId: string, filename?: string) => {
    if (!templateId) {
      openNotification({
        type: 'danger',
        massage: 'Template ID is required for preview download.',
      });
      return;
    }

    try {
      setIsDownloading(true);
      console.log('🔍 Downloading template preview:', { templateId, filename });

      const blob = await apiGetTemplatePreview(templateId);
      console.log('✅ Preview blob received:', { size: blob.size, type: blob.type });

      downloadFile(blob, filename || `template-preview-${templateId}.pdf`);

      openNotification({
        type: 'success',
        massage: 'Template preview downloaded successfully.',
      });
    } catch (error: any) {
      console.error('❌ Preview download error:', {
        templateId,
        error: error.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      let errorMessage = 'Failed to download template preview.';

      if (error?.response?.status === 401) {
        errorMessage =
          'You are not authorized to access this template. Please check your admin permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage =
          'Template or preview not found. The template may not exist or may not have a preview available.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid template ID format.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadPreview, isDownloading };
}

// Hook for downloading original template
export function useDownloadTemplate() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { openNotification } = useNotification();

  const downloadTemplate = async (templateId: string, filename?: string) => {
    try {
      setIsDownloading(true);
      const blob = await apiDownloadTemplate(templateId);
      downloadFile(blob, filename || `template-${templateId}.pdf`);
    } catch (error: any) {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to download template.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadTemplate, isDownloading };
}

// Hook for generating PDF from offer (GET method)
export function useGenerateOfferPdf() {
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async (data: GeneratePdfRequest) => {
      console.log('🔍 Generating offer PDF (GET):', data);

      if (!data.templateId || !data.offerId) {
        throw new Error('Template ID and Offer ID are required for PDF generation');
      }

      // Use GET API call for PDF generation
      // apiGenerateOfferPdf already uses GET under the hood
      const result = await apiGenerateOfferPdf(data);
      console.log('✅ PDF generation result:', result);

      return result;
    },
    onSuccess: (result) => {
      console.log('🎉 PDF generation successful:', result);
      openNotification({
        type: 'success',
        massage: 'Offer PDF has been generated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('❌ PDF generation error:', {
        error: error.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      let errorMessage = 'Failed to generate PDF.';

      if (error?.response?.status === 401) {
        errorMessage = 'You are not authorized to generate PDFs. Please check your permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage =
          'Template or offer not found. Please check if the template is active and the offer exists.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid request data for PDF generation.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
}

export function useGenerateOfferPdfPost() {
  const { openNotification } = useNotification();

  const mutation = useMutation({
    mutationFn: async (data: GeneratePdfRequest & { notes?: string; tags?: string[] }) => {
      if (!data.templateId || !data.offerId) {
        throw new Error('Template ID and Offer ID are required for PDF generation');
      }
      // Use POST API call for PDF generation with additional options
      const result = await apiGenerateOfferPdfPost(data);
      return result;
    },
    onSuccess: () => {
      openNotification({
        type: 'success',
        massage: 'Offer PDF has been generated successfully.',
      });
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to generate PDF.';

      if (error?.response?.status === 401) {
        errorMessage = 'You are not authorized to generate PDFs. Please check your permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage =
          'Template or offer not found. Please check if the template is active and the offer exists.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid request data for PDF generation.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Hook for downloading generated PDF
export function useDownloadGeneratedPdf() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { openNotification } = useNotification();

  const downloadGeneratedPdf = async (pdfId: string, filename?: string) => {
    try {
      setIsDownloading(true);
      const blob = await apiDownloadGeneratedPdf(pdfId);
      downloadFile(blob, filename || `generated-pdf-${pdfId}.pdf`);
    } catch (error: any) {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to download generated PDF.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadGeneratedPdf, isDownloading };
}

// Enhanced hook with better loading functionality
export function useDownloadGeneratedPdfWithLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});
  const { openNotification } = useNotification();

  const downloadGeneratedPdf = async (pdfId: string, filename?: string) => {
    // Set loading state for this specific PDF
    setLoadingStates((prev) => ({ ...prev, [pdfId]: true }));
    setErrorStates((prev) => ({ ...prev, [pdfId]: '' }));

    try {
      const blob = await apiDownloadGeneratedPdf(pdfId);
      downloadFile(blob, filename || `generated-pdf-${pdfId}.pdf`);

      // Show success notification
      openNotification({
        type: 'success',
        massage: 'PDF downloaded successfully.',
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to download generated PDF.';

      // Set error state for this specific PDF
      setErrorStates((prev) => ({ ...prev, [pdfId]: errorMessage }));

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    } finally {
      // Clear loading state for this specific PDF
      setLoadingStates((prev) => ({ ...prev, [pdfId]: false }));
    }
  };

  const isDownloading = (pdfId: string) => loadingStates[pdfId] || false;
  const getError = (pdfId: string) => errorStates[pdfId] || null;
  const clearError = (pdfId: string) => {
    setErrorStates((prev) => {
      const newState = { ...prev };
      delete newState[pdfId];
      return newState;
    });
  };

  return {
    downloadGeneratedPdf,
    isDownloading,
    getError,
    clearError,
    // Global loading state (if any PDF is downloading)
    isLoading: Object.values(loadingStates).some(Boolean),
  };
}

// Hook for assigning generated PDF
export function useAssignGeneratedPdf() {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiAssignGeneratedPdf,
    onSuccess: (data) => {
      openNotification({
        type: 'success',
        massage: data.message || 'PDF has been assigned successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      invalidateLeadQueries(queryClient);
      invalidateDynamicFilters(queryClient);
      invalidateGroupedLeadQueries(queryClient);
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to assign PDF.';

      if (error?.response?.status === 401) {
        errorMessage = 'You are not authorized to assign PDFs. Please check your permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'PDF not found. Please check if the PDF exists.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid request data for PDF assignment.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
}

// Hook for rejecting generated PDF
export function useRejectGeneratedPdf() {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiRejectGeneratedPdf,
    onSuccess: (data) => {
      openNotification({
        type: 'success',
        massage: data.message || 'PDF has been rejected successfully.',
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to reject PDF.';

      if (error?.response?.status === 401) {
        errorMessage = 'You are not authorized to reject PDFs. Please check your permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'PDF not found. Please check if the PDF exists.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid request data for PDF rejection.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
}

// =======================================
// PDF EDITING HOOKS
// =======================================

// Hook for fetching generated PDF data for editing
export function useGeneratedPdfData(generatedPdfId?: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['generated-pdf-data', generatedPdfId],
    queryFn: () =>
      generatedPdfId
        ? apiGetGeneratedPdfData(generatedPdfId)
        : Promise.reject('No generated PDF ID'),
    enabled: !!session && !!generatedPdfId,
    retry: false,
    // 5 minutes - data doesn't change often
  });
}

// Hook for updating generated PDF data
export function useUpdateGeneratedPdfData() {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: async ({
      generatedPdfId,
      updateData,
    }: {
      generatedPdfId: string;
      updateData: UpdatePdfDataRequest;
    }) => {
      console.log('🔍 Updating generated PDF data:', { generatedPdfId, updateData });

      try {
        const result = await apiUpdateGeneratedPdfData(generatedPdfId, updateData);
        console.log('✅ PDF data update response:', result);
        return result;
      } catch (error) {
        console.error('❌ PDF data update error:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      const { generatedPdfId } = variables;

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['generated-pdf-data', generatedPdfId] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });

      openNotification({
        type: 'success',
        massage: data.message || 'PDF data has been updated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('🚨 PDF data update error details:', {
        error,
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
      });

      let errorMessage = 'Failed to update PDF data.';

      // Extract detailed error information
      if (error?.response?.status === 401) {
        errorMessage = 'You are not authorized to edit this PDF. Please check your permissions.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'PDF not found. Please check if the PDF exists and is accessible.';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.error || 'Invalid data provided for PDF update.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.details) {
        const details = error.response.data.details;
        if (typeof details === 'object') {
          errorMessage = `Validation failed: ${Object.values(details).join(', ')}`;
        } else {
          errorMessage = `Validation failed: ${details}`;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      openNotification({
        type: 'danger',
        massage: errorMessage,
      });
    },
  });
}
