import { useEffect, useState, useRef } from 'react';

type FormMethods = {
  setValue: (name: string, value: any, options?: any) => void;
  getValues: (name?: string) => any;
  control: any;
  register: any;
  errors: any;
};

interface UseProjectStateProps {
  isCreateComponent: boolean;
  projectCreated: boolean;
  project: any;
  formMethods: FormMethods | null;
  voipServer: { mutate: (id: string) => void; data: any };
  mailServer: { mutate: (id: string) => void; data: any };
}

export const useProjectState = ({
  isCreateComponent,
  projectCreated,
  project,
  formMethods,
  voipServer,
  mailServer,
}: UseProjectStateProps) => {
  const [isProjectOpen, setIsProjectOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('isProjectOpen') ?? 'true');
      } catch {
        return true;
      }
    }
    return true;
  });

  const hasPopulatedFormRef = useRef(false);
  const hasTriggeredVoipQueryRef = useRef(false);
  const hasTriggeredMailQueryRef = useRef(false);
  const voipServerValueSetRef = useRef(false);
  const mailServerValueSetRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('isProjectOpen', JSON.stringify(isProjectOpen));
      } catch (error) {
        console.error('Failed to save isProjectOpen to localStorage:', error);
      }
    }
  }, [isProjectOpen]);

  useEffect(() => {
    if (isCreateComponent && projectCreated && project && formMethods && !hasPopulatedFormRef.current) {
      const name = typeof project.name === 'string' ? project.name : (project.name as any)?.en_US || '';

      formMethods.setValue('name', name, { shouldDirty: false });
      formMethods.setValue('description', project.description || '', { shouldDirty: false });
      formMethods.setValue('project_website', project.project_website || '', { shouldDirty: false });
      formMethods.setValue('deport_link', project.deport_link || '', { shouldDirty: false });
      formMethods.setValue('inbound_email', project.inbound_email || '', { shouldDirty: false });
      formMethods.setValue('inbound_number', project.inbound_number || '', { shouldDirty: false });
      formMethods.setValue('color_code', project.color_code || '', { shouldDirty: false });

      if (project.banks && Array.isArray(project.banks)) {
        formMethods.setValue('banks', project.banks.map((bank: any) => ({ label: bank.name, value: bank._id })), { shouldDirty: false });
      }

      if (project.mailservers && Array.isArray(project.mailservers)) {
        formMethods.setValue('mailservers', project.mailservers.map((ms: any) => ({ label: ms.name, value: ms._id })), { shouldDirty: false });
      }

      if ((project as any).pdf_templates && Array.isArray((project as any).pdf_templates)) {
        formMethods.setValue('pdf_templates', (project as any).pdf_templates.map((t: any) => ({ label: t.name, value: t._id })), { shouldDirty: false });
      }

      hasPopulatedFormRef.current = true;

      if ((project as any).voipserver_id && !hasTriggeredVoipQueryRef.current) {
        hasTriggeredVoipQueryRef.current = true;
        voipServer.mutate((project as any).voipserver_id);
      }

      if (project.mailserver_id && !hasTriggeredMailQueryRef.current) {
        hasTriggeredMailQueryRef.current = true;
        mailServer.mutate(project.mailserver_id);
      }
    }
  }, [isCreateComponent, projectCreated, project, formMethods, voipServer, mailServer]);

  useEffect(() => {
    if (isCreateComponent && projectCreated && voipServer.data && formMethods && !voipServerValueSetRef.current) {
      voipServerValueSetRef.current = true;
      formMethods.setValue('voipserver_id', {
        label: voipServer.data.name,
        value: voipServer.data._id,
      }, { shouldDirty: false });
    }
  }, [isCreateComponent, projectCreated, voipServer.data, formMethods]);

  useEffect(() => {
    if (isCreateComponent && projectCreated && mailServer.data && formMethods && !mailServerValueSetRef.current) {
      mailServerValueSetRef.current = true;
      formMethods.setValue('mailserver_id', {
        label: mailServer.data.name as string,
        value: mailServer.data._id,
      }, { shouldDirty: false });
    }
  }, [isCreateComponent, projectCreated, mailServer.data, formMethods]);

  return {
    isProjectOpen,
    setIsProjectOpen,
  };
};

