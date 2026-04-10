'use client';

import React from 'react';
import PdfIcon from '@/components/ui/icons/pdfIcon';
import ImageIcon from '@/components/ui/icons/ImageIcon';
import OthersFileIcon from '@/components/ui/icons/OthersFileIcon';
import { getFileTypeIcon, getFileTypeColor } from '@/configs/fileTypeIcon.config';
import type { FileTypeCategory } from '@/configs/fileTypeIcon.config';
import classNames from '@/utils/classNames';

const FILE_TYPE_ICONS: Record<FileTypeCategory, React.ComponentType<React.ComponentProps<'svg'>>> = {
  pdf: PdfIcon,
  image: ImageIcon,
  other: OthersFileIcon,
};

export interface FileDocumentCardProps {
  filename: string;
  mimeType?: string;
  onClick?: (e?: React.MouseEvent) => void;
  variant: 'card' | 'row';
  actions?: React.ReactNode;
  className?: string;
}

export const FileDocumentCard: React.FC<FileDocumentCardProps> = ({
  filename,
  mimeType,
  onClick,
  variant,
  actions,
  className,
}) => {
  const iconType = getFileTypeIcon(filename, mimeType);
  const iconColor = getFileTypeColor(filename, mimeType);
  const displayName = filename || 'Document';
  const IconComponent = FILE_TYPE_ICONS[iconType];
  const iconSizeClass = variant === 'card' ? 'size-5' : 'size-4 shrink-0';
  const iconClassName = classNames(iconSizeClass, iconColor);

  if (variant === 'card') {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={classNames(
          'group flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 shadow-xs transition-all hover:border-gray-200 hover:bg-white',
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-center rounded-md shadow-xs ring-1 ring-gray-100 group-hover:ring-gray-200">
          <IconComponent className={iconClassName} />
        </div>
        <span className="max-w-[220px] truncate text-[13px] font-semibold text-gray-700">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      title={displayName}
      className={classNames(
        'group relative flex h-6 cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-2 hover:bg-gray-50 overflow-hidden',
        className
      )}
    >
      <IconComponent className={iconClassName} />
      <div className="min-w-0 flex-1 truncate">
        <span className={classNames('block truncate text-xs font-normal tracking-tighter')}>
          {displayName}
        </span>
      </div>
      {actions && (
        <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-0.5 bg-gradient-to-l from-white via-white/90 to-transparent pl-6 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
};
