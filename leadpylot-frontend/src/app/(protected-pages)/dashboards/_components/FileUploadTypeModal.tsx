import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';

type IFileUploadTypeModal = {
  showTypeSelector: boolean;
  pendingFiles: any[];
  options: any[];
  selectedType: string;
  setSelectedType: (type: string) => void;
  handleCancelTypeSelection: () => void;
  handleTypeSelection: () => void;
  isUploading: boolean;
};

const FileUploadTypeModal = ({
  showTypeSelector,
  handleCancelTypeSelection,
  pendingFiles,
  options,
  selectedType,
  setSelectedType,
  handleTypeSelection,
  isUploading,
}: IFileUploadTypeModal) => {
  return (
    <Dialog isOpen={showTypeSelector} onClose={handleCancelTypeSelection} width={400}>
      <div className="p-6">
        <h5 className="mb-4 text-lg font-semibold">Select Document Type</h5>
        <p className="mb-4 text-sm text-gray-600">
          Choose the document type for {pendingFiles?.length} file
          {pendingFiles?.length > 1 ? 's' : ''}:
        </p>

        <div className="mb-4 space-y-2">
          {pendingFiles?.length > 0 &&
            pendingFiles?.map((file, index) => (
              <div
                key={index}
                className="line-clamp-1 truncate rounded bg-gray-50 p-2 text-sm text-gray-700"
              >
                {file?.name}
              </div>
            ))}
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Document Type</label>
          <Select
            placeholder="Select document type"
            options={options}
            value={
              selectedType
                ? {
                    value: selectedType,
                    label: options?.find((opt) => opt?.value === selectedType)?.label,
                  }
                : null
            }
            onChange={(option: any) => setSelectedType(option?.value || '')}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="default" onClick={handleCancelTypeSelection}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleTypeSelection}
            disabled={!selectedType || isUploading}
            loading={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
export default FileUploadTypeModal;
