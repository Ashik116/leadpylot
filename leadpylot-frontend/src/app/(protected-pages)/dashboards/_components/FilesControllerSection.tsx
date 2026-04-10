import { FileHandler, getFileTypesByTable } from '../accepted-offers/_components/FileHandler';

type TFilesControllerSectionProps = {
  sectionGroup: any;
  files: any[];
  handleDocumentAction: (
    item: any,
    documentType: string,
    action: 'preview' | 'download' | 'delete'
  ) => void;
  handleFileUpload: (
    id: string,
    files: File[] | null,
    table?: string,
    fileType?: string,
    fullItem?: any
  ) => void;
  apiData: any;
  selectedOfferForDocs: any;
};

const FilesControllerSection = ({
  sectionGroup,
  files = [],
  handleDocumentAction,
  handleFileUpload,
  selectedOfferForDocs,
}: TFilesControllerSectionProps) => {
  // Get all possible document types for this section group
  const availableDocumentTypes = getFileTypesByTable(sectionGroup.key);

  // Filter files by document type that matches this section group
  const filteredFiles = files?.filter((file: any) => {
    const fileDocumentType = file?.type;

    // Check if the file's document type is in the available types for this section
    return availableDocumentTypes?.includes(fileDocumentType);
  });
  // console.log(files);

  return (
    <div className="space-y-3">
      {/* Fixed Sections - Show files that match this section's document type */}
      <div className="max-h-52 overflow-y-auto">
        {filteredFiles?.length > 0 ? (
          filteredFiles?.map((section: any, key: any) => (
            <div
              key={key}
              className="mb-2 flex items-center justify-between space-x-4 rounded-lg border border-gray-200 p-3"
            >
              <div className="flex-1">
                <h6 className="mb-1 line-clamp-1 max-w-60 truncate text-sm font-medium text-gray-700">
                  {section?.filename}
                </h6>
                <span className="text-xs text-gray-500">Type: {section?.type}</span>
              </div>
              <FileHandler
                section={section}
                offerId={selectedOfferForDocs?._id}
                type={section?.type}
                table={sectionGroup?.key}
                handleDocumentAction={handleDocumentAction}
                handleFileUpload={(id, files, table, documentType) =>
                  handleFileUpload(id, files, table, documentType, selectedOfferForDocs)
                }
              />
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">
            No {sectionGroup?.title?.toLowerCase()} files found
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesControllerSection;
