import React from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface EmailCompositionFormProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  content: string;
  onContentChange: (html: string) => void;
  selectedTemplateId: string;
  showPreview: boolean;
  onPreviewToggle: () => void;
}

export const EmailCompositionForm: React.FC<EmailCompositionFormProps> = ({
  subject,
  onSubjectChange,
  selectedTemplateId,
  showPreview,
  onPreviewToggle,
}) => {
  const subjectPlaceholder = selectedTemplateId
    ? 'Subject automatically uses template name'
    : 'Add a subject';

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-2">
        <p className="font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap">
          Subject <span className="text-red-500">*</span>
        </p>
        <Button
          variant="secondary"
          size="xs"
          onClick={onPreviewToggle}
          icon={
            showPreview ? (
              <ApolloIcon name="eye-filled" className="h-3.5 w-3.5" />
            ) : (
              <ApolloIcon name="eye-slash" className="h-3.5 w-3.5" />
            )
          }
          className="shrink-0 hidden"
        >
          <span className="hidden sm:inline">{showPreview ? 'Hide Preview' : 'Preview Email'}</span>
          <span className="inline sm:hidden">{showPreview ? 'Hide' : 'Preview'}</span>
        </Button>
      </div>
      <Input
        size="md"
        className="text-slate-700 text-xs rounded-sm"
        placeholder={subjectPlaceholder}
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
      />
    </div>
  );
};
