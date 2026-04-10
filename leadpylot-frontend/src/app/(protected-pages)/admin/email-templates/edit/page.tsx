'use client';

import Loading from '@/components/shared/Loading';
import Card from '@/components/ui/Card';
import { useEmailTemplate } from '@/services/hooks/useSettings';
import { useRouter, useSearchParams } from 'next/navigation';
import EmailTemplateForm from '../_components/EmailTemplateForm';

function EditEmailTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const { data: emailTemplate, isLoading } = useEmailTemplate(id || '');

  const handleSuccess = () => {
    router.push('/admin/email-templates');
  };

  const handleClose = () => {
    router.push('/admin/email-templates');
  };

  if (!id) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-500">No template ID provided</p>
            <button onClick={handleClose} className="mt-4 text-blue-600 hover:text-blue-800">
              Go back to templates
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex min-h-[300px] items-center justify-center p-6">
            <Loading loading={true} />
          </div>
        </Card>
      </div>
    );
  }

  if (!emailTemplate) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-500">Template not found</p>
            <button onClick={handleClose} className="mt-4 text-blue-600 hover:text-blue-800">
              Go back to templates
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="">

      <div className="mx-4.5 pt-2">
        <h4 className="text-lg font-semibold">Edit Email Template</h4>
      </div>
      <EmailTemplateForm
        initialData={emailTemplate}
        isPage={true}
        onSuccess={handleSuccess}
        onClose={handleClose}
      />

    </div>
  );
}

export default EditEmailTemplatePage;
