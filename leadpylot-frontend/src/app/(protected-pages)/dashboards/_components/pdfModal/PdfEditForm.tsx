import ApolloIcon from '@/components/ui/ApolloIcon';
import { useState } from 'react';

// Edit form component for PDF data
const PdfDataEditForm: React.FC<{
  pdfData: {
    generatedPdf: any;
    editableData: any;
    fieldMappings: Array<{
      pdf_field_name: string;
      data_source: string;
      data_field: string;
      transform_rules: any;
      current_value: any;
    }>;
  };
  onDataChange: (data: any) => void;
}> = ({ pdfData, onDataChange }) => {
  const [editedData, setEditedData] = useState({
    lead_data: { ...pdfData?.editableData?.lead_data },
    offer_data: { ...pdfData?.editableData?.offer_data },
    bank_data: { ...pdfData?.editableData?.bank_data },
    agent_data: { ...pdfData?.editableData?.agent_data },
    computed_data: { ...pdfData?.editableData?.computed_data },
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleFieldChange = (section: string, field: string, value: any) => {
    const newData = {
      ...editedData,
      [section]: {
        ...editedData[section as keyof typeof editedData],
        [field]: value,
      },
    };
    setEditedData(newData);
    onDataChange(newData);
  };

  // Get field mappings for a specific data source with search filtering
  const getFieldMappingsForSource = (dataSource: string) => {
    const mappings =
      pdfData?.fieldMappings?.filter((mapping: any) => mapping?.data_source === dataSource) || [];

    // Filter by search term if provided
    if (searchTerm?.trim()) {
      return mappings?.filter((mapping: any) => {
        const searchLower = searchTerm?.toLowerCase();
        return (
          mapping?.pdf_field_name?.toLowerCase().includes(searchLower) ||
          mapping?.data_field?.toLowerCase().includes(searchLower)
        );
      });
    }

    return mappings;
  };

  const renderMappedFields = (dataSource: string, title: string) => {
    const mappings = getFieldMappingsForSource(dataSource);

    if (mappings?.length === 0) return null;
    return (
      <div key={dataSource} className="rounded-lg border p-4">
        <h4 className="mb-3 font-semibold text-gray-700">{title}</h4>
        <div className="space-y-3">
          {mappings?.map((mapping: any, i: number) => {
            const { data_field, pdf_field_name, transform_rules, current_value } = mapping;
            const dataSourceKey = `${dataSource}_data` as keyof typeof editedData;
            const fieldValue = editedData[dataSourceKey]?.[data_field] || current_value || '';
            return (
              <div key={`${i}-${data_field}`} className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-gray-600">
                  <span className="font-semibold">{pdf_field_name}</span>
                  <span className="ml-2 text-xs text-gray-400">({data_field})</span>
                  {transform_rules?.suffix && (
                    <span className="ml-1 text-xs text-blue-600">
                      + &quot;{transform_rules.suffix}&quot;
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={String(fieldValue || '')}
                  onChange={(e) => handleFieldChange(dataSourceKey, data_field, e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder={`Enter ${pdf_field_name.toLowerCase()}`}
                />
                {transform_rules?.format_pattern && (
                  <p className="mt-1 text-xs text-gray-500">
                    Format: {transform_rules.format_pattern}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Check if any sections have visible fields
  const hasVisibleFields = () => {
    const sections = ['lead', 'offer', 'bank', 'agent'];
    return sections?.some((section) => getFieldMappingsForSource(section)?.length > 0);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Form Header */}
      <div className="flex items-center justify-between border-b bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900 select-none md:text-base xl:text-lg">
          Edit PDF Data
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-48 rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {searchTerm?.trim() && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
            >
              <ApolloIcon name="cross" />
            </button>
          )}
          {!searchTerm?.trim() && (
            <ApolloIcon
              name="search"
              className="absolute top-1/2 right-2 -translate-y-1/2 transform text-gray-400"
            />
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasVisibleFields() && searchTerm?.trim() ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ApolloIcon name="search" className="mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-2 text-gray-500">
              No fields found matching &quot;{searchTerm?.trim()}&quot;
            </p>
            <p className="text-sm text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Data Sections - Only showing mapped fields */}
            {renderMappedFields('lead', 'Lead Information')}
            {renderMappedFields('offer', 'Offer Details')}
            {renderMappedFields('bank', 'Bank Information')}
            {renderMappedFields('agent', 'Agent Details')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfDataEditForm;
