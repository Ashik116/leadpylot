// Get auth token from localStorage or cookies
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

/**
 * Downloads a file from an API endpoint
 * @param url The URL or endpoint path to download from
 * @param filename Optional custom filename for the downloaded file
 */
export async function downloadFileFromApi(url: string, filename?: string): Promise<void> {
  try {
    // If the URL is a relative path, prepend the API base URL
    const fullUrl = url.startsWith('http') 
      ? url 
      : `${process.env.NEXT_PUBLIC_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    
    // Get the auth token
    const token = getAuthToken();
    
    // Make the request with proper headers
    const response = await fetch(fullUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Try to get filename from Content-Disposition header if not provided
    if (!filename) {
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
    }
    
    // If still no filename, use a default
    if (!filename) {
      filename = 'download.csv';
    }
    
    // Create a download link and trigger it
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Log error to application monitoring or handle silently
    throw error;
  }
}
