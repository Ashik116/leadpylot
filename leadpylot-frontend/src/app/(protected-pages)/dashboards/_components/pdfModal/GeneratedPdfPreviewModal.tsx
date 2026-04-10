import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import FilePreview, { SkeletonLoader } from '@/components/ui/FilePreview';
import { useAssignGeneratedPdf, useDownloadGeneratedPdfWithLoading, useRejectGeneratedPdf, useGeneratedPdfData, useUpdateGeneratedPdfData } from '@/services/hooks/usePdfTemplates';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { TGeneratedPdfPreviewModalProps } from './typePdf/PdfType';
import PdfDataEditForm from './PdfEditForm';
import { truncateFileName } from '@/utils/utils';
// import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';


const GeneratedPdfPreviewModal: React.FC<TGeneratedPdfPreviewModalProps> = ({
    isOpen,
    onClose,
    generatedPdfData,
}) => {
    const assignMutation = useAssignGeneratedPdf();
    const rejectMutation = useRejectGeneratedPdf();
    const updatePdfDataMutation = useUpdateGeneratedPdfData();
    // const { setAssignedPdfData } = useGeneratedPdfStore();

    const {
        // downloadGeneratedPdf,
        isDownloading,
        getError,
        clearError
    } = useDownloadGeneratedPdfWithLoading();

    // States for edit mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // To refresh FilePreview after updates
    const [editedData, setEditedData] = useState<any>(null);

    // Add a small delay to ensure PDF generation is complete before showing preview
    const [isReady, setIsReady] = useState(false);
    const pdfId = generatedPdfData?.generatedPdf?._id || generatedPdfData?._id;
    const isDownloadingPdf = pdfId ? isDownloading(pdfId) : false;
    const downloadError = pdfId ? getError(pdfId) : null;
    const pdfName = generatedPdfData?.generatedPdf?.filename || generatedPdfData?.filename;
    const pdfType = generatedPdfData?.generatedPdf?.generation_type || generatedPdfData?.generation_type;
    const pdfVersion = generatedPdfData?.generatedPdf?.version || generatedPdfData?.version;

    // Fetch PDF data for editing when entering edit mode
    const { data: pdfEditData, isLoading: isLoadingEditData, refetch: refetchEditData } = useGeneratedPdfData(
        isEditMode ? pdfId : undefined
    );

    useEffect(() => {
        if (pdfId) {
            const timer = setTimeout(() => {
                setIsReady(true);
            }, 1000); // Wait 1 second for PDF generation to complete

            return () => clearTimeout(timer);
        } else {
            setIsReady(false);
        }
    }, [pdfId]);

    // Reset edit mode when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsEditMode(false);
            setEditedData(null);
        }
    }, [isOpen]);

    // Don't render if no PDF data
    if (!generatedPdfData || (!generatedPdfData?.generatedPdf?._id && !generatedPdfData?._id)) {
        return null;
    }



    const handleAssign = async () => {
        if (!pdfId) return;

        try {
            const d = await assignMutation.mutateAsync(pdfId);
            console.log({ generatePDFPreview: d })

            // Store the PDF data for automatic attachment in compose mail
            // if (d.data.document) {
            //     const { _id, filename, size } = d.data.document
            //     const pdfAttachmentData = {
            //         id: _id,
            //         name: filename || 'generated_pdf.pdf',
            //         // type: generation_type,
            //         size: ((size / 1000) / 1000) + ' MB', // You may want to get actual size from the API response
            //         file: new File([], pdfName || 'generated_pdf.pdf', { type: 'application/pdf' })
            //     };

            //     setAssignedPdfData(pdfAttachmentData);
            // }
            onClose();
        } catch {
            console.log("Error assigning PDF");
            // Error handling is managed by the mutation hook
        }
    };

    const handleReject = async () => {
        if (!pdfId) return;

        try {
            await rejectMutation.mutateAsync(pdfId);
            onClose();
        } catch {
            console.log("Error rejecting PDF");
            // Error handling is managed by the mutation hook
        }
    };

    // const handleDownload = async () => {
    //     if (!pdfId) return;
    //     try {
    //         await downloadGeneratedPdf(pdfId, generatedPdfData.generatedPdf.filename);
    //     } catch {
    //         console.log("Error downloading PDF");
    //         // Error is already handled by the hook, but we can clear it if needed
    //         clearError(pdfId);
    //     }
    // };

    const handleEdit = () => {
        setIsEditMode(true);
        setEditedData(null);
    };

    const handleSaveEdit = async (updatedData: any, notes?: string) => {
        if (!pdfId) return;

        try {
            await updatePdfDataMutation.mutateAsync({
                generatedPdfId: pdfId,
                updateData: {
                    data: updatedData,
                    notes: notes,
                }
            });

            // Exit edit mode and refresh the preview
            setIsEditMode(false);
            setEditedData(null);
            setRefreshKey(prev => prev + 1); // This will cause FilePreview to reload

            // Optionally refetch the edit data for next time
            refetchEditData();
        } catch {
            console.log("Error saving PDF");
            // Error handling is done by the mutation hook
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditedData(null);
    };

    const handleDataChange = (data: any) => setEditedData(data);

    // Show loading state while preparing

    return (
        <Dialog isOpen={isOpen} onClose={handleReject}
            className={'fixed inset-0 top-0 z-50 !m-0 min-h-full min-w-full'}
            contentClassName="mx-20 h-[90vh]"
        >
            {!isReady ? (
                <SkeletonLoader />
            ) : (
                <div className="rounded-xl bg-white h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between py-1 border-b border-gray-100 overflow-hidden">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <ApolloIcon name="desktop" className=" text-blue-500" />
                        </div>
                        <div className='flex justify-between w-full'>
                            <div className='flex gap-2 '>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 capitalize max-w-[5rem] sm:max-w-[10rem]  md:max-w-[15rem] xl:max-w-max truncate">{truncateFileName(pdfName || "", 50)}</h3>
                                    {/* <p className="text-sm text-gray-500 line-clamp-1 capitalize">{generatedPdfData..filename}</p> */}
                                </div>
                                <div>
                                    <span className="hidden xl:inline ml-2 font-medium bg-blue-500 text-white px-2 py-1 rounded-md text-xs">
                                        {pdfType}
                                    </span>
                                    {pdfVersion && (
                                        <span className="hidden xl:inline ml-2 font-medium bg-green-500 text-white px-2 py-1 rounded-md text-xs">
                                            v{pdfVersion}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex space-x-3 mr-6">
                                {isEditMode ? (
                                    <>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleCancelEdit}
                                            disabled={updatePdfDataMutation.isPending}
                                            icon={<ApolloIcon name="cross" />}
                                        >
                                            <span className='hidden md:inline'> Cancel</span>
                                        </Button>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => {
                                                if (editedData) {
                                                    handleSaveEdit(editedData);
                                                }
                                            }}
                                            disabled={updatePdfDataMutation.isPending || !editedData}
                                            loading={updatePdfDataMutation.isPending}
                                            icon={<ApolloIcon name="check" />}
                                        >
                                            {updatePdfDataMutation.isPending ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleEdit}
                                            disabled={assignMutation.isPending || rejectMutation.isPending || isDownloadingPdf}
                                            icon={<ApolloIcon name="file-edit" />}
                                        >
                                            <span className='hidden md:inline'> Edit</span>
                                        </Button>
                                        {/* <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleDownload}
                                                disabled={isDownloadingPdf}
                                                loading={isDownloadingPdf}
                                                icon={<ApolloIcon name="download" className="h-4 w-4" />}
                                            >
                                                {isDownloadingPdf ? 'Downloading...' : 'Download'}
                                            </Button> */}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleReject}
                                            disabled={assignMutation.isPending || rejectMutation.isPending || isDownloadingPdf}
                                            loading={rejectMutation.isPending}
                                            icon={<ApolloIcon name="cross" />}
                                        >
                                            <span className='hidden md:inline'> {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}</span>
                                        </Button>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={handleAssign}
                                            disabled={assignMutation.isPending || rejectMutation.isPending || isDownloadingPdf}
                                            loading={assignMutation.isPending}
                                            icon={<ApolloIcon name="check" />}
                                        >
                                            <span className='hidden md:inline'> {assignMutation.isPending ? 'Assigning...' : 'Assign'}</span>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {downloadError && (
                        <div className=" py-2 bg-red-50 border-b border-red-200">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-red-600">{downloadError}</p>
                                <Button
                                    variant="plain"
                                    size="sm"
                                    onClick={() => pdfId && clearError(pdfId)}
                                    icon={<ApolloIcon name="cross" />}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="h-full flex-1 flex overflow-y-auto">
                        {/* Left side - FilePreview (always visible) */}
                        <div className={`h-full transition-all duration-300 ease-in-out ${isEditMode ? 'w-1/2 pr-3' : 'w-full'}`}>
                            <div className="h-full pb-4">
                                <FilePreview
                                    key={refreshKey} // Force re-render after updates
                                    documentId={pdfId || ''}
                                    filename={pdfName || ''}
                                    fileType="pdf"
                                    height="h-full"
                                    urlType="template"
                                />
                            </div>
                        </div>

                        {/* Right side - Edit Form (only visible in edit mode) */}
                        {isEditMode && (
                            <div className="w-1/2 pl-3 h-full">
                                <div
                                    className="h-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 ease-in-out"
                                    style={{
                                        transform: 'translateX(0)',
                                        animation: 'slide-in-right 0.3s ease-out forwards'
                                    }}
                                >
                                    {isLoadingEditData ? (
                                        <div className="flex items-center justify-center h-full">
                                            <LoadingSpinner size="lg" variant="truck" />
                                            <span className="ml-3 text-gray-600">Loading PDF data for editing...</span>
                                        </div>
                                    ) : pdfEditData?.data?.editableData ? (
                                        <PdfDataEditForm
                                            pdfData={pdfEditData.data}
                                            onDataChange={handleDataChange}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center">
                                                <ApolloIcon name="alert-circle" className="mx-auto mb-2 h-12 w-12 text-red-400" />
                                                <p className="text-gray-500">Failed to load PDF data for editing</p>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleCancelEdit}
                                                    className="mt-3"
                                                >
                                                    Back to Preview
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Dialog>
    );
};

export default GeneratedPdfPreviewModal;