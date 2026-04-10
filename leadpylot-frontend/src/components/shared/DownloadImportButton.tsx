import React from 'react';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { apiDownloadFailedImports } from '@/services/LeadsService';

interface DownloadImportButtonProps {
  downloadUrl: string;
  filename: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'solid' | 'default' | 'destructive' | 'secondary' | 'success';
  className?: string;
}

/**
 * Reusable component for downloading import files
 */
const DownloadImportButton: React.FC<DownloadImportButtonProps> = ({
  downloadUrl,
  filename,
  size = 'sm',
  variant = 'plain',
  className = '',
}) => {
  const handleDownload = async () => {
    try {
      await apiDownloadFailedImports(downloadUrl, filename);
    } catch {
      toast.push(
        <Notification title="Download Failed" type="danger">
          Failed to download file. Please try again.
        </Notification>
      );
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      icon={<ApolloIcon name="download" className="text-sm" />}
      onClick={handleDownload}
      className={className}
    >
      Download
    </Button>
  );
};

export default DownloadImportButton;
