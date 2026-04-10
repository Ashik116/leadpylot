import { useRef, useState, useCallback, useEffect } from 'react';
import classNames from '../utils/classNames';
import cloneDeep from 'lodash/cloneDeep';
import FileItem from './FileItem';
import Button from '../Button/Button';
import CloseButton from '../CloseButton';
import Notification from '../Notification/Notification';
import toast from '../toast/toast';
import DocumentPreviewDialog from '../../shared/DocumentPreviewDialog';
import ApolloIcon from '../ApolloIcon';
import { useFilePreview } from '@/hooks/useFilePreview';
import type { CommonProps } from '../@types/common';
import type { ReactNode, ChangeEvent, MouseEvent, Ref } from 'react';
import Loading from '@/components/shared/Loading';

export interface UploadProps extends CommonProps {
  accept?: string;
  beforeUpload?: (file: FileList | null, fileList: File[]) => boolean | string;
  disabled?: boolean;
  draggable?: boolean;
  fileList?: File[];
  fileListClass?: string;
  fileItemClass?: string;
  multiple?: boolean;
  onChange?: (file: File[], fileList: File[]) => void;
  onFileRemove?: (file: File[]) => void;
  ref?: Ref<HTMLDivElement>;
  showList?: boolean;
  tip?: string | ReactNode;
  previewInModal?: boolean;
  projectId?: string; // Add projectId prop for backend route
  viewFileName?: string;
  loading?: boolean;
  maxFileSize?: number; // in bytes
  uploadLimit?: number;
}

const filesToArray = (files: File[]) => Object.keys(files).map((key) => files[key as any]);

const Upload = (props: UploadProps) => {
  const {
    accept,
    beforeUpload,
    disabled = false,
    draggable = false,
    fileList = [],
    fileListClass,
    fileItemClass,
    multiple,
    onChange,
    onFileRemove,
    ref,
    showList = true,
    tip,
    children,
    className,
    previewInModal = false,
    projectId,
    viewFileName,
    loading = false,
    maxFileSize,
    uploadLimit = 200,
    ...rest
  } = props;

  const fileInputField = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<(File | any)[]>(fileList);

  const [dragOver, setDragOver] = useState(false);

  // Use the clean file preview hook
  const filePreview = useFilePreview({ projectId, viewFileName });

  useEffect(() => {
    if (JSON.stringify(files) !== JSON.stringify(fileList)) {
      setFiles(fileList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fileList)]);

  const triggerMessage = (msg: string | ReactNode = '') => {
    toast.push(
      <Notification type="danger" duration={2000}>
        {msg || 'Upload Failed!'}
      </Notification>,
      {
        placement: 'top-center',
      }
    );
  };

  const pushFile = (newFiles: FileList | null, file: File[]) => {
    if (newFiles) {
      for (const f of newFiles) {
        multiple ? file.push(f) : (file = [f]);
      }
    }

    return file;
  };

  //   const addNewFiles = (newFiles: FileList | null) => {
  //     const file = cloneDeep(files);
  //     const newFile = pushFile(newFiles, file);
  //     return filesToArray({ ...newFile });
  //   };

  const addNewFiles = (newFiles: FileList | null) => {
    let file = cloneDeep(files);
    if (typeof uploadLimit === 'number' && uploadLimit !== 0) {
      if (Object.keys(file).length >= uploadLimit) {
        if (uploadLimit === 1) {
          file.shift();
          file = pushFile(newFiles, file);
        }

        return filesToArray({ ...file });
      }
    }
    file = pushFile(newFiles, file);
    return filesToArray({ ...file });
  };
  const onNewFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const { files: newFiles } = e.target;

    if (maxFileSize && newFiles) {
      for (const file of Array.from(newFiles)) {
        if (file.size > maxFileSize) {
          triggerMessage(
            `File "${file.name}" exceeds the size limit of ${(maxFileSize / 1024 / 1024).toFixed(
              0
            )}MB.`
          );
          return;
        }
      }
    }

    let result: boolean | string = true;

    if (beforeUpload) {
      result = beforeUpload(newFiles, files);

      if (result === false) {
        triggerMessage();
        return;
      }

      if (typeof result === 'string' && result.length > 0) {
        triggerMessage(result);
        return;
      }
    }

    if (result) {
      const updatedFiles = addNewFiles(newFiles);
      setFiles(updatedFiles);
      onChange?.(updatedFiles, files);
    }
  };

  const removeFile = (fileIndex: number) => {
    const deletedFileList = files.filter((_, index) => index !== fileIndex);
    setFiles(deletedFileList);
    onFileRemove?.(deletedFileList);
  };

  const triggerUpload = (e: MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      fileInputField.current?.click();
    }
    e.stopPropagation();
  };

  // Handle file preview - now just delegates to the clean hook
  const handleFilePreview = useCallback(
    (file: File | any) => {
      filePreview.openPreview(file);
    },
    [filePreview]
  );

  const renderChildren = () => {
    if (!draggable && !children) {
      return (
        <Button disabled={disabled} onClick={(e) => e.preventDefault()}>
          Upload
        </Button>
      );
    }

    if (draggable && !children) {
      return <span>Choose a file or drag and drop here</span>;
    }

    return children;
  };

  const handleDragLeave = useCallback(() => {
    if (draggable) {
      setDragOver(false);
    }
  }, [draggable]);

  const handleDragOver = useCallback(() => {
    if (draggable && !disabled) {
      setDragOver(true);
    }
  }, [draggable, disabled]);

  const handleDrop = useCallback(() => {
    if (draggable) {
      setDragOver(false);
    }
  }, [draggable]);

  const draggableProp = {
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  const draggableEventFeedbackClass = `border-sand-1`;

  const uploadClass = classNames(
    'upload',
    draggable && `upload-draggable`,
    draggable && !disabled && `hover:${draggableEventFeedbackClass}`,
    draggable && disabled && 'disabled',
    dragOver && draggableEventFeedbackClass,
    className
  );

  const uploadInputClass = classNames('upload-input', draggable && `draggable`);

  return (
    <>
      <div
        ref={ref}
        className={uploadClass}
        {...(draggable ? draggableProp : { onClick: triggerUpload })}
        {...rest}
      >
        {loading && (
          <div className="bg-sand-3/50 absolute top-0 left-0 h-full w-full">
            <Loading loading={loading} />
          </div>
        )}
        <input
          ref={fileInputField}
          className={uploadInputClass}
          type="file"
          disabled={disabled}
          multiple={multiple}
          accept={accept}
          title=""
          value=""
          onChange={onNewFileUpload}
          {...rest}
        ></input>
        {renderChildren()}
      </div>
      {tip}
      {showList && (
        <div
          className={classNames(
            'upload-file-list max-h-[500px] overflow-x-hidden overflow-y-auto',
            fileListClass
          )}
        >
          {files.map((file, index) => {
            // Generate key that works for both File objects and server-side metadata
            const fileKey = file?._id
              ? `${file._id}-${index}`
              : `${file?.name || 'unknown'}-${index}`;

            return (
              <FileItem key={fileKey} file={file} className={fileItemClass}>
                <div className="flex items-center gap-2">
                  {/* View button - only show when previewInModal is true */}
                  {previewInModal && (
                    <Button
                      size="xs"
                      variant="secondary"
                      icon={<ApolloIcon name="eye-filled" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFilePreview(file);
                      }}
                    >
                      View
                    </Button>
                  )}
                  <CloseButton
                    disabled={disabled}
                    className="upload-file-remove"
                    onClick={() => removeFile(index)}
                  />
                </div>
              </FileItem>
            );
          })}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewInModal && <DocumentPreviewDialog {...filePreview.dialogProps} />}
    </>
  );
};

export default Upload;
