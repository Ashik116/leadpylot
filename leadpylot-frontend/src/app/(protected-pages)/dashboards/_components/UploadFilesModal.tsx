import Dialog from '@/components/ui/Dialog';
import { useState, useMemo } from 'react';
import Upload from '@/components/ui/Upload/Upload';
import ApolloIcon from '@/components/ui/ApolloIcon';
import FilesControllerSection from './FilesControllerSection';
import FileUploadTypeModal from './FileUploadTypeModal';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useDocumentTypeOptions } from '@/components/shared/DocumentTypeOptions';

type UploadFilesModalProps = {
  selectedOfferForDocs: any;
  isDocsModalOpen: boolean;
  setIsDocsModalOpen: (isOpen: boolean) => void;
  setSelectedOfferForDocs: (offer: any) => void;
  apiData?: any;
  handleDocumentAction?: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleFileUpload?: (
    id: string,
    files: File[] | null,
    table?: string,
    fileType?: string
  ) => Promise<void>;
  onDataRefresh?: () => void;
  uploadPermission?: boolean;
};

const UploadFilesModal = ({
  selectedOfferForDocs,
  isDocsModalOpen,
  setIsDocsModalOpen,
  setSelectedOfferForDocs,
  apiData = [],
  handleDocumentAction = () => {},
  handleFileUpload = async () => {},
  onDataRefresh,
  uploadPermission = true,
}: UploadFilesModalProps) => {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const { data: session } = useSession();

  const getData =
    apiData?.data?.length > 0
      ? apiData?.data?.find((item: any) => item?._id === selectedOfferForDocs?._id)
      : selectedOfferForDocs; // Fallback to selectedOfferForDocs if not found in apiData

  const getTitle = () => {
    const leadName = selectedOfferForDocs?.leadName || 'Document Management';
    const partnerId = selectedOfferForDocs?.partnerId || '';

    if (!partnerId) {
      return leadName;
    }

    return (
      <div className="flex items-center gap-2">
        <span>{leadName}</span>
        <span className="text-ocean-2 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium">
          {partnerId}
        </span>
      </div>
    );
  };

  // Use shared document type options
  const filteredDocumentTypeOptions = useDocumentTypeOptions({
    hasOpening: getData?.has_opening,
    hasConfirmation: getData?.has_confirmation,
    hasPaymentVoucher: getData?.has_payment_voucher,
  });

  // Memoized sections calculation
  const sections = useMemo(() => {
    const activeSections = [
      {
        key: 'offers',
        title: 'Offers',
      },
      // {
      //   key: 'openings',
      //   title: 'Openings',
      // },
      // {
      //   key: 'confirmations',
      //   title: 'Confirmations',
      // },
      // {
      //   key: 'paymentVouchers',
      //   title: 'Payment Vouchers',
      // },
    ];

    // Always show offers section
    activeSections.push({
      key: 'openings',
      title: 'Openings',
    });
    activeSections.push({
      key: 'confirmations',
      title: 'Confirmations',
    });

    activeSections.push({
      key: 'paymentVouchers',
      title: 'Payment Vouchers',
    });
    // // Show openings section if has_opening is true
    // if (getData?.has_opening) {
    //   activeSections.push({
    //     key: 'openings',
    //     title: 'Openings',
    //   });

    // }

    // // // Show confirmations section if has_confirmation is true
    // if (getData?.has_confirmation) {
    //   activeSections.push({
    //     key: 'confirmations',
    //     title: 'Confirmations',
    //   });
    // }

    // // // Show payment vouchers section if has_payment_voucher is true
    // if (getData?.has_payment_voucher) {
    //   activeSections.push({
    //     key: 'paymentVouchers',
    //     title: 'Payment Vouchers',
    //   });
    // }

    return activeSections;
  }, [getData]);

  // Handle file upload from master upload component
  const handleFileChange = (files: File[]) => {
    if (session?.user?.role === Role?.AGENT) {
      return toast.push(
        <Notification key="files-uploaded" title="Files uploaded" type="danger">
          You are not authorized to upload files to this section
        </Notification>
      );
    }

    if (files?.length > 0) {
      setPendingFiles(files);
      setShowTypeSelector(true);
    }
  };

  // Handle document type selection
  const handleTypeSelection = async () => {
    if (selectedType && pendingFiles?.length > 0) {
      try {
        setIsUploading(true);
        // Upload files to backend
        await handleFileUpload(
          selectedOfferForDocs?._id,
          pendingFiles,
          'documents', // Use a generic table name
          selectedType
        );

        // Refresh data to show newly uploaded files
        if (onDataRefresh) {
          onDataRefresh();
        }

        // Reset state and force Upload component to reset
        setPendingFiles([]);
        setSelectedType('');
        setShowTypeSelector(false);
        setUploadKey((prev) => prev + 1);
      } catch (error) {
        console.error('Error uploading files:', error);
        // Keep the modal open if there's an error
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleClose = () => {
    setIsDocsModalOpen(false);
    setSelectedOfferForDocs(null);
    setShowTypeSelector(false);
    setPendingFiles([]);
    setSelectedType('');
    setUploadKey((prev) => prev + 1); // Force Upload component to reset
  };

  const handleCancelTypeSelection = () => {
    setShowTypeSelector(false);
    setPendingFiles([]);
    setSelectedType('');
  };

  return (
    <>
      <Dialog
        isOpen={isDocsModalOpen}
        onClose={handleClose}
        width={sections?.length >= 3 ? 900 : sections?.length === 2 ? 900 : 600}
        height={sections?.length >= 3 ? 1000 : 650}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h4 className="text-lg font-semibold">{getTitle()}</h4>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {sections?.length} section{sections?.length !== 1 ? 's' : ''} active
              </div>
              <div className="flex items-center gap-2 text-xs">
                {getData?.has_opening && (
                  <span className="rounded bg-green-100 px-2 py-1 text-green-800">Opening</span>
                )}
                {getData?.has_confirmation && (
                  <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">Confirmation</span>
                )}
                {getData?.has_payment_voucher && (
                  <span className="rounded bg-purple-100 px-2 py-1 text-purple-800">Payment</span>
                )}
              </div>
            </div>
          </div>

          {/* Master Upload Component */}
          {uploadPermission && (
            <div className="border-b border-gray-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h5 className="font-semibold text-gray-800">Upload Documents</h5>
              </div>
              <div className="flex w-full items-center justify-center">
                <Upload
                  key={`master - upload - ${uploadKey} `}
                  draggable={true}
                  onChange={handleFileChange}
                  showList={false}
                  className="flex h-24 w-full max-w-md flex-col items-center justify-center"
                  disabled={isUploading}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ApolloIcon name="upload" className="text-3xl text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Drag and drop files here or click to browse
                    </p>
                  </div>
                </Upload>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedOfferForDocs ? (
              <div
                className={`grid gap-4 ${
                  sections?.length === 1
                    ? 'grid-cols-1'
                    : sections?.length === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : sections?.length === 3
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
                } `}
              >
                {sections?.length > 0 ? (
                  sections?.map((section) => (
                    <div
                      key={section?.key}
                      className="flex flex-col rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h5 className="text-lg font-semibold text-gray-800">{section?.title}</h5>
                      </div>

                      {/* Files Controller Section */}
                      <div className="flex-1 overflow-hidden">
                        <FilesControllerSection
                          sectionGroup={section}
                          files={getData?.files || []}
                          handleDocumentAction={handleDocumentAction}
                          handleFileUpload={handleFileUpload}
                          apiData={apiData}
                          selectedOfferForDocs={selectedOfferForDocs}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <p className="mb-2 text-gray-500">No document sections available</p>
                      <p className="text-sm text-gray-400">
                        This offer doesn&apos;t have any openings, confirmations, or payment
                        vouchers yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No item selected</p>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Document Type Selection Modal */}
      <FileUploadTypeModal
        showTypeSelector={showTypeSelector}
        pendingFiles={pendingFiles}
        options={filteredDocumentTypeOptions}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        handleCancelTypeSelection={handleCancelTypeSelection}
        handleTypeSelection={handleTypeSelection}
        isUploading={isUploading}
      />
    </>
  );
};

export default UploadFilesModal;

// // Add opening options if has_opening is true
// if (getData?.has_opening) {
//   options.push(
//     { value: 'opening-contract', label: 'Opening Contract' },
//     { value: 'opening-id', label: 'Opening ID' },
//     { value: 'opening-extra', label: 'Opening Extra' }
//   );
// }

// // // Add confirmation options if has_confirmation is true
// if (getData?.has_confirmation) {
//   options.push(
//     { value: 'confirmation-contract', label: 'Confirmation Contract' },
//     { value: 'confirmation-extra', label: 'Confirmation Extra' }
//   );
// }

// // // Add payment options if has_payment_voucher is true
// if (getData?.has_payment_voucher) {
//   options.push(
//     { value: 'payment-contract', label: 'Payment Contract' },
//     { value: 'payment-extra', label: 'Payment Extra' }
//   );
// }
