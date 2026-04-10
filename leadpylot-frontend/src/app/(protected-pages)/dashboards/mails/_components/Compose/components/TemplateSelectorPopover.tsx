'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { EmailTemplateSelector } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/EmailTemplateSelector';

interface TemplateSelectorPopoverProps {
  isOpen: boolean;
  selectedTemplateId: string | null;
  onTemplateChange: (templateId: string | null) => void;
  onClose: () => void;
  onClear: () => void;
  templatesLoading: boolean;
  emailTemplates: any;
  position?: 'above' | 'overlay';
}

export function TemplateSelectorPopover({
  isOpen,
  selectedTemplateId,
  onTemplateChange,
  onClose,
  onClear,
  templatesLoading,
  emailTemplates,
  position = 'above',
}: TemplateSelectorPopoverProps) {
  if (!isOpen) return null;

  const positionClasses = position === 'overlay'
    ? 'absolute top-0 left-0 z-50 w-[360px] max-w-[85vw] animate-in fade-in slide-in-from-top-2'
    : 'absolute bottom-full left-0 z-50 mb-2 w-[360px] max-w-[85vw] animate-in fade-in slide-in-from-bottom-2';

  return (
    <div
      className={`${positionClasses} rounded-lg border-2 border-blue-400 bg-white p-3 shadow-2xl duration-200`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-end gap-2">
        {selectedTemplateId && (
          <Button
            size="xs"
            variant="plain"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
        <Button
          size="xs"
          variant="plain"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
          aria-label="Close"
          icon={<ApolloIcon name="cross" />}
        />
      </div>
      <EmailTemplateSelector
        selectedTemplateId={selectedTemplateId ?? ''}
        onTemplateChange={onTemplateChange}
        templatesLoading={templatesLoading}
        emailTemplates={emailTemplates}
      />
    </div>
  );
}
