'use client';
import { apiDownloadFailedOffersImports } from '@/services/LeadsService';
import { useState } from 'react';
import { Button, toast, Notification } from '../ui';
import ApolloIcon from '../ui/ApolloIcon';
import { isDev } from '@/utils/utils';

interface DownloadOffersImportsProps {
  downloadLink?: string;
  type?: 'failed' | 'success';
  fileName?: string;
}

const DownloadOffersImports: React.FC<DownloadOffersImportsProps> = ({
  downloadLink,
  type,
  fileName: fileNameProps,
}) => {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    if (!downloadLink) {
      toast.push(
        <Notification title="Download Failed" type="danger">
          No download link available.
        </Notification>
      );
      setLoading(false);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

    const fileName = `download-offers-imports-${timestamp}.xlsx`;

    try {
      isDev && console.log('Downloading:', {
        downloadLink,
        fileName: fileNameProps || fileName,
        type,
      });

      await apiDownloadFailedOffersImports(downloadLink, fileNameProps || fileName);

      isDev && console.log('Download completed successfully');
    } catch (error: any) {
      isDev && console.error('Download error details:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        url: downloadLink,
        type,
      });

      let errorMessage = 'Failed to download file. Please try again.';

      if (error?.response?.status === 404) {
        errorMessage = 'File not found. The file may have been deleted or is not accessible.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to download this file.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      }

      toast.push(
        <Notification title="Download Failed" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={type === 'failed' ? 'destructive' : 'success'}
      loading={loading}
      size="xs"
      onClick={handleDownload}
      icon={<ApolloIcon name="download" />}
    >
      {type === 'failed' ? 'Failed' : 'Original'}
    </Button>
  );
};

export default DownloadOffersImports;
