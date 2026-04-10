import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useGenerateOfferPdfPost, usePdfTemplates } from '@/services/hooks/usePdfTemplates';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface PdfEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData?: any;
  onPdfGenerated?: (data: any) => void;
  onSuccess?: () => void;
}

const PdfEmailModal: React.FC<PdfEmailModalProps> = ({
  isOpen,
  onClose,
  rowData,
  onPdfGenerated,
  onSuccess,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Only fetch templates when modal is open
  const { data: emailTemplates, isLoading: templatesLoading } = usePdfTemplates({}, isOpen);
  const { mutate: generateOfferPdf, isLoading: isGenerating } = useGenerateOfferPdfPost();

  const handleGeneratePdf = async () => {
    if (!selectedTemplateId || !rowData) return;

    generateOfferPdf(
      {
        templateId: selectedTemplateId,
        offerId: rowData?._id,
      },
      {
        onSuccess: (data) => {
          toast.push(
            <Notification title="PDF generated successfully" type="success">
              PDF generated successfully
            </Notification>
          );
          onPdfGenerated?.(data?.data);
          onSuccess?.();
          // Don't call onClose() here - it's handled in handlePdfGenerated
        },
        onError: (error) => {
          console.log(error);
        },
      }
    );
  };

  const handleClose = () => {
    if (isGenerating) return;
    setSelectedTemplateId(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-lg">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center space-x-3 px-4 pt-2">
            <div className="rounded-lg bg-green-50 p-2">
              <ApolloIcon name="file" className="text-evergreen" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              Select template and generate offer PDF
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-4 py-2">
          {/* Offer Details */}
          {rowData && (
            <div className="rounded-xl border border-green-100 bg-gradient-to-r from-green-50 to-indigo-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Lead:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {rowData?.leadName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Agent:</span>
                  <span className="ml-2 font-medium text-gray-900">{rowData?.agent || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Bank:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {rowData?.bankName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Offer Type:</span>
                  <span className="bg-evergreen ml-2 rounded-md px-2 py-1 font-medium text-white">
                    {rowData.offerType || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Template Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email Template</label>

            <Select
              className="w-full"
              placeholder="Choose template..."
              isLoading={templatesLoading}
              value={
                selectedTemplateId
                  ? {
                      value: selectedTemplateId,
                      label:
                        emailTemplates?.data?.templates?.find(
                          (t: any) => t?._id === selectedTemplateId
                        )?.name || '',
                    }
                  : null
              }
              onChange={(option: any) => setSelectedTemplateId(option?.value || null)}
              options={
                emailTemplates?.data?.templates
                  ?.filter((template) => template.status === 'active')
                  ?.map((template) => ({
                    value: template?._id,
                    label: template?.name,
                  })) || []
              }
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="plain"
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleGeneratePdf}
              disabled={!selectedTemplateId || isGenerating}
              loading={isGenerating}
              icon={<ApolloIcon name="file" />}
            >
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default PdfEmailModal;
