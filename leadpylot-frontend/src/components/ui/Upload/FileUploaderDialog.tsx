'use client';

import React, { useState, ReactNode } from 'react';
import Dialog from '../Dialog';
import Button from '../Button';
import ApolloIcon from '../ApolloIcon';
import Upload from './Upload';
interface FileUploaderDialogProps {
  isOpen?: boolean;
  onClose: () => void;
  onUpload?: (files: File | File[] | null) => void;
  title?: string;
  accept?: string;
  supportPlaceholder?: string;
  uploadApi?: string;
  defaultImageUrl?: string;
  children?: ReactNode;
  multiple?: boolean;
  triggerButtonProps?: {
    size?: 'xs' | 'sm' | 'md' | 'lg';
    variant?: 'solid' | 'plain' | 'default' | 'secondary' | 'destructive' | 'success';
    className?: string;
    disabled?: boolean;
    [key: string]: any;
  };
  triggerButtonText?: string;
  doubleUpload?: boolean;
  bodyText?: string;
  maxFileSize?: number;
  loading?: boolean; // Add loading prop for trigger button
  uploadButtonProps?: {
    disabled?: boolean;
    children?: ReactNode;
    loading?: boolean;
  };
}

// Multiple file uploader component
const MultipleUploader: React.FC<{
  onChange?: (files: File[]) => void;
  accept?: string;
  supportPlaceholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  bodyText?: string;
  doubleUpload?: boolean;
  maxFileSize?: number;
}> = ({
  onChange,
  accept = '*',
  supportPlaceholder = 'Support: All file types',
  disabled,
  multiple = true,
  bodyText = 'Drop your files here, or ',
  maxFileSize,
}) => {
    const [files, setFiles] = useState<File[]>([]);

    const handleUpload = (newFiles: File[]) => {
      setFiles(newFiles);
      onChange?.(newFiles);
    };
    return (
      <div className="mx-auto w-full">
        <Upload
          multiple={multiple}
          showList={true}
          accept={accept}
          className="h-40"
          onChange={handleUpload}
          draggable
          disabled={disabled}
          fileList={files}
          maxFileSize={maxFileSize}
        >
          <div className="my-16 text-center">
            <div className="mb-4 flex justify-center">
              <ApolloIcon name="upload" className="text-3xl text-gray-400" />
            </div>
            <p className="font-semibold text-gray-500">
              <span className="">{bodyText}</span>
              <span className="text-blue-500">browse</span>
            </p>
            <p className="mt-1 text-sm text-gray-400">{supportPlaceholder}</p>
          </div>
        </Upload>
      </div>
    );
  };

const FileUploaderDialog: React.FC<FileUploaderDialogProps> = ({
  isOpen: externalIsOpen,
  onClose,
  onUpload,
  title = 'Upload File',
  accept = '.png,.jpg,.jpeg',
  supportPlaceholder,
  children,
  triggerButtonProps = {},
  triggerButtonText = 'Upload',
  multiple = false,
  doubleUpload = false,
  maxFileSize,
  loading = false,
  uploadButtonProps,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File | File[] | null>(null);
  const [firstUploadFiles, setFirstUploadFiles] = useState<File[]>([]);
  const [secondUploadFiles, setSecondUploadFiles] = useState<File[]>([]);

  // Determine appropriate placeholder text based on multiple flag
  const defaultPlaceholder = multiple ? 'Support: Multiple files' : 'Support: Jpg, jpeg, png';

  // Use provided placeholder or default
  const placeholderText = supportPlaceholder || defaultPlaceholder;

  // Use external isOpen state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleOpen = () => {
    setInternalIsOpen(true);
  };

  const handleClose = () => {
    setInternalIsOpen(false);
    setSelectedFiles(null);
    setFirstUploadFiles([]);
    setSecondUploadFiles([]);
    onClose();
  };

  // Handle single upload field
  const handleSingleFileChange = (files: File[]) => {
    setSelectedFiles(files.length > 0 ? files : null);
  };

  // Handle first upload field in double upload mode
  const handleFirstUploadChange = (files: File[]) => {
    setFirstUploadFiles(files);
    // Combine with second upload files
    const combinedFiles = [...files, ...secondUploadFiles];
    setSelectedFiles(combinedFiles.length > 0 ? combinedFiles : null);
  };

  // Handle second upload field in double upload mode
  const handleSecondUploadChange = (files: File[]) => {
    setSecondUploadFiles(files);
    // Combine with first upload files
    const combinedFiles = [...firstUploadFiles, ...files];
    setSelectedFiles(combinedFiles.length > 0 ? combinedFiles : null);
  };

  const handleUploadConfirm = async () => {
    if (onUpload && selectedFiles) {
      await onUpload(selectedFiles);
    }
  };

  // Default trigger button
  const defaultTrigger = (
    <Button
      icon={<ApolloIcon name="upload" className="text-md" />}
      size="xs"
      variant="secondary"
      onClick={handleOpen}
      loading={loading}
      disabled={loading}
      {...triggerButtonProps}
    >
      {loading ? 'Uploading...' : triggerButtonText}
    </Button>
  );

  return (
    <>
      {/* Render custom children as trigger or use default button */}
      {children ? (
        <div onClick={handleOpen} style={{ display: 'inline-block', cursor: 'pointer' }}>
          {children}
        </div>
      ) : (
        defaultTrigger
      )}

      <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
        <h4 className="mb-4 text-lg font-semibold capitalize px-2">{title}</h4>
        <div className="px-2">
          <MultipleUploader
            onChange={doubleUpload ? handleFirstUploadChange : handleSingleFileChange}
            accept={accept}
            supportPlaceholder={placeholderText}
            disabled={false}
            multiple={multiple}
            doubleUpload={doubleUpload}
            bodyText={doubleUpload ? 'Drop your file front part here , or ' : undefined}
            maxFileSize={maxFileSize}
          />
          {doubleUpload && (
            <>
              <div className="my-4 text-center">
                <span className="text-sm text-gray-500">AND</span>
              </div>
              <MultipleUploader
                onChange={handleSecondUploadChange}
                accept={accept}
                supportPlaceholder={placeholderText}
                disabled={false}
                doubleUpload={doubleUpload}
                bodyText={doubleUpload ? 'Drop your file back part here , or ' : undefined}
                maxFileSize={maxFileSize}
              />
            </>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="plain" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedFiles || uploadButtonProps?.disabled}
            loading={uploadButtonProps?.loading}
            variant="solid"
            onClick={handleUploadConfirm}
            {...uploadButtonProps}
          >
            {uploadButtonProps?.children ||
              (uploadButtonProps?.loading ? 'Uploading...' : 'Upload')}
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export default FileUploaderDialog;
