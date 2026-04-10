'use client';
import { apiDownloadFailedImports } from '@/services/LeadsService';
import { useState } from 'react';
import { Button } from '../ui';
import ApolloIcon from '../ui/ApolloIcon';
import { isDev } from '@/utils/utils';

interface DownloadImportsProps {
  downloadLink?: string;
  type?: 'failed' | 'success';
  fileName?: string;
}

const DownloadImports: React.FC<DownloadImportsProps> = ({
  downloadLink,
  type,
  fileName: fileNameProps,
}) => {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    if (!downloadLink) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

    const fileName = `download-imports-${timestamp}.xlsx`;

    try {
      await apiDownloadFailedImports(downloadLink, fileNameProps || fileName);
    } catch (error) {
      isDev && console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={type === 'failed' ? 'destructive' : 'success'}
      loading={loading}
      size="xs"
      className="text-sm"
      onClick={handleDownload}
      icon={<ApolloIcon name="download" />}
    >
      {type === 'failed' ? 'Failed' : 'Original'}
    </Button>
  );
};

export default DownloadImports;
