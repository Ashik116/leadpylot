'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Popover from '@/components/ui/Popover';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { FileDocumentCard } from '@/components/shared/FileDocumentCard';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType, downloadDocument } from '@/utils/documentUtils';
import { apiFetchDocument } from '@/services/DocumentService';
import { useDeleteSlotDocument, usePinToSlotBulk } from '@/services/hooks/useDocumentSlots';
import useNotification from '@/utils/hooks/useNotification';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useQueryClient } from '@tanstack/react-query';
import classNames from '@/utils/classNames';
import { apiUploadLibraryDocuments } from '@/services/DocumentService';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { useEmailViewStore } from '@/stores/emailViewStore';
import { constructConversationFromEmails } from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/emailSlotUtils';
import EmailViewContent from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/EmailViewContent';

interface DocumentSlotViewerProps {
    documents: any[];
    slotName: string;
    offerId?: string;
    userRole?: string;
    canDelete?: boolean;
    showUpload?: boolean;
    className?: string;
    emails?: any[];
    slotLabel?: string;
    /** Column ID for bulk download (e.g. 'email', 'contract_id') */
    columnId?: string;
    /** Selected rows for bulk download - when non-empty, download icon triggers bulk download */
    selectedItems?: any[];
    /** Called when user clicks download with rows selected - bulk download for this column type */
    onBulkDownload?: (columnId: string) => void;
}

type PreviewItem = {
    id: string;
    filename: string;
    fileType: string;
};

const toPreviewItem = (doc: any): PreviewItem => ({
    id: doc._id || doc.id,
    filename: doc.filename || 'Document',
    fileType: doc.filetype || doc.type || 'application/octet-stream',
});

export const DocumentSlotViewer: React.FC<DocumentSlotViewerProps> = ({
    documents = [],
    slotName,
    offerId,
    userRole,
    canDelete = false,
    showUpload = false,
    className,
    emails = [],
    slotLabel,
    columnId,
    selectedItems = [],
    onBulkDownload,
}) => {
    const { openNotification } = useNotification();
    const documentPreview = useDocumentPreview();
    const deleteSlotDocumentMutation = useDeleteSlotDocument();
    const pinToSlotBulkMutation = usePinToSlotBulk();
    const queryClient = useQueryClient();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const setEmailView = useEmailViewStore((s) => s.setEmailView);
    const clearEmailView = useEmailViewStore((s) => s.clearEmailView);
    const setOpenedFromDocumentSlotViewer = useEmailViewStore((s) => s.setOpenedFromDocumentSlotViewer);
    const emailViewData = useEmailViewStore((s) => s.data);

    const [isUploading, setIsUploading] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const hasEmails = (emails?.length ?? 0) > 0;
    const hasDocuments = documents?.length > 0;
    const hasContent = hasDocuments || hasEmails;

    const handleViewClick = useCallback(() => {
        if (!hasEmails) return;
        const conversation = constructConversationFromEmails(emails);
        setEmailView(
            conversation,
            slotLabel ?? slotName,
            documents ?? [],
            offerId ? String(offerId) : undefined,
            slotName
        );
        setOpenedFromDocumentSlotViewer(true);
        setIsViewModalOpen(true);
    }, [emails, hasEmails, setEmailView, setOpenedFromDocumentSlotViewer, slotLabel, slotName, documents, offerId]);

    const handleViewModalClose = useCallback(() => {
        clearEmailView();
        setIsViewModalOpen(false);
        // Re-apply block briefly so overlay click doesn't fall through to row during close animation
        setOpenedFromDocumentSlotViewer(true);
        setTimeout(() => setOpenedFromDocumentSlotViewer(false), 300);
    }, [clearEmailView, setOpenedFromDocumentSlotViewer]);

    useEffect(() => {
        if (isViewModalOpen && !emailViewData) {
            setIsViewModalOpen(false);
        }
    }, [isViewModalOpen, emailViewData]);

    const [previewIndex, setPreviewIndex] = useState(0);
    const previewItems = documents.map(toPreviewItem);

    const isAdmin = userRole === Role.ADMIN;
    const effectiveCanDelete = canDelete || isAdmin;

    const handleFilePreview = useCallback(
        (index: number) => {
            setPreviewIndex(index);
            const item = previewItems[index];
            const previewType = getDocumentPreviewType(item.fileType, item.filename) as
                | 'pdf'
                | 'image'
                | 'other';
            documentPreview.openPreview(item.id, item.filename, previewType);
        },
        [previewItems, documentPreview]
    );

    const handleFileDownload = useCallback(
        async (item: PreviewItem) => {
            try {
                const blob = await apiFetchDocument(item.id);
                const contentType = blob.type || item.fileType || 'application/octet-stream';
                downloadDocument(blob, item.filename, contentType);
            } catch {
                openNotification({ type: 'danger', massage: 'Failed to download document' });
            }
        },
        [openNotification]
    );

    const handleDownloadClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (selectedItems?.length > 0 && columnId && onBulkDownload) {
                onBulkDownload(columnId);
            } else if (hasDocuments && previewItems.length > 0) {
                handleFileDownload(previewItems[0]);
            }
        },
        [selectedItems, columnId, onBulkDownload, hasDocuments, previewItems, handleFileDownload]
    );

    const handleFileDelete = useCallback(
        (item: PreviewItem) => {
            if (!offerId) return;
            deleteSlotDocumentMutation.mutate({
                offerId: String(offerId),
                slotName,
                documentId: item.id,
                documentType: 'documents',
            }, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
                    queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
                    queryClient.invalidateQueries({ queryKey: ['offers'] });
                }
            });
        },
        [offerId, slotName, deleteSlotDocumentMutation, queryClient]
    );

    const handlePreviewNext = useCallback(() => {
        if (previewItems.length <= 1) return;
        const nextIndex = (previewIndex + 1) % previewItems.length;
        handleFilePreview(nextIndex);
    }, [previewItems.length, previewIndex, handleFilePreview]);

    const handlePreviewPrev = useCallback(() => {
        if (previewItems.length <= 1) return;
        const prevIndex = (previewIndex - 1 + previewItems.length) % previewItems.length;
        handleFilePreview(prevIndex);
    }, [previewItems.length, previewIndex, handleFilePreview]);

    const handleFileUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (!offerId || files.length === 0) return;

            try {
                setIsUploading(true);
                const response = (await apiUploadLibraryDocuments(files)) as any;

                const successfulUploads = response?.data?.successful || [];
                const documentIds = successfulUploads.map((item: any) => item.documentId);

                if (documentIds.length > 0) {
                    await pinToSlotBulkMutation.mutateAsync({
                        offerId: String(offerId),
                        slotName,
                        documentIds,
                    });

                    queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
                    queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
                    queryClient.invalidateQueries({ queryKey: ['offers'] });

                    // // After successful upload and pin, preview the first document
                    // const firstDocId = documentIds[0];
                    // const firstDocName = successfulUploads[0].filename || 'Document';
                    // const firstDocType = successfulUploads[0].filetype || 'application/octet-stream';

                    // const previewType = getDocumentPreviewType(firstDocType, firstDocName) as
                    //     | 'pdf'
                    //     | 'image'
                    //     | 'other';

                    // documentPreview.openPreview(firstDocId, firstDocName, previewType);
                } else {
                    throw new Error('No files were successfully uploaded');
                }
            } catch (error: any) {
                openNotification({
                    type: 'danger',
                    massage: error?.message || 'Failed to upload and pin documents',
                });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        },
        [offerId, slotName, pinToSlotBulkMutation, openNotification, documentPreview]
    );

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    const renderUploadButton = (label?: string, variant: 'black' | 'icon' = 'black', className?: string) => {
        if (variant === 'icon') {
            return (
                <Button
                    variant="plain"
                    size="xs"
                    title="Upload more"
                    loading={isUploading}
                    icon={<ApolloIcon name="upload" className="text-sm" />}
                    onClick={handleButtonClick}
                />
            );
        }
        return (
            <Button
                asElement="div"
                size="xs"
                variant="secondary"
                loading={isUploading}
                onClick={handleButtonClick}
                icon={<ApolloIcon name="upload" className="text-sm" />}
                className={`${className} cursor-pointer`}
            >
                <span className="font-bold text-[13px]">{label || 'Upload'}</span>
            </Button>
        );
    };

    const handleDeleteFromPreview = useCallback(async () => {
        if (!effectiveCanDelete || !offerId || !documentPreview.selectedDocumentId) return;

        try {
            await deleteSlotDocumentMutation.mutateAsync({
                offerId: String(offerId),
                slotName: slotName,
                documentId: documentPreview.selectedDocumentId,
                documentType: 'documents',
            });

            // Invalidate queries after successful deletion
            await queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
            await queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
            await queryClient.invalidateQueries({ queryKey: ['offers'] });

            documentPreview.closePreview();
        } catch (error) {
            // Error is already handled by the mutation
            console.error('Failed to delete document:', error);
        }
    }, [
        effectiveCanDelete,
        offerId,
        slotName,
        documentPreview,
        deleteSlotDocumentMutation,
        queryClient,
    ]);

    if (!hasContent) {
        return (
            <div className={classNames("flex items-center gap-1", className)}>
                {renderUploadButton()}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    // Action buttons when has content: eye, mail, upload, delete
    const actionButtons = (
        <div className={classNames("flex items-center gap-1", className)}>
            {/* Eye - document preview (when has documents) */}
            {hasDocuments && documents.length === 1 && (
                <Button
                    variant="plain"
                    size="xs"
                    title="Preview"
                    icon={<ApolloIcon name="eye-filled" className="text-sm text-blue-600" />}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFilePreview(0);
                    }}
                />
            )}
            {hasDocuments && documents.length > 1 && (
                <Popover
                    placement="bottom-end"
                    content={
                        <div className="max-h-64 w-64 overflow-y-auto p-1">
                            {showUpload && (
                                <div className="mb-2 pb-2 border-b border-gray-100 px-1">
                                    {renderUploadButton('Add New File', 'black', 'w-full')}
                                </div>
                            )}
                            <div className="space-y-0.5">
                                {previewItems.map((item, index) => (
                                    <FileDocumentCard
                                        key={item.id}
                                        variant="row"
                                        filename={item.filename}
                                        mimeType={item.fileType}
                                        onClick={(e) => {
                                            e?.stopPropagation();
                                            handleFilePreview(index);
                                        }}
                                        className="border-0 px-2 py-1.5"
                                        actions={
                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    variant="plain"
                                                    size="xs"
                                                    title="Download"
                                                    icon={<ApolloIcon name="download" className="text-sm text-gray-600" />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (selectedItems?.length > 0 && columnId && onBulkDownload) {
                                                            onBulkDownload(columnId);
                                                        } else {
                                                            handleFileDownload(item);
                                                        }
                                                    }}
                                                />
                                                {effectiveCanDelete && (
                                                    <ConfirmPopover
                                                        title="Delete Document"
                                                        description="Are you sure you want to delete this document?"
                                                        onConfirm={() => handleFileDelete(item)}
                                                        confirmText="Delete"
                                                        confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                                                        placement="left"
                                                    >
                                                        <Button
                                                            variant="plain"
                                                            size="xs"
                                                            title="Delete document"
                                                            icon={<ApolloIcon name="trash" className="text-sm text-red-500" />}
                                                            disabled={deleteSlotDocumentMutation.isPending}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </ConfirmPopover>
                                                )}
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    }
                >
                    <Button
                        size="xs"
                        variant="plain"
                        title={`View ${documents.length} files`}
                        // icon={<ApolloIcon name="eye-filled" className="text-sm text-blue-600" />}
                        onClick={(e) => e.stopPropagation()}
                        className="gap-1.5 px-1 py-1 rounded-sm  hover:bg-gray-50 whitespace-nowrap leading-none"
                    >
                        <ApolloIcon name="paperclip" className="text-sm text-gray-600" />
                        <span className="text-xs font-medium">{documents.length}</span>
                        <ApolloIcon name="dropdown-large" className="text-sm text-gray-500" />
                    </Button>
                </Popover>
            )}
            {/* Download icon - bulk when rows selected, else single doc (or no-op for emails-only) */}
            {(hasDocuments || hasEmails) && (
                <Button
                    variant="plain"
                    size="xs"
                    title={selectedItems?.length ? `Download all (${selectedItems.length} selected)` : 'Download'}
                    icon={<ApolloIcon name="download" className="text-sm text-emerald-500" />}
                    onClick={handleDownloadClick}
                />
            )}
            {/* Mail icon - view emails (when has emails) */}
            {hasEmails && (
                <Button
                    size="xs"
                    variant="plain"
                    title="View emails"
                    icon={<ApolloIcon name="mail" className="text-sm text-gray-600" />}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleViewClick();
                    }}
                />
            )}
            {/* Upload icon */}
            {showUpload && renderUploadButton(undefined, 'icon')}
            {/* Delete - single document only */}
            {hasDocuments && documents.length === 1 && effectiveCanDelete && (
                <ConfirmPopover
                    title="Delete Document"
                    description="Are you sure you want to remove this document from the slot?"
                    onConfirm={() => handleFileDelete(previewItems[0])}
                    confirmText="Delete"
                    confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                    placement="left"
                >
                    <Button
                        variant="plain"
                        size="xs"
                        title="Delete"
                        icon={<ApolloIcon name="trash" className="text-sm text-red-500" />}
                        disabled={deleteSlotDocumentMutation.isPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </ConfirmPopover>
            )}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );

    // Emails only - just action buttons + dialog
    if (!hasDocuments && hasEmails) {
        return (
            <>
                {actionButtons}
                <Dialog
                    isOpen={isViewModalOpen}
                    onClose={handleViewModalClose}
                    onRequestClose={handleViewModalClose}
                    width="95vw"
                    height="90vh"
                    contentClassName="flex max-w-none min-h-0 flex-col overflow-hidden p-0" >
                    <div className="border-b border-gray-200 px-6 py-3">
                        <h3 className="text-lg font-medium text-gray-900">{slotLabel ?? slotName}</h3>
                    </div>
                    <div
                        className="min-h-[300px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <EmailViewContent
                            currentOfferId={offerId ? String(offerId) : undefined}
                            embeddedInDialog
                            isShareable={false}
                            contentPadding="p-2"
                        />
                    </div>
                </Dialog>
            </>
        );
    }

    // Single document
    if (documents.length === 1) {
        return (
            <>
                {actionButtons}
                <DocumentPreviewDialog
                    {...documentPreview.dialogProps}
                    showNavigation={false}
                    onClose={documentPreview.closePreview}
                    onDelete={effectiveCanDelete ? handleDeleteFromPreview : undefined}
                    canDelete={effectiveCanDelete}
                    isDeleting={deleteSlotDocumentMutation.isPending}
                />
                {hasEmails && (
                    <Dialog
                        isOpen={isViewModalOpen}
                        onClose={handleViewModalClose}
                        onRequestClose={handleViewModalClose}
                        width="95vw"
                        height="90vh"
                        contentClassName="flex max-w-none min-h-0 flex-col overflow-hidden p-0"
                    >
                        <div className="border-b border-gray-200 px-6 py-3">
                            <h3 className="text-lg font-medium text-gray-900">{slotLabel ?? slotName}</h3>
                        </div>
                        <div
                            className="min-h-[300px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <EmailViewContent
                                currentOfferId={offerId ? String(offerId) : undefined}
                                embeddedInDialog
                                contentPadding="p-2"
                            />
                        </div>
                    </Dialog>
                )}
            </>
        );
    }

    // Multiple documents
    return (
        <>
            {actionButtons}
            <DocumentPreviewDialog
                {...documentPreview.dialogProps}
                onClose={documentPreview.closePreview}
                title="Document Preview"
                showNavigation={previewItems.length > 1}
                currentIndex={previewIndex}
                totalFiles={previewItems.length}
                onNext={handlePreviewNext}
                onPrevious={handlePreviewPrev}
                onDelete={effectiveCanDelete ? handleDeleteFromPreview : undefined}
                canDelete={effectiveCanDelete}
                isDeleting={deleteSlotDocumentMutation.isPending}
            />
            {hasEmails && (
                <Dialog
                    isOpen={isViewModalOpen}
                    onClose={handleViewModalClose}
                    onRequestClose={handleViewModalClose}
                    width="95vw"
                    height="90vh"
                    contentClassName="flex max-w-none min-h-0 flex-col overflow-hidden p-0"
                >
                    <div className="border-b border-gray-200 px-6 py-3">
                        <h3 className="text-lg font-medium text-gray-900">{slotLabel ?? slotName}</h3>
                    </div>
                    <div
                        className="min-h-[300px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <EmailViewContent
                            currentOfferId={offerId ? String(offerId) : undefined}
                            isShareable={false}
                            embeddedInDialog
                            contentPadding="p-2"
                        />
                    </div>
                </Dialog>
            )}
        </>
    );
};
