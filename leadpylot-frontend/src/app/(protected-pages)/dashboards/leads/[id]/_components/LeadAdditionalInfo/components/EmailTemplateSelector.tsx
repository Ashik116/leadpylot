import React, { useMemo } from 'react';
import Select from '@/components/ui/Select';

type SelectOption = {
  value: string;
  label: string;
};

interface EmailTemplateSelectorProps {
  selectedTemplateId: string;
  onTemplateChange: (templateId: string | null) => void;
  templatesLoading: boolean;
  emailTemplates: any;
}

export const EmailTemplateSelector: React.FC<EmailTemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateChange,
  templatesLoading,
  emailTemplates,
}) => {
  const templateOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'No template' },
      ...(emailTemplates?.data || []).map((template: any) => ({
        value: template._id,
        label: template.name,
      })),
    ],
    [emailTemplates]
  );

  const selectedTemplateOption = useMemo(
    () => templateOptions.find((option) => option.value === selectedTemplateId) || null,
    [templateOptions, selectedTemplateId]
  );

  return (
    <div className="w-full min-w-0 [&_.select-control]:rounded-lg">
      <label className="mb-0.5 block text-xs font-medium tracking-wide  capitalize">
        Email Template <span className="text-red-500">*</span>
      </label>
      <Select
        placeholder="Select a template (required)"
        isLoading={templatesLoading}
        value={selectedTemplateOption}
        onChange={(option) => onTemplateChange(option?.value ?? '')}
        options={templateOptions}
      />
    </div>
  );
};
