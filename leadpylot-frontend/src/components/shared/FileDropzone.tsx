'use client';

import { useRef, useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

export interface FileDropzoneProps {
  /** Called when files are selected via click or drop */
  onChange?: (files: File[]) => void;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Accept attribute for the file input (e.g. "image/*", ".pdf") */
  accept?: string;
  /** Disable the dropzone */
  disabled?: boolean;
  /** Height utility class (default: h-20) */
  heightClass?: string;
  /** Width utility class (default: w-full) */
  widthClass?: string;
  /** Additional CSS classes for the dropzone root */
  className?: string;
  /** Label when idle */
  label?: string;
  /** Label when dragging files over */
  labelDragActive?: string;
}

const DEFAULT_BASE_CLASS =
  'flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed transition-all duration-200';

export function FileDropzone({
  onChange,
  multiple = true,
  accept,
  disabled = false,
  heightClass = 'h-20',
  widthClass = 'w-full',
  className,
  label = 'Drop files or click to add',
  labelDragActive = 'Drop files here',
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const rootClassName = classNames(
    DEFAULT_BASE_CLASS,
    heightClass,
    widthClass,
    disabled && 'pointer-events-none cursor-not-allowed opacity-50',
    !disabled &&
      (isDragOver
        ? 'border-blue-500 bg-blue-50/90 scale-[1.01]'
        : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/80'),
    className
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length) onChange?.(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) onChange?.(Array.from(files));
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={rootClassName}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-label={label}
      >
        {isDragOver ? (
          <>
            <ApolloIcon name="file-upload" className="h-6 w-6 shrink-0 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{labelDragActive}</span>
          </>
        ) : (
          <>
            <ApolloIcon name="cloud-upload" className="h-5 w-5 shrink-0 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">{label}</span>
          </>
        )}
      </div>
    </>
  );
}
