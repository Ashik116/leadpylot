'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Upload from '@/components/ui/Upload';
import { FcImageFile } from 'react-icons/fc';
import ApolloIcon from '../ApolloIcon';
import Button from '../Button';
import classNames from '@/utils/classNames';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';

type ImageUploaderProps = {
  onChange?: (data: File | null) => void;
  uploaderClassName?: string;
  accept?: string;
  supportPlaceholder?: string;
  uploadApi?: string;
  loadingText?: string;
  disabled?: boolean;
  defaultImageUrl?: string;
  name?: string;
  attachmentId?: string;
  setValue?: (name: any, value: any) => void;
  imageSize?: string;
};

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onChange,
  uploaderClassName,
  accept = '.png,.jpg,.jpeg',
  supportPlaceholder = 'Support: Jpg, jpeg, png',
  uploadApi,
  loadingText = 'Uploading...',
  disabled,
  defaultImageUrl,
  name,
  setValue,
  attachmentId,
  imageSize,
  ...props
}) => {
  const { blobUrl } = useAttachmentPreviewFile(attachmentId);

  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImageUrl || blobUrl);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    if (uploadApi) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(uploadApi, {
          method: 'POST',
          body: formData,
        });

        const result = await res.json();

        if (!res.ok || !result?.data?.url) {
          throw new Error(result?.error?.message || 'Upload failed');
        }

        setUploadedUrl(result.data.url);
        setValue?.(name!, result.data.url); // if using url as value
        onChange?.(result.data.url);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message || 'Upload failed');
      } finally {
        setLoading(false);
      }
    } else {
      const blobUrl = URL.createObjectURL(file);
      setPreviewUrl(blobUrl);
      setUploadedUrl(null);
      setValue?.(name!, file); // <-- update form state
      onChange?.(file);
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
    setValue?.(name!, null); // clear form state
    onChange?.(null);
  };

  useEffect(() => {
    if (blobUrl) {
      setPreviewUrl(blobUrl);
    }
  }, [blobUrl]);

  const imageSrc = uploadedUrl || previewUrl;

  return (
    <div className="mx-auto h-40 w-full">
      {!imageSrc ? (
        <Upload
          showList={false}
          accept={accept}
          className={classNames('h-40', uploaderClassName)}
          onChange={handleUpload}
          draggable
          disabled={disabled}
          {...props}
        >
          <div className="my-16 text-center">
            <div className="mb-4 flex justify-center text-6xl">
              <FcImageFile />
            </div>
            <p className="font-semibold">
              <span className="text-gray-800">Drop your image here, or </span>
              <span className="text-blue-500">browse</span>
            </p>
            <p className="mt-1 text-xs opacity-60">{supportPlaceholder}</p>
            {loading && <p className="text-sunbeam-2 mt-2 text-sm">{loadingText}</p>}
            {error && <p className="text-rust mt-2 text-sm">{error}</p>}
          </div>
        </Upload>
      ) : (
        <div className="relative h-full w-full overflow-hidden rounded-xl border">
          <Image
            src={imageSrc}
            alt="Uploaded"
            fill
            className={`rounded-xl  ${imageSize ? imageSize : 'object-cover'}`}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {!disabled && (
            <Button
              onClick={handleRemove}
              variant="plain"
              shape="circle"
              size="xs"
              icon={<ApolloIcon name="times" />}
              className="absolute top-2 right-2 bg-white text-red-600 shadow hover:bg-red-100"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
