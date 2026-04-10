import BankFormWrapperComponent from '@/app/(protected-pages)/admin/banks/[id]/_components/BankFormWrapperComponent';
import CreateBankFormWrapper from '@/app/(protected-pages)/admin/banks/create/_components/CreateBankFormWrapper';

import EmailTemplateForm from '@/app/(protected-pages)/admin/email-templates/_components/EmailTemplateForm';
import MailServerFormWrapperComponent from '@/app/(protected-pages)/admin/mailservers/_components/MailServerFormWrapperComponent';
import VoipFromWrapperComponent from '@/app/(protected-pages)/admin/voip-servers/_components/VoipFromWrapperComponent';
import UploadTemplateSidebar from '@/app/(protected-pages)/admin/pdf/_components/UploadTemplateSidebar';
import { useQueryClient } from '@tanstack/react-query';
import { EmailTemplateFormWrapper } from '@/app/(protected-pages)/admin/email-templates/_components/EmailTemplateFormWrapper';

type FormMethods = {
  setValue: (name: string, value: any, options?: any) => void;
  getValues: (name?: string) => any;
  control: any;
  register: any;
  errors: any;
};

interface SidebarContentProps {
  lastSelectedType: string | null;
  sidebarVisible: boolean;
  selectedDropdown: { label: string; value: string } | { label: string; value: string }[] | null;
  bankId: string | null;
  pdfTemplateId: string | null;
  sidebarKey: number;
  formMethods: FormMethods | null;
  setSidebarVisible: (visible: boolean) => void;
}

export const SidebarContent = ({
  lastSelectedType,
  sidebarVisible,
  selectedDropdown,
  bankId,
  pdfTemplateId,
  sidebarKey,
  formMethods,
  setSidebarVisible,
}: SidebarContentProps) => {
  const queryClient = useQueryClient();

  if (!lastSelectedType || !sidebarVisible) return null;

  if (!formMethods && lastSelectedType !== 'voip' && lastSelectedType !== 'new_voip') return null;

  const handleVoipSuccess = (data: any) => {
    setSidebarVisible(false);

    // Invalidate query keys used by the dropdown
    queryClient.invalidateQueries({ queryKey: ['voip'] });
    queryClient.invalidateQueries({ queryKey: ['voip-servers'] });
    queryClient.invalidateQueries({ queryKey: ['voipservers'] });

    // Force immediate refetch to update dropdown options after sidebar closes
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['voip'] });
      queryClient.refetchQueries({ queryKey: ['voip-servers'] });
      queryClient.refetchQueries({ queryKey: ['voipservers'] });
    }, 100);

    if (formMethods) {
      // Extract name from response (handle both direct response and nested data structure)
      const voipServerName = data?.name || data?.data?.name || '';
      const voipServerId = data?._id || data?.data?._id || data?.id || '';

      if (voipServerId) {
        const updatedValue = { label: voipServerName, value: voipServerId };
        // Use setValue with shouldValidate and shouldDirty to ensure UI updates
        formMethods.setValue('voipserver_id', updatedValue, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  const handleMailSuccess = (data: any) => {
    setSidebarVisible(false);

    // Invalidate query keys used by the dropdown
    queryClient.invalidateQueries({ queryKey: ['mail'] });
    queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
    queryClient.invalidateQueries({ queryKey: ['mailservers'] });

    // Force immediate refetch to update dropdown options after sidebar closes
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['mail'] });
      queryClient.refetchQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.refetchQueries({ queryKey: ['mailservers'] });
    }, 100);

    if (formMethods) {
      // Extract name from response (handle both direct response and nested data structure)
      const mailServerName = data?.name || data?.data?.name || '';
      const mailServerId = data?._id || data?.data?._id || data?.id || '';

      if (mailServerId) {
        const updatedValue = { label: mailServerName, value: mailServerId };
        // Use setValue with shouldValidate and shouldDirty to ensure UI updates
        formMethods.setValue('mailserver_id', updatedValue, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  const handleNewMailSuccess = (data: any) => {
    setSidebarVisible(false);

    // Invalidate query keys used by the dropdown
    queryClient.invalidateQueries({ queryKey: ['mail'] });
    queryClient.invalidateQueries({ queryKey: ['settings', 'mailservers'] });
    queryClient.invalidateQueries({ queryKey: ['mailservers'] });

    // Force immediate refetch to update dropdown options after sidebar closes
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['mail'] });
      queryClient.refetchQueries({ queryKey: ['settings', 'mailservers'] });
      queryClient.refetchQueries({ queryKey: ['mailservers'] });
    }, 100);

    if (formMethods) {
      const newOption = { label: data.name, value: data._id };
      const current = formMethods.getValues('mailservers') || [];
      formMethods.setValue('mailservers', [...current, newOption]);
      if (!formMethods.getValues('mailserver_id')) {
        formMethods.setValue('mailserver_id', newOption);
      }
    }
  };

  const handleBankSuccess = (data: any) => {
    setSidebarVisible(false);
    if (formMethods) {
      const current = formMethods.getValues('banks') || [];
      formMethods.setValue(
        'banks',
        current.map((bank: { label: string; value: string }) =>
          bank.value === data._id ? { label: data.name, value: data._id } : bank
        )
      );
    }
  };

  const handleNewBankSuccess = (data: any) => {
    setSidebarVisible(false);
    if (formMethods) {
      const newOption = { label: data.name, value: data._id };
      const current = formMethods.getValues('banks') || [];
      formMethods.setValue('banks', [...current, newOption]);
    }
  };

  const handleEmailTemplateSuccess = (data: any) => {
    setSidebarVisible(false);

    queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    queryClient.invalidateQueries({ queryKey: ['email-templates'] });

    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['email_templates'] });
      queryClient.refetchQueries({ queryKey: ['email-templates'] });
    }, 100);

    if (formMethods && data?._id) {
      const currentTemplates = formMethods.getValues('email_templates') || [];
      const templateIndex = currentTemplates.findIndex(
        (t: { label: string; value: string }) => t.value === data._id
      );

      if (templateIndex >= 0) {
        const updated = currentTemplates.map(
          (t: { label: string; value: string }) =>
            t.value === data._id ? { label: data.name, value: data._id } : t
        );
        formMethods.setValue('email_templates', updated, { shouldValidate: true, shouldDirty: true });
      } else {
        formMethods.setValue('email_templates', [...currentTemplates, { label: data.name, value: data._id }], {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  const handlePdfTemplateSuccess = (updatedTemplate?: { _id: string; name: string }) => {
    setSidebarVisible(false);

    // Invalidate query keys used by the dropdown
    queryClient.invalidateQueries({ queryKey: ['pdf_templates'] });
    queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });

    // Force immediate refetch to update dropdown options after sidebar closes
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['pdf_templates'] });
      queryClient.refetchQueries({ queryKey: ['pdf-templates'] });
    }, 100);

    // Update the form value for the updated PDF template in the multi-select array
    if (formMethods && updatedTemplate && updatedTemplate._id) {
      const currentTemplates = formMethods.getValues('pdf_templates') || [];

      // Check if template already exists in the array
      const templateIndex = currentTemplates.findIndex(
        (template: { label: string; value: string }) => template.value === updatedTemplate._id
      );

      if (templateIndex >= 0) {
        // Update existing template
        const updatedTemplates = currentTemplates.map(
          (template: { label: string; value: string }) =>
            template.value === updatedTemplate._id
              ? { label: updatedTemplate.name, value: updatedTemplate._id }
              : template
        );
        formMethods.setValue('pdf_templates', updatedTemplates, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        // Add new template if it doesn't exist (for create case)
        const newTemplateOption = { label: updatedTemplate.name, value: updatedTemplate._id };
        formMethods.setValue('pdf_templates', [...currentTemplates, newTemplateOption], {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  switch (lastSelectedType) {
    case 'voip':
      const voipServerId = Array.isArray(selectedDropdown)
        ? selectedDropdown[selectedDropdown.length - 1]?.value
        : selectedDropdown?.value;

      return voipServerId ? (
        <VoipFromWrapperComponent
          key={`voip-${voipServerId}-${sidebarKey}`}
          type="edit"
          id={voipServerId as string}
          isPage={false}
          onSuccess={handleVoipSuccess}
        />
      ) : null;
    case 'new_voip':
      return (
        <VoipFromWrapperComponent type="create" isPage={false} onSuccess={handleVoipSuccess} />
      );
    case 'mail':
      const mailServerId = Array.isArray(selectedDropdown)
        ? selectedDropdown[selectedDropdown.length - 1]?.value
        : selectedDropdown?.value;

      return mailServerId ? (
        <MailServerFormWrapperComponent
          type="edit"
          id={mailServerId as string}
          isPage={false}
          onSuccess={handleMailSuccess}
          hideProjectAssignments
        />
      ) : null;
    case 'new_mail':
      return (
        <MailServerFormWrapperComponent
          type="create"
          isPage={false}
          onSuccess={handleNewMailSuccess}
          hideProjectAssignments
        />
      );
    case 'banks':
      return (
        <BankFormWrapperComponent
          key={`bank-${bankId}-${sidebarKey}`}
          isPage={false}
          id={bankId as string}
          onSuccess={handleBankSuccess}
        />
      );
    case 'new_bank':
      return <CreateBankFormWrapper isPage={false} onSuccess={handleNewBankSuccess} />;
    case 'email_template':
      const emailTemplateId = Array.isArray(selectedDropdown)
        ? selectedDropdown[selectedDropdown.length - 1]?.value
        : selectedDropdown?.value;

      return emailTemplateId ? (
        <EmailTemplateFormWrapper
          key={`email-template-${emailTemplateId}`}
          isPage={false}
          id={emailTemplateId as string}
          onSuccess={handleEmailTemplateSuccess}
        />
      ) : null;
    case 'new_email_template':
      return <EmailTemplateForm isPage={false} onSuccess={handleEmailTemplateSuccess} />;
    case 'pdf_template':
      return (
        <UploadTemplateSidebar
          key={`pdf-template-${pdfTemplateId}-${sidebarKey}`}
          isOpen={true}
          onClose={handlePdfTemplateSuccess}
          renderInSidebar={true}
          pdfId={pdfTemplateId as string}
          header={false}
        />
      );
    default:
      return null;
  }
};
