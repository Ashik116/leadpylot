import React, { useState } from 'react';
import Image from 'next/image';
import { useAttachmentDisplayUrl } from '@/utils/hooks/useAttachmentDisplayUrl';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import classNames from '@/utils/classNames';

interface LogoPreviewProps {
  /** Document ID string, or full doc object with _id and optional public_url (from API) */
  attachmentId?: string | { _id: string; public_url?: string };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showZoom?: boolean;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  imageClassName?: string;
}

const sizeConfig = {
  sm: { width: 40, height: 40, className: 'w-10 h-10' },
  md: { width: 60, height: 60, className: 'w-15 h-15' },
  lg: { width: 80, height: 80, className: 'w-20 h-20' },
  xl: { width: 120, height: 120, className: 'w-30 h-30' },
};

// Fallback component for when there's no image or error
const FallbackComponent: React.FC<{
  sizeSettings: (typeof sizeConfig)[keyof typeof sizeConfig];
  className?: string;
  fallbackIcon?: React.ReactNode;
  size: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ sizeSettings, className, fallbackIcon, size }) => (
  <div
    className={classNames(
      'flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100',
      sizeSettings.className,
      className
    )}
  >
    {fallbackIcon || (
      <ApolloIcon
        name="picture"
        className={classNames(
          'text-gray-400',
          size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
        )}
      />
    )}
  </div>
);

// Loading component
const LoadingComponent: React.FC<{
  sizeSettings: (typeof sizeConfig)[keyof typeof sizeConfig];
  className?: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ sizeSettings, className, size }) => (
  <div
    className={classNames(
      'flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50',
      sizeSettings.className,
      className
    )}
  >
    <Spinner className={classNames('text-gray-400', size === 'sm' ? 'text-sm' : 'text-base')} />
  </div>
);

const LogoPreview: React.FC<LogoPreviewProps> = ({
  attachmentId,
  size = 'md',
  className,
  showZoom = false,
  alt = 'Logo',
  fallbackIcon,
  imageClassName,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const actualAttachmentId = typeof attachmentId === 'string' ? attachmentId : attachmentId?._id;
  const displayUrl = useAttachmentDisplayUrl(attachmentId ?? undefined);

  const sizeSettings = sizeConfig[size];

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (showZoom && displayUrl && !hasError) {
      setIsDialogOpen(true);
    }
  };

  if (!actualAttachmentId && !displayUrl) {
    return (
      <FallbackComponent
        sizeSettings={sizeSettings}
        className={className}
        fallbackIcon={fallbackIcon}
        size={size}
      />
    );
  }

  if (isLoading && !displayUrl) {
    return <LoadingComponent sizeSettings={sizeSettings} className={className} size={size} />;
  }

  if (hasError || !displayUrl) {
    return (
      <FallbackComponent
        sizeSettings={sizeSettings}
        className={className}
        fallbackIcon={fallbackIcon}
        size={size}
      />
    );
  }

  return (
    <>
      <div
        className={classNames(
          'group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200',
          showZoom && 'cursor-pointer hover:scale-105 hover:shadow-md',
          sizeSettings.className,
          className
        )}
        onClick={handleClick}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Spinner className="text-gray-400" />
          </div>
        )}

        {/* Image */}
        <Image
          src={displayUrl}
          alt={alt}
          width={sizeSettings.width}
          height={sizeSettings.height}
          className={classNames(
            'object-cover transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100',
            imageClassName
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          unoptimized // Since we're using blob URLs
        />

        {/* Zoom overlay on hover */}
        {showZoom && !isLoading && (
          <div className="bg-opacity-0 group-hover:bg-opacity-30 absolute inset-0 flex items-center justify-center bg-black transition-all duration-200">
            <ApolloIcon
              name="search"
              className="text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </div>
        )}
      </div>

      {showZoom && (
        <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} className="max-w-4xl">
            <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{alt}</h3>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <ApolloIcon name="cross" className="text-lg" />
              </button>
            </div>
            <div className="flex justify-center">
              <Image
                src={displayUrl}
                alt={alt}
                width={600}
                height={400}
                className="max-h-96 w-auto object-contain"
                unoptimized
              />
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default LogoPreview;
