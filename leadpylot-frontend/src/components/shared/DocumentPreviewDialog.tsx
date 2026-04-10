'use client';

// import { useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import Image from 'next/image';
import Loading from '@/components/shared/Loading';
import type { MouseEvent } from 'react';
import type { ReactNode } from 'react';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  previewType: string;
  isLoading: boolean;
  selectedDocumentId: string | undefined;
  onDownload: () => void;
  isDownloading: boolean;
  documentName?: string;
  title?: string;
  showNavigation?: boolean;
  currentIndex?: number;
  totalFiles?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  /** Optional extra footer actions (e.g., Pin/Assign attachment popover). */
  footerActions?: ReactNode;
  /** Optional delete action - when set, shows delete button in header. */
  onDelete?: () => void | Promise<void>;
  canDelete?: boolean;
  isDeleting?: boolean;
}

/**
 * Dialog component for previewing documents (contracts, IDs, etc.)
 * Using simple iframe approach for reliable PDF viewing
 */
const DocumentPreviewDialog = ({
  isOpen,
  onClose,
  previewUrl,
  previewType,
  isLoading,
  onDownload,
  isDownloading,
  documentName,
  title = 'Document Preview',
  showNavigation = false,
  currentIndex = 0,
  totalFiles = 0,
  onNext,
  onPrevious,
  footerActions,
  onDelete,
  canDelete = false,
  isDeleting = false,
}: DocumentPreviewDialogProps) => {
  // const [isFullScreen, setIsFullScreen] = useState(false);
  // const [dialogWidth, setDialogWidth] = useState<number>(1000);

  // Handle full-screen mode
  // useEffect(() => {
  //   if (isFullScreen) {
  //     const windowWidth = window.innerWidth;
  //     setDialogWidth(windowWidth);

  //     const handleResize = () => {
  //       setDialogWidth(window.innerWidth);
  //     };

  //     window.addEventListener('resize', handleResize);
  //     document.body.style.overflow = 'hidden';

  //     return () => {
  //       window.removeEventListener('resize', handleResize);
  //       document.body.style.overflow = '';
  //     };
  //   } else {
  //     setDialogWidth(1000);
  //   }
  // }, [isFullScreen]);

  // const toggleFullScreen = () => {
  //   setIsFullScreen(!isFullScreen);
  // };

  const handleClose = (e?: MouseEvent<HTMLElement>) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onClose();
    // setIsFullScreen(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      // width={isFullScreen ? 1800 : dialogWidth}
      // height={isFullScreen ? window.innerHeight : 800}
      className={'fixed inset-0 top-0 z-[99999] !m-0 min-h-full min-w-full document-preview-dialog'}
      overlayClassName="!z-[99999]"
      portalClassName="!z-[99999]"
      contentClassName="border mx-20 h-[90vh]"
    >
      <div
        className="flex h-full flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pr-10">
          <div className="flex min-w-0 items-center overflow-hidden gap-4">
            <h4 className="truncate text-lg font-semibold xl:max-w-max">{title}</h4>
            {documentName && (
              <p className="max-w-[10rem] truncate text-sm text-gray-500 md:max-w-xs xl:max-w-max">
                File: {documentName}
              </p>
            )}
            {showNavigation && totalFiles > 1 && (
              <p className="ml-4 text-sm text-gray-500">
                {currentIndex + 1} of {totalFiles}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Delete button - shown when canDelete && onDelete */}
            {canDelete && onDelete && (
              <ConfirmPopover
                title="Delete Document"
                description="Are you sure you want to permanently delete this document?"
                onConfirm={async () => {
                  const result = onDelete();
                  if (result instanceof Promise) await result;
                }}
                confirmText="Delete"
                confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                placement="bottom-end"
                floatingClassName="!z-[100001]"
              >
                <Button
                  variant="destructive"
                  size="xs"
                  title="Delete document"
                  className="-mt-2.5"
                  icon={<ApolloIcon name="trash" className="text-lg " />}
                  disabled={isDeleting}
                  onClick={(e) => e.stopPropagation()}
                >
                  Delete
                </Button>
              </ConfirmPopover>
            )}
            {/* Optional actions (e.g. Pin/Assign) */}
            {footerActions}
            {/* Navigation buttons */}
            {showNavigation && totalFiles > 1 && (
              <>
                <Button
                  variant="default"
                  size="xs"
                  icon={<ApolloIcon name="chevron-arrow-left" className="text-lg" />}
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                  className="-mt-2.5"
                />
                <Button
                  variant="default"
                  size="xs"
                  icon={<ApolloIcon name="chevron-arrow-right" className="text-lg" />}
                  onClick={onNext}
                  disabled={currentIndex === totalFiles - 1}
                  className="-mt-2.5"
                />
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex h-full w-full items-center justify-center bg-gray-200/50">
              <Loading loading={isLoading} />
            </div>
          )}

          {!isLoading && previewUrl && (
            <div className="h-full">
              {previewType === 'image' && (
                <div className="flex h-full items-center justify-center">
                  <Image
                    src={previewUrl}
                    alt="Document"
                    width={1800}
                    height={1800}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      void e;
                    }}
                    onLoad={() => {
                      // no-op
                    }}
                    unoptimized
                  />
                </div>
              )}

              {previewType === 'pdf' && (
                <div className="flex h-full w-full flex-col">
                  {/* PDF Viewer using iframe - simple and reliable */}
                  <div className="relative flex-1 bg-white">
                    <iframe
                      src={previewUrl}
                      title="PDF Document"
                      width="100%"
                      height="100%"
                      className="absolute inset-0 rounded border-0"
                      style={{
                        minHeight: '500px',
                        background: 'white',
                      }}
                      onLoad={() => {
                        // no-op
                      }}
                      onError={(e) => {
                        void e;
                      }}
                    />
                  </div>
                </div>
              )}

              {previewType === 'extra' || previewType === 'other' && (
                <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-100 p-8 text-center">
                  <ApolloIcon name="file" className="mb-4 text-4xl text-gray-500" />
                  <p className="mb-2 text-lg font-medium">This file type cannot be previewed</p>
                  <p className="mb-4 text-gray-500">
                    Please download the file to view its contents
                  </p>
                  <p className="mb-2 text-xs text-gray-400">
                    File: {documentName} | Type: {previewType}
                  </p>
                  <Button variant="default" onClick={onDownload} disabled={isDownloading}>
                    {isDownloading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Downloading...
                      </>
                    ) : (
                      <div className="flex items-center">
                        <ApolloIcon name="download" className="mr-2" />
                        Download File
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !previewUrl && (
            <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-100 p-8 text-center">
              <ApolloIcon name="file" className="mb-4 text-4xl text-gray-500" />
              <p className="mb-2 text-lg font-medium">Document not found</p>
              <p className="mb-4 text-gray-500">
                The document you&apos;re trying to view is not available
              </p>
              <div className="text-xs text-gray-400">
                <p>Document Name: {documentName}</p>
                <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
                <p>Preview URL: {previewUrl ? 'Available' : 'Not available'}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-4">
          {/* <Button
            variant="secondary"
            size="sm"
            icon={<ApolloIcon name={isFullScreen ? 'minimize' : 'maximize'} className="text-lg" />}
            onClick={toggleFullScreen}
          >
            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          </Button> */}
          <div className="flex items-center justify-end gap-4">
            <Button
              variant="success"
              size="sm"
              icon={<ApolloIcon name="download" className="text-lg" />}
              onClick={onDownload}
              disabled={isDownloading}
              className="mr-3"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
