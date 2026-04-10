'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Select from '@/components/ui/Select';
import { PdfTemplate, FieldOption } from '@/services/PdfTemplateService';
import { FontSelector } from '@/components/shared/FontManagement';
import {
  useTemplateFields,
  useFieldMappingOptions,
  useUpdateFieldMappings,
  useUpdateTemplateSettings,
  useActivateTemplate,
} from '@/services/hooks/usePdfTemplates';
import FilePreview from '@/components/ui/FilePreview';
import { truncateFileName } from '@/utils/utils';

interface PreviewMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: PdfTemplate | null;
}

const PreviewMappingDialog = ({ isOpen, onClose, template }: PreviewMappingDialogProps) => {
  const [mappings, setMappings] = useState<any[]>([]);
  const [templateDefaultFont, setTemplateDefaultFont] = useState<string | null>(null);
  const [templateDefaultFontSize, setTemplateDefaultFontSize] = useState<number>(12);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch template fields and mapping options
  const { data: fieldsData, isLoading: isFieldsLoading } = useTemplateFields(template?._id);
  const { data: mappingOptions } = useFieldMappingOptions();

  // Mutations
  const updateMappingsMutation = useUpdateFieldMappings();
  const updateTemplateSettingsMutation = useUpdateTemplateSettings();
  const activateTemplateMutation = useActivateTemplate();

  // Initialize mappings and template settings when data loads
  useEffect(() => {
    if (fieldsData?.data) {
      const existingMappings = fieldsData.data.fieldMappings || [];
      const extractedFields = fieldsData.data.extractedFields || [];

      // Initialize template default font from existing settings
      setTemplateDefaultFont(template?.settings?.default_font || null);
      setTemplateDefaultFontSize(template?.settings?.default_font_size || 12);

      // Create mappings for all fields
      const allMappings = extractedFields?.map((field) => {
        const existing = existingMappings?.find((m) => m?.pdf_field_name === field?.name);
        return (
          existing || {
            pdf_field_name: field?.name,
            pdf_field_type: field?.type,
            data_source: '',
            data_field: '',
            transform_rules: {
              format_pattern: '',
              prefix: '',
              suffix: '',
            },
            active: false,
          }
        );
      });

      // Ensure all mappings have proper transform_rules structure
      const normalizedMappings = allMappings?.map((mapping) => ({
        ...mapping,
        transform_rules: {
          format_pattern: '',
          prefix: '',
          suffix: '',
          ...mapping.transform_rules,
        },
      }));

      setMappings(normalizedMappings);
    }
  }, [fieldsData, template]);

  const handleMappingChange = (fieldName: string, updates: any) => {
    setMappings((prev) =>
      prev?.map((mapping) =>
        mapping?.pdf_field_name === fieldName ? { ...mapping, ...updates } : mapping
      )
    );
  };

  const handleSave = async () => {
    if (!template) return;

    const activeMappings = mappings?.filter((m) => m?.active && m?.data_source && m?.data_field);

    try {
      // Save field mappings
      await updateMappingsMutation.mutateAsync({
        templateId: template?._id,
        data: { mappings: activeMappings },
      });

      // Save template default font and size if they have changed
      const currentFont = template?.settings?.default_font || null;
      const currentFontSize = template?.settings?.default_font_size || 12;

      if (templateDefaultFont !== currentFont || templateDefaultFontSize !== currentFontSize) {
        await updateTemplateSettingsMutation.mutateAsync({
          templateId: template?._id,
          settings: {
            default_font: templateDefaultFont || undefined,
            default_font_size: templateDefaultFontSize,
          },
        });
      }
    } catch {
      // Error handled by hooks
    }
  };

  const handleActivate = async () => {
    if (!template) return;

    try {
      await activateTemplateMutation.mutateAsync(template?._id);
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  const getFieldOptions = (dataSource: string): FieldOption[] => {
    if (!mappingOptions?.data?.field_options) return [];
    return (
      mappingOptions?.data?.field_options[
        dataSource as keyof typeof mappingOptions.data.field_options
      ] || []
    );
  };

  const getDataSourceOptions = () => {
    if (!mappingOptions?.data?.data_sources) return [];

    return mappingOptions?.data?.data_sources?.map((source) => ({
      value: source,
      label: source?.charAt(0)?.toUpperCase() + source?.slice(1)?.replace('_', ' '),
    }));
  };

  const getTransformOptions = () => {
    if (!mappingOptions?.data?.transform_options) return [];

    const textTransforms = mappingOptions?.data?.transform_options?.text_transforms || [];
    const formatPatterns = mappingOptions?.data?.transform_options?.format_patterns || [];

    return [
      ...textTransforms?.map((t) => ({ value: t?.value, label: t?.label })),
      ...formatPatterns?.map((f) => ({ value: f?.value, label: f?.label })),
    ];
  };

  // Filter mappings based on search term
  const filteredMappings = searchTerm.trim()
    ? mappings?.filter((mapping) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          mapping?.pdf_field_name?.toLowerCase().includes(searchLower) ||
          mapping?.pdf_field_type?.toLowerCase().includes(searchLower) ||
          (mapping?.data_source && mapping?.data_source?.toLowerCase().includes(searchLower)) ||
          (mapping?.data_field && mapping?.data_field?.toLowerCase().includes(searchLower))
        );
      })
    : mappings;

  // Calculate completion for filtered mappings
  const filteredCompletion =
    filteredMappings?.length > 0
      ? Math.round(
          (filteredMappings?.filter((m) => m?.active && m?.data_source && m?.data_field)?.length /
            filteredMappings?.length) *
            100
        )
      : 0;

  if (!template) return null;
  const fontSizeOptions = [
    { value: 8, label: '8pt' },
    { value: 9, label: '9pt' },
    { value: 10, label: '10pt' },
    { value: 11, label: '11pt' },
    { value: 12, label: '12pt' },
    { value: 14, label: '14pt' },
    { value: 16, label: '16pt' },
    { value: 18, label: '18pt' },
    { value: 20, label: '20pt' },
    { value: 24, label: '24pt' },
    { value: 28, label: '28pt' },
    { value: 32, label: '32pt' },
  ];
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={1600}
      height={900}
      className="!h-[90vh] !max-w-none"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-2 text-xl font-bold">
            <div className="max-w-[20rem] truncate capitalize">
              {' '}
              {truncateFileName(template?.name) || 'Template Preview & Field Mapping'}
            </div>
            {template?.status === 'active' ? (
              <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Active
              </span>
            ) : (
              <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                Inactive
              </span>
            )}
            <div className="text-sm">
              <span className="font-medium">Progress:</span> {filteredCompletion}%{' '}
              <span className="hidden font-medium xl:inline">
                mapped(
                {filteredMappings?.filter((m) => m?.active)?.length} of {filteredMappings?.length}{' '}
                fields)
              </span>
            </div>
          </div>
        </div>

        {/* Content - Split View */}
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Left Side - PDF Preview */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-hidden rounded-lg border bg-gray-50">
              <FilePreview
                documentId={template?._id}
                filename={template?.name}
                fileType="pdf"
                height="h-full"
                showLoadingMessage={true}
                urlType="admin"
              />
            </div>
          </div>

          {/* Right Side - Field Mappings */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Template Default Font Section */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ApolloIcon name="globe" className="h-5 w-5 text-blue-600" />
                <h4 className="text-md font-semibold text-blue-900">Template Default Font</h4>
              </div>
              <p className="mb-3 text-sm text-blue-700">
                Set a default font and size for the entire template. This applies to all fields
                unless overridden individually.
              </p>
              <div className="mb-3 flex gap-3">
                <div className="flex-[0.8]">
                  <label className="mb-1 block text-xs font-medium text-blue-800">
                    Font Family
                  </label>
                  <FontSelector
                    value={templateDefaultFont}
                    onChange={setTemplateDefaultFont}
                    placeholder="Auto (PDF default font)"
                    showManagement={true}
                  />
                </div>
                <div className="min-w-[80px] flex-[0.2]">
                  <label className="mb-1 block text-xs font-medium text-blue-800">Size</label>
                  <Select
                    value={{
                      value: templateDefaultFontSize,
                      label: `${templateDefaultFontSize}pt`,
                    }}
                    onChange={(option) => setTemplateDefaultFontSize(option?.value || 12)}
                    options={fontSizeOptions}
                    getOptionValue={(option) => option?.value?.toString()}
                    getOptionLabel={(option) => option?.label}
                    isMulti={false}
                    isClearable={false}
                  />
                </div>
              </div>
              {(templateDefaultFont || templateDefaultFontSize !== 12) && (
                <div className="mt-3 rounded-md border border-blue-200 bg-white p-3">
                  <p className="mb-1 text-xs text-gray-600">Preview:</p>
                  <div
                    className="text-gray-800"
                    style={{
                      fontFamily: templateDefaultFont || 'inherit',
                      fontSize: `${templateDefaultFontSize}px`,
                    }}
                  >
                    Sample text with {templateDefaultFont || 'default'} font at{' '}
                    {templateDefaultFontSize}pt - The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Field Mappings</h3>
              <div className="flex items-center space-x-2">
                {/* Search Field */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-48 rounded-md border border-gray-300 px-3 py-1 pr-8 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute top-1/2 right-2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                    >
                      <ApolloIcon name="cross" className="h-3 w-3" />
                    </button>
                  )}
                  {!searchTerm && (
                    <ApolloIcon
                      name="search"
                      className="absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 transform text-gray-400"
                    />
                  )}
                </div>
                {template?.status !== 'active' && (
                  <Button
                    onClick={handleActivate}
                    disabled={activateTemplateMutation.isPending}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {activateTemplateMutation.isPending ? 'Activating...' : 'Activate Template'}
                  </Button>
                )}
                <Button
                  variant="default"
                  size="md"
                  onClick={handleSave}
                  disabled={updateMappingsMutation.isPending}
                >
                  {updateMappingsMutation.isPending ? 'Saving...' : 'Save Mappings'}
                </Button>
              </div>
            </div>
            {/* <ApiDebugger /> */}
            <div className="mt-2 flex-1 overflow-auto rounded-lg border bg-white p-4">
              {isFieldsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <ApolloIcon name="loading" className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading fields...</span>
                </div>
              ) : filteredMappings?.length === 0 && searchTerm?.trim() ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                  <ApolloIcon name="search" className="mb-4 h-12 w-12 text-gray-300" />
                  <p className="mb-2 text-gray-500">
                    No fields found matching &quot;{searchTerm}&quot;
                  </p>
                  <p className="text-sm text-gray-400">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMappings?.map((mapping) => {
                    const isMappingComplete =
                      mapping?.active && mapping?.data_source && mapping?.data_field;
                    const hasValidationError =
                      mapping?.active && (!mapping?.data_source || !mapping?.data_field);

                    return (
                      <div
                        key={mapping?.pdf_field_name}
                        className={`rounded-lg border p-4 transition-colors ${
                          hasValidationError
                            ? 'border-red-300 bg-red-50'
                            : isMappingComplete
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Field Header */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={mapping?.active}
                              onChange={(e) =>
                                handleMappingChange(mapping?.pdf_field_name, {
                                  active: e.target.checked,
                                })
                              }
                              className="rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{mapping?.pdf_field_name}</div>
                                {hasValidationError && (
                                  <span className="rounded bg-red-200 px-2 py-1 text-xs text-red-700">
                                    ⚠️ Incomplete
                                  </span>
                                )}
                                {isMappingComplete && (
                                  <span className="rounded bg-green-200 px-2 py-1 text-xs text-green-700">
                                    ✅ Ready
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                PDF Field Type: {mapping?.pdf_field_type}
                              </div>
                              {hasValidationError && (
                                <div className="mt-1 text-xs text-red-600">
                                  Please select both data source and data field to complete mapping
                                </div>
                              )}
                            </div>
                          </div>

                          {mapping?.active && (
                            <>
                              {/* Data Source Selection */}
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  Data Source
                                </label>
                                <Select
                                  value={
                                    mapping?.data_source
                                      ? {
                                          value: mapping?.data_source,
                                          label:
                                            mapping?.data_source?.charAt(0)?.toUpperCase() +
                                            mapping?.data_source?.slice(1)?.replace('_', ' '),
                                        }
                                      : null
                                  }
                                  onChange={(option: any) =>
                                    handleMappingChange(mapping?.pdf_field_name, {
                                      data_source: option?.value || '',
                                      data_field: '', // Reset field when source changes
                                    })
                                  }
                                  options={getDataSourceOptions()}
                                  placeholder="Select data source..."
                                  isClearable
                                  className="text-sm"
                                />
                              </div>

                              {/* Data Field Selection */}
                              {mapping.data_source && (
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    {mapping?.data_source === 'static'
                                      ? 'Static Value'
                                      : 'Data Field'}
                                  </label>
                                  {mapping?.data_source === 'static' ? (
                                    <input
                                      type="text"
                                      value={mapping?.data_field}
                                      onChange={(e) =>
                                        handleMappingChange(mapping?.pdf_field_name, {
                                          data_field: e.target.value,
                                        })
                                      }
                                      placeholder="Enter static value..."
                                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                    />
                                  ) : (
                                    <Select
                                      value={
                                        mapping?.data_field
                                          ? {
                                              value: mapping?.data_field,
                                              label:
                                                getFieldOptions(mapping?.data_source)?.find(
                                                  (f) => f?.field === mapping?.data_field
                                                )?.label || mapping?.data_field,
                                            }
                                          : null
                                      }
                                      onChange={(option: any) =>
                                        handleMappingChange(mapping?.pdf_field_name, {
                                          data_field: option?.value || '',
                                        })
                                      }
                                      options={getFieldOptions(mapping?.data_source)?.map(
                                        (option) => ({
                                          value: option?.field,
                                          label: `${option?.label} (${option?.type})`,
                                        })
                                      )}
                                      placeholder="Select field..."
                                      isClearable
                                      className="text-sm"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Font Override Options */}
                              {mapping?.active && (
                                <div className="col-span-full mt-4 rounded-lg bg-gray-50 p-3">
                                  <h4 className="mb-3 text-sm font-medium text-gray-700">
                                    🎨 Font Override (Optional)
                                  </h4>
                                  <div className="flex flex-wrap items-center space-x-2">
                                    <div className="flex-1 shrink-0">
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Font Family
                                      </label>
                                      <FontSelector
                                        value={mapping?.transform_rules?.font_family || null}
                                        onChange={(fontFamily) =>
                                          handleMappingChange(mapping?.pdf_field_name, {
                                            transform_rules: {
                                              ...mapping?.transform_rules,
                                              font_family: fontFamily,
                                            },
                                          })
                                        }
                                        placeholder="Use template default"
                                        showManagement={true}
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        Font Size
                                      </label>
                                      <Select
                                        value={
                                          mapping?.transform_rules?.font_size
                                            ? {
                                                value: mapping?.transform_rules?.font_size,
                                                label: `${mapping?.transform_rules?.font_size}pt`,
                                              }
                                            : { value: null, label: 'Auto Size' }
                                        }
                                        onChange={(option: any) =>
                                          handleMappingChange(mapping?.pdf_field_name, {
                                            transform_rules: {
                                              ...mapping?.transform_rules,
                                              font_size: option?.value || null,
                                            },
                                          })
                                        }
                                        options={[
                                          { value: null, label: 'Auto Size' },
                                          { value: 8, label: '8pt (Small)' },
                                          { value: 9, label: '9pt' },
                                          { value: 10, label: '10pt' },
                                          { value: 11, label: '11pt' },
                                          { value: 12, label: '12pt (Default)' },
                                          { value: 14, label: '14pt (Large)' },
                                          { value: 16, label: '16pt' },
                                          { value: 18, label: '18pt' },
                                        ]}
                                        isClearable
                                        className="inline-block text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Transform Options */}
                              {mapping?.data_field && (
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    Transform Options
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <Select
                                      value={
                                        mapping?.transform_rules?.format_pattern
                                          ? {
                                              value: mapping?.transform_rules?.format_pattern,
                                              label: mapping?.transform_rules?.format_pattern,
                                            }
                                          : null
                                      }
                                      onChange={(option: any) =>
                                        handleMappingChange(mapping?.pdf_field_name, {
                                          transform_rules: {
                                            ...mapping?.transform_rules,
                                            format_pattern: option?.value || '',
                                          },
                                        })
                                      }
                                      options={getTransformOptions()}
                                      placeholder="Format..."
                                      isClearable
                                      className="text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={mapping.transform_rules?.prefix || ''}
                                      onChange={(e) =>
                                        handleMappingChange(mapping?.pdf_field_name, {
                                          transform_rules: {
                                            ...mapping?.transform_rules,
                                            prefix: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Prefix..."
                                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={mapping.transform_rules?.suffix || ''}
                                      onChange={(e) =>
                                        handleMappingChange(mapping?.pdf_field_name, {
                                          transform_rules: {
                                            ...mapping?.transform_rules,
                                            suffix: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Suffix..."
                                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default PreviewMappingDialog;
