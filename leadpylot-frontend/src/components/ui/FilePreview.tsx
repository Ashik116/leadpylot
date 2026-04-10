import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { apiFetchDocument } from '@/services/DocumentService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiGetTemplatePreview, apiGetTemplatePreviewNew } from '@/services/PdfTemplateService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface FilePreviewProps {
    documentId?: string;
    filename?: string;
    fileType?: string;
    height?: string;
    className?: string;
    showLoadingMessage?: boolean;
    onLoad?: () => void;
    onError?: (error: Error) => void;
    fallbackContent?: React.ReactNode;
    urlType?: 'document' | 'template' | 'admin';
}
export const SkeletonLoader = () => (
    <div className={`h-full w-full bg-gray-50 rounded-lg border border-gray-200`}>
        <div className="h-full w-full relative overflow-hidden">
            {/* Header skeleton */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gray-100 animate-pulse">
                <div className="flex items-center justify-between h-full px-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="space-y-1">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Content skeleton */}
            <div className="pt-12 h-full">
                {/* PDF/Image skeleton */}
                <div className="h-full bg-gray-100 animate-pulse">
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center relative">
                            <LoadingSpinner
                                size="lg"
                                variant="truck"
                                className="mx-auto mb-4"
                            />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 rounded mx-auto animate-pulse"></div>
                                <div className="h-3 w-24 bg-gray-200 rounded mx-auto animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
const FilePreview: React.FC<FilePreviewProps> = ({
    documentId,
    filename,
    fileType = 'pdf',
    className = '',
    onLoad,
    onError,
    fallbackContent,
    urlType = 'document',
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const loadPreview = useCallback(async () => {
        if (!documentId) {
            setHasError(true);
            return;
        }

        try {
            setIsLoading(true);
            setHasError(false);
            let blob;
            if (urlType === 'template') {
                blob = await apiGetTemplatePreviewNew(documentId);
            }
            else if (urlType === 'admin') {
                blob = await apiGetTemplatePreview(documentId);
            }
            else {
                blob = await apiFetchDocument(documentId);
            }

            // Ensure PDF files have correct MIME type
            let processedBlob = blob;
            if (fileType === 'pdf' && blob.type !== 'application/pdf') {
                processedBlob = new Blob([blob], { type: 'application/pdf' });
            }

            const url = URL.createObjectURL(processedBlob);
            setPreviewUrl(url);
            onLoad?.();
        } catch (error) {
            console.error('Error loading file preview:', error);
            setHasError(true);
            onError?.(error as Error);

            toast.push(
                <Notification title="Preview Error" type="danger">
                    Failed to load file preview
                </Notification>
            );
        } finally {
            setIsLoading(false);
        }
    }, [documentId, fileType, onError, onLoad, urlType]);

    // Load preview when documentId changes
    useEffect(() => {
        if (documentId) {
            // Add a small delay to ensure the PDF generation is complete
            const timer = setTimeout(() => {
                loadPreview();
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [documentId]); // Remove loadPreview from dependencies to prevent infinite loops

    // Clean up object URL when component unmounts or URL changes
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Determine if file is previewable
    const isPreviewable = fileType === 'pdf' || fileType.startsWith('image/');

    // Skeleton loading component

    if (isLoading) {
        return <SkeletonLoader />;
    }

    if (!previewUrl) {
        return (
            <div className={`h-full w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
                <div className="text-center">
                    <ApolloIcon name="file" className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No preview available</p>
                </div>
            </div>
        );
    }

    // Render preview based on file type
    if (fileType === 'pdf') {
        return (
            <div className={`border h-full w-full border-gray-200 rounded-lg overflow-hidden ${className}`}>
                <iframe
                    src={`${previewUrl}`}
                    title={`PDF Preview - ${filename || 'Document'}`}
                    className="w-full h-full"
                    style={{ minHeight: '100%' }}
                />
            </div>
        );
    }

    if (fileType.startsWith('image/')) {
        return (
            <div className={`relative border h-full w-full border-gray-200 rounded-lg overflow-hidden ${className}`}>
                <Image
                    src={previewUrl}
                    alt={filename || 'Image preview'}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
        );
    }
    if (!documentId) {
        return (
            <div className={`h-full w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
                <div className="text-center">
                    <ApolloIcon name="file" className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No file selected</p>
                </div>
            </div>
        );
    }


    if (hasError) {
        return (
            <div className={`h-full w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
                <div className="text-center">
                    <ApolloIcon name="alert-circle" className="mx-auto mb-2 h-12 w-12 text-red-400" />
                    <p className="text-gray-500">Failed to load preview</p>
                    {fallbackContent && (
                        <div className="mt-2">
                            {fallbackContent}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    if (!isPreviewable) {
        return (
            <div className={`h-full w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
                <div className="text-center">
                    <ApolloIcon name="file" className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <p className="text-sm text-gray-400 mt-1">{filename}</p>
                </div>
            </div>
        );
    }

    // Fallback for other file types
    return (
        <div className={`h-full w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
            <div className="text-center">
                <ApolloIcon name="file" className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">Preview not supported</p>
                <p className="text-sm text-gray-400 mt-1">{filename}</p>
            </div>
        </div>
    );
};

export default FilePreview; 