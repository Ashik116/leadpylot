import { useState, useCallback } from 'react';
import toast from '@/components/ui/toast/toast';
import Notification from '@/components/ui/Notification/Notification';
import ApiService from '@/services/ApiService';

interface FilePreviewState {
  isOpen: boolean;
  isLoading: boolean;
  previewUrl: string | null;
  previewType: string;
  fileName: string;
  viewFileName?: string | null;
}

interface FilePreviewOptions {
  projectId?: string;
  viewFileName?: string;
}

// Helper function to determine if it's a server-side file metadata object
const isServerFileMetadata = (file: any): boolean => {
  return (
    file && typeof file === 'object' && file._id && file.filename && file.filetype && file.type
  );
};

// Helper function to determine preview type
const getPreviewType = (file: any) => {
  if (!file) return 'other';

  // Handle server-side file metadata
  if (isServerFileMetadata(file)) {
    if (file.filetype.startsWith('image/')) return 'image';
    if (file.filetype === 'application/pdf') return 'pdf';
    return 'other';
  }

  // Handle browser File objects
  if (!file.type) return 'other';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  return 'other';
};

export const useFilePreview = (options: FilePreviewOptions = {}) => {
  const [state, setState] = useState<FilePreviewState>({
    isOpen: false,
    isLoading: false,
    previewUrl: null,
    previewType: 'other',
    fileName: '',
    viewFileName: options.viewFileName || '',
  });

  const triggerMessage = useCallback((msg: string) => {
    toast.push(
      <Notification type="danger" duration={2000}>
        {msg}
      </Notification>,
      {
        placement: 'top-center',
      }
    );
  }, []);

  const openPreview = useCallback(
    async (file: any) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Handle server-side file metadata objects (existing files)
      if (isServerFileMetadata(file)) {
        const fileName = file.filename || 'Unknown file';
        const previewType = getPreviewType(file);

        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
          let previewUrl: string;

          if (options.projectId && file.type) {
            // Use clean project-specific API: /projects/{projectId}/files/{fileType}/view
            previewUrl = `${baseUrl}/api/projects/${options.projectId}/files/${options.viewFileName}/view`;
          } else {
            // Fallback to generic file path
            previewUrl = `${baseUrl}/api/files${file.path}`;
          }

          // For images and PDFs, fetch the file as blob to avoid authentication issues
          if (previewType === 'image' || previewType === 'pdf') {
            try {
              let apiUrl: string;

              if (options.projectId && file.type) {
                // Use clean project-specific API: /projects/{projectId}/files/{fileType}/view
                apiUrl = `/projects/${options.projectId}/files/${options.viewFileName}/view`;
              } else {
                // Extract the API path from the full URL
                const urlObject = new URL(previewUrl);
                apiUrl = urlObject.pathname;
              }

              const blobResponse = await ApiService.fetchDataWithAxios<Blob>({
                url: apiUrl,
                method: 'GET',
                responseType: 'blob', // Required to properly handle binary data
              });

              const blobUrl = URL.createObjectURL(blobResponse);

              setState({
                isOpen: true,
                isLoading: false,
                previewUrl: blobUrl,
                previewType,
                fileName,
                viewFileName: options.viewFileName,
              });
            } catch (fetchError) {
              console.error('Error fetching file as blob:', fetchError);
              // Fallback to direct URL (might still work in some cases)
              setState({
                isOpen: true,
                isLoading: false,
                previewUrl,
                previewType,
                fileName,
                viewFileName: options.viewFileName,
              });
            }
          } else {
            // For other files, use direct URL
            setState({
              isOpen: true,
              isLoading: false,
              previewUrl,
              previewType,
              fileName,
              viewFileName: options.viewFileName,
            });
          }
        } catch (error) {
          console.error('Error creating server file preview URL:', error);
          triggerMessage('Failed to preview file');
          setState((prev) => ({ ...prev, isLoading: false }));
        }
        return;
      }

      // Handle browser File objects (new uploads)
      const fileName = file?.name || 'Unknown file';

      if (!file || typeof file !== 'object') {
        triggerMessage('Invalid file object');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      if (!file.name || typeof file.type !== 'string' || typeof file.size !== 'number') {
        triggerMessage('File format not supported for preview');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const isValidFileObject =
        file instanceof File ||
        file instanceof Blob ||
        (file.constructor &&
          (file.constructor.name === 'File' || file.constructor.name === 'Blob'));

      if (!isValidFileObject) {
        triggerMessage('File format not supported for preview');
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const previewType = getPreviewType(file);

      try {
        const url = URL.createObjectURL(file);
        setState({
          isOpen: true,
          isLoading: false,
          previewUrl: url,
          previewType,
          fileName,
        });
      } catch (error) {
        console.error('Error creating preview URL:', error);
        triggerMessage('Failed to preview file');
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [options.projectId, triggerMessage]
  );

  const closePreview = useCallback(() => {
    // Cleanup blob URL if it exists (for both File objects and server images)
    if (state.previewUrl && state.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.previewUrl);
    }

    setState({
      isOpen: false,
      isLoading: false,
      previewUrl: null,
      previewType: 'other',
      fileName: '',
    });
  }, [state.previewUrl]);

  const downloadFile = useCallback(
    async (file: any) => {
      // Handle server-side file metadata objects
      if (isServerFileMetadata(file)) {
        try {
          let apiUrl: string;

          if (options.projectId && file.type) {
            // Use clean project-specific API: /projects/{projectId}/files/{fileType}/download
            apiUrl = `/projects/${options.projectId}/files/${options.viewFileName}/download`;
          } else {
            // Fallback to generic file path - remove the full URL and keep just the path
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const fullUrl = `${baseUrl}/api/files/${options.viewFileName}/download`;
            const urlObject = new URL(fullUrl);
            apiUrl = urlObject.pathname;
          }

          const blobResponse = await ApiService.fetchDataWithAxios<Blob>({
            url: apiUrl,
            method: 'GET',
            responseType: 'blob', // Required to properly handle binary data
          });

          const blobUrl = URL.createObjectURL(blobResponse);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error('Error downloading server file:', error);
          triggerMessage('Failed to download file');
        }
        return;
      }

      // Handle browser File objects (new uploads)
      if (!file || !file.name) {
        triggerMessage('Cannot download file without name');
        return;
      }

      try {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        triggerMessage('Failed to download file');
      }
    },
    [options.projectId, triggerMessage]
  );

  const [currentFile, setCurrentFile] = useState<any>(null);

  const openPreviewWithFile = useCallback(
    (file: any) => {
      setCurrentFile(file);
      openPreview(file);
    },
    [openPreview]
  );

  const downloadCurrentFile = useCallback(() => {
    if (currentFile) {
      downloadFile(currentFile);
    }
  }, [currentFile, downloadFile]);

  return {
    ...state,
    openPreview: openPreviewWithFile,
    closePreview,
    downloadFile,
    // Ready-to-use dialog props
    dialogProps: {
      isOpen: state.isOpen,
      onClose: closePreview,
      previewUrl: state.previewUrl,
      previewType: state.previewType,
      isLoading: state.isLoading,
      selectedDocumentId: undefined,
      onDownload: downloadCurrentFile,
      isDownloading: false,
      documentName: state.fileName,
      title: 'File Preview',
    },
  };
};
