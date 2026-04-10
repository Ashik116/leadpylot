'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import classNames from '@/utils/classNames';
import ApolloIcon from '../ApolloIcon';
import { Button } from '../Button';

export interface PrelineFileUploadProps {
  url?: string;
  onChange?: (files: File[]) => void;
  value?: File[];
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  disabled?: boolean;
  className?: string;
  initialImages?: string[];
  showFullDesign?: boolean;
  totalCount?: number; // ✅ NEW: Total count including saved attachments
  showUploadingProgress?: boolean;
}

interface FileWithProgress {
  file?: File;
  imageUrl?: string;
  progress?: number;
  id?: string;
  previewUrl?: string;
  name?: string;
  size?: number;
  isUrl?: boolean;
}
// SVG icon for image upload
const ImgIcon = () => {
  return (
    <svg
      className="h-auto w-16 shrink-0"
      width="71"
      height="51"
      viewBox="0 0 71 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.55172 8.74547L17.7131 6.88524V40.7377L12.8018 41.7717C9.51306 42.464 6.29705 40.3203 5.67081 37.0184L1.64319 15.7818C1.01599 12.4748 3.23148 9.29884 6.55172 8.74547Z"
        stroke="currentColor"
        stroke-width="2"
        className="stroke-blue-600 dark:stroke-blue-500"
      ></path>
      <path
        d="M64.4483 8.74547L53.2869 6.88524V40.7377L58.1982 41.7717C61.4869 42.464 64.703 40.3203 65.3292 37.0184L69.3568 15.7818C69.984 12.4748 67.7685 9.29884 64.4483 8.74547Z"
        stroke="currentColor"
        stroke-width="2"
        className="stroke-blue-600 dark:stroke-blue-500"
      ></path>
      <g filter="url(#filter4)">
        <rect
          x="17.5656"
          y="1"
          width="35.8689"
          height="42.7541"
          rx="5"
          stroke="currentColor"
          stroke-width="2"
          className="stroke-blue-600 dark:stroke-blue-500"
          shape-rendering="crispEdges"
        ></rect>
      </g>
      <path
        d="M39.4826 33.0893C40.2331 33.9529 41.5385 34.0028 42.3537 33.2426L42.5099 33.0796L47.7453 26.976L53.4347 33.0981V38.7544C53.4346 41.5156 51.1959 43.7542 48.4347 43.7544H22.5656C19.8043 43.7544 17.5657 41.5157 17.5656 38.7544V35.2934L29.9728 22.145L39.4826 33.0893Z"
        className="fill-blue-50 stroke-blue-600 dark:fill-blue-900/50 dark:stroke-blue-500"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
      ></path>
      <circle
        cx="40.0902"
        cy="14.3443"
        r="4.16393"
        className="fill-blue-50 stroke-blue-600 dark:fill-blue-900/50 dark:stroke-blue-500"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
      ></circle>
      <defs>
        <filter
          id="filter4"
          x="13.5656"
          y="0"
          width="43.8689"
          height="50.7541"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          ></feColorMatrix>
          <feOffset dy="3"></feOffset>
          <feGaussianBlur stdDeviation="1.5"></feGaussianBlur>
          <feComposite in2="hardAlpha" operator="out"></feComposite>
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
          ></feColorMatrix>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect4"></feBlend>
          <feBlend mode="normal" in="SourceGraphic" in2="effect4" result="shape"></feBlend>
        </filter>
      </defs>
    </svg>
  );
};
const getFileInfo = (item: FileWithProgress | File) => {
  if (item instanceof File) {
    return {
      name: item.name || 'Unknown File',
      size: item.size || 0,
      isImage: item.type.startsWith('image/'),
      previewUrl: undefined,
    };
  }
  const fwp = item as FileWithProgress;
  if (fwp.isUrl) {
    const url = fwp.imageUrl || '';
    const filename = url.split('/').pop()?.split('?')[0] || 'Image';
    return {
      name: fwp.name || filename,
      size: fwp.size || 0,
      isImage: true,
      previewUrl: url,
    };
  }
  return {
    name: fwp.file?.name || fwp.name || 'Unknown File',
    size: fwp.file?.size || fwp.size || 0,
    isImage: fwp.file?.type.startsWith('image/') || false,
    previewUrl: fwp.previewUrl,
  };
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const PrelineFileUpload: React.FC<PrelineFileUploadProps> = ({
  onChange,
  value,
  accept,
  multiple = false,
  maxFileSize = 4 * 1024 * 1024,
  disabled = false,
  className,
  initialImages = [],
  showFullDesign = true,
  totalCount,
  showUploadingProgress = true,
}) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileIdCounter = useRef(0);

  const generateFileId = useCallback(() => `file-${Date.now()}-${fileIdCounter.current++}`, []);

  useEffect(() => {
    if (initialImages.length > 0) {
      const urlFiles: FileWithProgress[] = initialImages.map((imageUrl) => ({
        imageUrl,
        id: generateFileId(),
        progress: 100,
        name: imageUrl.split('/').pop()?.split('?')[0] || 'Image',
        isUrl: true,
        previewUrl: imageUrl,
      }));
      setFiles(urlFiles);
    }
  }, [initialImages, generateFileId]);

  const getFileObjects = useCallback((fileList: FileWithProgress[]) => {
    return fileList.filter((f) => f.file && !f.isUrl).map((f) => f.file!);
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setFiles((prevFiles) => {
        const currentFileObjects = getFileObjects(prevFiles);
        const valueFileObjects = value || [];

        if (valueFileObjects.length === 0) {
          prevFiles.forEach((f) => {
            if (f.previewUrl && !f.isUrl && f.file) {
              URL.revokeObjectURL(f.previewUrl);
            }
          });
          return [];
        }

        if (
          currentFileObjects.length !== valueFileObjects.length ||
          !currentFileObjects.every((file, index) => file === valueFileObjects[index])
        ) {
          prevFiles.forEach((f) => {
            if (f.previewUrl && !f.isUrl && f.file) {
              URL.revokeObjectURL(f.previewUrl);
            }
          });

          return valueFileObjects.map((file) => ({
            file,
            id: generateFileId(),
            progress: 100,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          }));
        }

        return prevFiles;
      });
    }
  }, [value, generateFileId, getFileObjects]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxFileSize && file.size > maxFileSize) {
        return `File "${file.name}" exceeds the size limit of ${(maxFileSize / 1024 / 1024).toFixed(0)}MB.`;
      }
      return null;
    },
    [maxFileSize]
  );

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles?.length) return;

      const validFiles: FileWithProgress[] = [];
      Array.from(newFiles).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          console.error(error);
        } else {
          validFiles.push({
            file,
            id: generateFileId(),
            progress: 0,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          });
        }
      });

      if (validFiles.length > 0) {
        const updatedFiles = multiple ? [...files, ...validFiles] : [validFiles[0]];
        setFiles(updatedFiles);
        const fileObjects = getFileObjects(updatedFiles);
        if (fileObjects.length > 0) onChange?.(fileObjects);
      }
    },
    [files, multiple, validateFile, generateFileId, getFileObjects, onChange]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const fileToRemove = files.find((f) => f.id === fileId);
      if (fileToRemove?.previewUrl && !fileToRemove.isUrl && fileToRemove.file) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      const updatedFiles = files.filter((f) => f.id !== fileId);
      setFiles(updatedFiles);
      const fileObjects = getFileObjects(updatedFiles);
      if (fileObjects.length > 0) onChange?.(fileObjects);
    },
    [files, getFileObjects, onChange]
  );

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)));
  }, []);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    files.forEach((f) => {
      if (f.id && f.progress === 0 && !f.isUrl && f.file) {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (progress >= 100) {
            clearInterval(interval);
            updateFileProgress(f.id!, 100);
          } else {
            updateFileProgress(f.id!, progress);
          }
        }, 200);
        intervals.push(interval);
      }
    });
    return () => intervals.forEach((i) => clearInterval(i));
  }, [files.length, updateFileProgress]);

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl && !f.isUrl && f.file) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, []);

  const handleDrag = useCallback(
    (e: React.DragEvent, isOver: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDragOver(isOver);
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [disabled, addFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addFiles]
  );

  return (
    <div className={classNames('preline-file-upload', className)}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {showFullDesign ? (
        <div
          className={classNames(
            'flex cursor-pointer justify-center rounded-xl border border-dashed bg-white p-12 transition-colors',
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <span className="inline-flex size-16 items-center justify-center">
              <ImgIcon />
            </span>
            <div className="mt-4 flex flex-wrap justify-center text-sm/6 text-gray-600">
              <span className="pe-1 font-medium text-gray-800">Drop your file here or</span>
              <span className="rounded-lg bg-white font-semibold text-blue-600 decoration-2 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 focus-within:outline-hidden hover:text-blue-700 hover:underline">
                browse
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Pick a file up to {(maxFileSize / 1024 / 1024).toFixed(0)}MB.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <button
            type="button"
            className={classNames(
              'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
              dragOver
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDragOver={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDrop={handleDrop}
            disabled={disabled}
          >
            <ApolloIcon name="paperclip" className="size-5" />{' '}
            {(totalCount !== undefined ? totalCount : files.length) > 0
              ? `(${totalCount !== undefined ? totalCount : files.length})`
              : ''}
          </button>
          {(totalCount !== undefined ? totalCount > 0 : files.length > 0) && (
            <Button
              variant="plain"
              size="sm"
              icon={<ApolloIcon name="cross" className="size-5 text-red-500" />}
              onClick={() => {
                setFiles((prevFiles) => {
                  prevFiles.forEach((f) => {
                    if (f.previewUrl && !f.isUrl && f.file) {
                      URL.revokeObjectURL(f.previewUrl);
                    }
                  });
                  return [];
                });
                onChange?.([]);
              }}
              disabled={totalCount !== undefined ? totalCount === 0 : files.length === 0}
              className="ml-2"
            />
          )}
        </div>
      )}

      {files.length > 0 && showUploadingProgress && (
        <div className="mt-4 space-y-2">
          {files.map((fileItem) => {
            const { name, size, isImage, previewUrl } = getFileInfo(fileItem);
            const fwp = fileItem as FileWithProgress;
            const fileId = fwp.id || '';
            const progress = fwp.progress || 0;
            const isComplete = progress >= 100;
            const extension = getFileExtension(name);
            const nameWithoutExt = name.includes('.')
              ? name.substring(0, name.lastIndexOf('.'))
              : name;

            return (
              <div
                key={fileId}
                className="rounded-xl border border-solid border-gray-300 bg-white p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-x-3">
                    <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 text-gray-500">
                      {previewUrl && isImage ? (
                        <img
                          src={previewUrl}
                          alt={name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <ApolloIcon name="file" className="text-xl" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        <span className="inline-block max-w-75 truncate align-bottom">
                          {nameWithoutExt}
                        </span>
                        {extension && <>.{extension}</>}
                      </p>
                      <p className="text-xs text-gray-500">{formatFileSize(size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-800 focus:text-gray-800 focus:outline-hidden"
                    onClick={() => removeFile(fileId)}
                    disabled={disabled}
                  >
                    <ApolloIcon name="trash" className="size-4 shrink-0" />
                  </button>
                </div>
                <div className="flex items-center gap-x-3 whitespace-nowrap">
                  <div
                    className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={classNames(
                        'flex flex-col justify-center overflow-hidden rounded-full text-center text-xs whitespace-nowrap text-white transition-all duration-500',
                        isComplete ? 'bg-green-500' : 'bg-blue-600'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="w-10 text-end">
                    <span className="text-sm text-gray-800">{progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PrelineFileUpload;
