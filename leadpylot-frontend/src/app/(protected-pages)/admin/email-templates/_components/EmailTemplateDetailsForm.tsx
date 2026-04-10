'use client';

import { useEmailTemplate } from '@/services/hooks/useSettings';
import EmailTemplateForm from './EmailTemplateForm';
import Loading from '@/components/shared/Loading';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface EmailTemplateDetailsFormProps {
  templateId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  extraActions?: React.ReactNode;
}

export function EmailTemplateDetailsForm({
  templateId,
  onClose,
  onSuccess,
  extraActions,
}: EmailTemplateDetailsFormProps) {
  const { data: emailTemplate, isLoading } = useEmailTemplate(templateId);

  if (isLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  if (!emailTemplate) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h2>Email Template Details</h2>
          {onClose && (
            <Button
              variant="plain"
              size="xs"
              icon={<ApolloIcon name="times" className="text-md" />}
              onClick={onClose}
            />
          )}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Template not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="capitalize">{emailTemplate?.name || 'Email Template'} Details</h2>
        <div className="flex items-center gap-2">
          {extraActions}
          {onClose && (
            <Button
              variant="secondary"
              size="xs"
              icon={<ApolloIcon name="times" className="text-md" />}
              onClick={onClose}
            />
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EmailTemplateForm initialData={emailTemplate} isPage={false} onSuccess={onSuccess} onClose={onClose} />
      </div>
    </div>
  );
}
