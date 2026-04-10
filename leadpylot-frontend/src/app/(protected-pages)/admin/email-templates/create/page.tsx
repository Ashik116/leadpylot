'use client';

import { useRouter } from 'next/navigation';
import EmailTemplateForm from '../_components/EmailTemplateForm';

function CreateEmailTemplatePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/email-templates');
  };

  const handleClose = () => {
    router.push('/admin/email-templates');
  };

  return (
    <div className="space-y-4">
      <div className="mx-4 mt-4">
        <h4 className="text-lg font-semibold">Create Email Template</h4>
       
      </div>
      <EmailTemplateForm isPage={true} onSuccess={handleSuccess} onClose={handleClose} />
    </div>
  );
}

export default CreateEmailTemplatePage;
