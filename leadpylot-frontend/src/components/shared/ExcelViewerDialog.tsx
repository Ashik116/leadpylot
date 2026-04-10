'use client';
import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ExcelViewer from './ExcelViewer';
import ApolloIcon from '@/components/ui/ApolloIcon';
import DownloadImports from './DownloadImport';
import { appendToFilename } from '@/utils/appendToFilename';

interface ExcelViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  downloadUrl: string;
  fileName?: string;
}

const ExcelViewerDialog = ({
  isOpen,
  onClose,
  title,
  downloadUrl,
  fileName,
}: ExcelViewerDialogProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dialogWidth, setDialogWidth] = useState<number>(1200);

  // Handle full-screen mode
  useEffect(() => {
    if (isFullScreen) {
      // Get window dimensions for full screen
      const windowWidth = window.innerWidth;

      // Set dialog to take up full screen
      setDialogWidth(windowWidth);

      // Add listener to update dimensions if window is resized
      const handleResize = () => {
        setDialogWidth(window.innerWidth);
      };

      window.addEventListener('resize', handleResize);

      // Prevent body scrolling when in full screen
      document.body.style.overflow = 'hidden';

      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        document.body.style.overflow = '';
      };
    } else {
      // Reset to default width
      setDialogWidth(1200);
    }
  }, [isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setIsFullScreen(false);
      }}
      width={isFullScreen ? 1800 : dialogWidth}
      className={isFullScreen ? 'fixed inset-0 top-0 z-50 !m-0 min-h-full min-w-full' : ''}
    >
      <div className={`flex h-[80vh] flex-col`}>
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center">
            <h4 className="text-lg font-semibold">{title}</h4>
            {fileName && <p className="ml-4 text-sm text-gray-500">File: {fileName}</p>}
          </div>
          <div className="flex items-center space-x-2 pe-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-sm"
              icon={
                <ApolloIcon name={isFullScreen ? 'minimize' : 'maximize'} className="text-lg" />
              }
              onClick={toggleFullScreen}
            >
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
            <DownloadImports
              downloadLink={downloadUrl}
              type="success"
              fileName={fileName ? appendToFilename(fileName, 'original') : ''}
            />
          </div>
        </div>
        <div className="w-full flex-1 overflow-hidden p-4">
          <div className="excel-viewer-table h-full overflow-y-auto">
            <ExcelViewer downloadUrl={downloadUrl} />
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ExcelViewerDialog;
