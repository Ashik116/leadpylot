'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { PdfTemplate } from '@/services/PdfTemplateService';
import {
  useTemplateFields,
  useFieldMappingOptions,
  useUpdateFieldMappings,
  useActivateTemplate,
} from '@/services/hooks/usePdfTemplates';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface FieldMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: PdfTemplate | null;
}

const FieldMappingDialog = ({ isOpen, onClose, template }: FieldMappingDialogProps) => {
  const [mappings, setMappings] = useState<any[]>([]);
  // Fetch template fields
  const { data: fieldsData, isLoading: isFieldsLoading } = useTemplateFields(template?._id);
  const { data: mappingOptions } = useFieldMappingOptions();

  // Mutations
  const updateMappingsMutation = useUpdateFieldMappings();
  const activateTemplateMutation = useActivateTemplate();

  // Initialize mappings when data loads
  useEffect(() => {
    if (fieldsData?.data) {
      const existingMappings = fieldsData?.data?.fieldMappings || [];
      const extractedFields = fieldsData?.data?.extractedFields || [];

      // Create mappings for all fields
      const allMappings = extractedFields?.map((field) => {
        const existing = existingMappings?.find((m) => m?.pdf_field_name === field?.name);
        return (
          existing || {
            pdf_field_name: field?.name,
            pdf_field_type: field?.type,
            data_source: '',
            data_field: '',
            active: false,
            transform_rules: {
              suffix: '',
            },
          }
        );
      });

      // Ensure all mappings have transform_rules
      const normalizedMappings = allMappings?.map((mapping) => ({
        ...mapping,
        transform_rules: {
          suffix: '',
          ...mapping.transform_rules,
        },
      }));

      setMappings(normalizedMappings);
    }
  }, [fieldsData]);

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
      await updateMappingsMutation.mutateAsync({
        templateId: template?._id,
        data: { mappings: activeMappings },
      });
      onClose();
    } catch {
      // Error handled by hook
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

  const getFieldOptions = (dataSource: string) => {
    if (!mappingOptions?.data?.field_options) return [];
    const options =
      mappingOptions?.data?.field_options[
        dataSource as keyof typeof mappingOptions.data.field_options
      ] || [];

    // Transform field options to Select format
    return options?.map((option: any) => ({
      value: option?.field || option?.value,
      label: option?.label || option?.field || option?.value,
    }));
  };

  const mappingCompletion =
    mappings?.length > 0
      ? Math.round(
          (mappings?.filter((m) => m?.active && m?.data_source && m?.data_field)?.length /
            mappings?.length) *
            100
        )
      : 0;

  if (!template) return null;
  const dataSourcesOptions = [
    { value: 'lead', label: 'Lead Data' },
    { value: 'offer', label: 'Offer Data' },
    { value: 'bank', label: 'Bank Data' },
    { value: 'agent', label: 'Agent Data' },
    { value: 'computed', label: 'Computed' },
    { value: 'static', label: 'Static Value' },
  ];
  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={700}>
      <div className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="mb-4 border-b pb-4">
          <h2 className="text-xl font-bold">Field Mapping - {template?.name}</h2>
          <p className="text-gray-600">Map PDF form fields to data sources</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">Progress:</span> {mappingCompletion}% mapped (
              {mappings?.filter((m) => m?.active)?.length} of {mappings?.length} fields)
            </div>
            {template?.status === 'active' && (
              <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                Active Template
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isFieldsLoading ? (
            <div className="flex items-center justify-center py-8">
              <ApolloIcon name="loading" className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading fields...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Row */}
              <div className="rounded-lg border bg-gray-50 p-3">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-1 text-xs font-medium text-gray-600">Active</div>
                  <div className="col-span-3 text-xs font-medium text-gray-600">PDF Field</div>
                  <div className="col-span-3 text-xs font-medium text-gray-600">Data Source</div>
                  <div className="col-span-3 text-xs font-medium text-gray-600">Data Field</div>
                  <div className="col-span-2 text-xs font-medium text-gray-600">Suffix</div>
                </div>
              </div>

              {mappings?.length > 0 &&
                mappings?.map((mapping) => (
                  <div key={mapping?.pdf_field_name} className="rounded-lg border p-4">
                    <div className="grid grid-cols-12 items-center gap-4">
                      {/* Active Toggle */}
                      <div className="col-span-1">
                        <Checkbox
                          checked={mapping?.active}
                          onChange={(checked) =>
                            handleMappingChange(mapping?.pdf_field_name, { active: checked })
                          }
                          className="rounded"
                        />
                      </div>

                      {/* PDF Field Info */}
                      <div className="col-span-3">
                        <div className="text-sm font-medium">{mapping?.pdf_field_name}</div>
                        <div className="text-xs text-gray-500">{mapping?.pdf_field_type}</div>
                      </div>

                      {/* Data Source */}
                      <div className="col-span-3">
                        <Select
                          value={{ value: mapping?.data_source, label: mapping?.data_source }}
                          options={dataSourcesOptions}
                          onChange={(option) =>
                            handleMappingChange(mapping?.pdf_field_name, {
                              data_source: option?.value,
                              data_field: '', // Reset field when source changes
                            })
                          }
                          isDisabled={!mapping?.active}
                        ></Select>
                      </div>

                      {/* Data Field */}
                      <div className="col-span-3">
                        {mapping?.data_source === 'static' ? (
                          <Input
                            type="text"
                            value={mapping?.data_field}
                            onChange={(e) =>
                              handleMappingChange(mapping?.pdf_field_name, {
                                data_field: e.target.value,
                              })
                            }
                            placeholder="Enter static value..."
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            disabled={!mapping?.active}
                          />
                        ) : (
                          <Select
                            value={{ value: mapping?.data_field, label: mapping?.data_field }}
                            onChange={(option) =>
                              handleMappingChange(mapping?.pdf_field_name, {
                                data_field: option?.value,
                              })
                            }
                            isDisabled={!mapping?.active || !mapping?.data_source}
                            options={getFieldOptions(mapping?.data_source)}
                          ></Select>
                        )}
                      </div>

                      {/* Suffix Field */}
                      <div className="col-span-2">
                        <Input
                          type="text"
                          value={mapping?.transform_rules?.suffix || ''}
                          onChange={(e) =>
                            handleMappingChange(mapping?.pdf_field_name, {
                              transform_rules: {
                                ...mapping?.transform_rules,
                                suffix: e.target.value,
                              },
                            })
                          }
                          placeholder="Suffix..."
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          disabled={!mapping?.active}
                          title="Text to append after the field value"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            {mappingCompletion >= 50 && template?.status !== 'active' && (
              <span className="text-green-600">✓ Ready to activate template</span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={updateMappingsMutation.isPending}
            >
              Cancel
            </Button>

            <Button onClick={handleSave} disabled={updateMappingsMutation.isPending}>
              {updateMappingsMutation.isPending ? 'Saving...' : 'Save Mappings'}
            </Button>

            {template?.status !== 'active' && mappingCompletion >= 50 && (
              <Button
                onClick={handleActivate}
                disabled={activateTemplateMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {activateTemplateMutation.isPending ? 'Activating...' : 'Activate Template'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default FieldMappingDialog;
