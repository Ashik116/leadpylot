'use client';

import Loading from '@/components/shared/Loading';
import { useEmailTemplate } from '@/services/hooks/useSettings';
import EmailTemplateForm from './EmailTemplateForm';

interface EmailTemplateFormWrapperProps {
  onSuccess?: (data: any) => void;
  onClose?: () => void;
  isPage?: boolean;
  id?: string;
}

export function EmailTemplateFormWrapper({ id, onSuccess, onClose, isPage = false }: EmailTemplateFormWrapperProps) {
  const { data: emailTemplate, isLoading } = useEmailTemplate(id || '');

  if (id && isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loading loading={true} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <EmailTemplateForm
        initialData={id ? emailTemplate : undefined}
        isPage={isPage}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    </div>
  );
}
