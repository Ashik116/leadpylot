import { useEffect, useRef } from 'react';

type FormMethods = {
  setValue: (name: string, value: any, options?: any) => void;
  getValues: (name?: string) => any;
  control: any;
  register: any;
  errors: any;
  reset?: (values?: any, options?: any) => void;
};

interface UseServerTriggersProps {
  lastSelectedType: string | null;
  selectedDropdown: { label: string; value: string } | { label: string; value: string }[] | null;
  sidebarVisible: boolean;
  formMethods: FormMethods | null;
  voipServer: { mutate: (id: string) => void; data: any };
  mailServer: { mutate: (id: string) => void; data: any };
  results: { data: any };
  isCreateComponent: boolean;
  projectData?: { _id?: string; voipserver_id?: string | null; mailserver_id?: string | null };
}

export const useServerTriggers = ({
  lastSelectedType,
  selectedDropdown,
  sidebarVisible,
  formMethods,
  voipServer,
  mailServer,
  results,
  isCreateComponent,
  projectData,
}: UseServerTriggersProps) => {
  const voipServerQueryTriggeredRef = useRef<string | null>(null);
  const mailServerQueryTriggeredRef = useRef<string | null>(null);
  const voipServerValueSetRef = useRef<string | null>(null);
  const mailServerValueSetRef = useRef<string | null>(null);
  
  // Track current project ID to reset refs when project changes
  const currentProjectIdRef = useRef<string | null>(null);
  
  // Reset value set refs when project changes (on page reload or navigation)
  useEffect(() => {
    if (!isCreateComponent && projectData?._id) {
      const newProjectId = projectData._id;
      if (currentProjectIdRef.current !== newProjectId) {
        currentProjectIdRef.current = newProjectId;
        voipServerValueSetRef.current = null;
        mailServerValueSetRef.current = null;
        console.log('Reset value set refs for project:', newProjectId);
      }
    } else if (isCreateComponent) {
      // Reset refs when switching to create mode
      currentProjectIdRef.current = null;
      voipServerValueSetRef.current = null;
      mailServerValueSetRef.current = null;
    }
  }, [projectData?._id, isCreateComponent]);

  useEffect(() => {
    if (lastSelectedType !== 'voip') {
      voipServerQueryTriggeredRef.current = null;
      return;
    }

    let selectedVoipServer: { label: string; value: string } | null = null;
    if (selectedDropdown) {
      if (Array.isArray(selectedDropdown)) {
        selectedVoipServer = selectedDropdown[selectedDropdown.length - 1] || null;
      } else {
        selectedVoipServer = selectedDropdown;
      }
    }

    if (selectedVoipServer?.value) {
      const voipServerId = selectedVoipServer.value;
      if (voipServerQueryTriggeredRef.current !== voipServerId) {
        voipServerQueryTriggeredRef.current = voipServerId;
        voipServer.mutate(voipServerId);
      }
    }
  }, [lastSelectedType, selectedDropdown, voipServer]);

  // Set voipserver_id form value when query completes (for edit mode initial load)
  // This effect runs when either voipServer.data OR formMethods becomes available
  useEffect(() => {
    if (!isCreateComponent && voipServer.data && formMethods?.setValue && formMethods?.reset) {
      const voipServerId = voipServer.data._id;
      
      // Only set if we haven't set this specific ID yet
      if (voipServerValueSetRef.current !== voipServerId) {
        const currentValue = formMethods.getValues('voipserver_id');
        const valueToSet = {
          label: voipServer.data.name || '',
          value: voipServer.data._id,
        };
        
        // Check if value needs to be set
        const needsUpdate = !currentValue || !currentValue.value || String(currentValue.value) !== String(voipServerId);
        
        if (needsUpdate) {
          voipServerValueSetRef.current = voipServerId;
          
          // Get all current form values
          const allValues = formMethods.getValues();
          
          // Reset form with updated values to ensure it sticks
          formMethods.reset({
            ...allValues,
            voipserver_id: valueToSet,
          }, { keepDefaultValues: true });
          
          console.log('✅ Set voipserver_id via reset:', { valueToSet });
        } else {
          // Already set correctly, just mark as done
          voipServerValueSetRef.current = voipServerId;
        }
      }
    }
  }, [voipServer.data, formMethods, isCreateComponent]);

  useEffect(() => {
    if (!sidebarVisible || lastSelectedType !== 'mail') {
      mailServerQueryTriggeredRef.current = null;
      return;
    }

    let selectedMailServer: { label: string; value: string } | null = null;
    if (selectedDropdown) {
      if (Array.isArray(selectedDropdown)) {
        // If selectedDropdown is an array, it's from "Additional Mail Servers" (mailservers field)
        // Don't trigger query for Primary Mail Server (mailserver_id) in this case
        return;
      } else {
        selectedMailServer = selectedDropdown;
      }
    }

    if (lastSelectedType === 'mail' && selectedMailServer?.value && formMethods) {
      const mailServerId = selectedMailServer.value;
      if (mailServerQueryTriggeredRef.current !== mailServerId) {
        mailServerQueryTriggeredRef.current = mailServerId;
        mailServer.mutate(mailServerId);
      }
    }
  }, [lastSelectedType, selectedDropdown, sidebarVisible, formMethods, mailServer]);

  // Set mailserver_id form value when query completes (for edit mode initial load)
  // This effect runs when either mailServer.data OR formMethods becomes available
  useEffect(() => {
    if (!isCreateComponent && mailServer.data && formMethods?.setValue && formMethods?.reset) {
      const mailServerId = mailServer.data._id;
      
      // Only proceed if selectedDropdown is not an array (which would be from Additional Mail Servers)
      const isFromAdditionalMailServers = selectedDropdown && Array.isArray(selectedDropdown);
      
      if (!isFromAdditionalMailServers) {
        // Only set if we haven't set this specific ID yet
        if (mailServerValueSetRef.current !== mailServerId) {
          const currentValue = formMethods.getValues('mailserver_id');
          const valueToSet = {
            label: mailServer.data.name || '',
            value: mailServer.data._id,
          };
          
          // Check if value needs to be set
          const needsUpdate = !currentValue || !currentValue.value || String(currentValue.value) !== String(mailServerId);
          
          if (needsUpdate) {
            mailServerValueSetRef.current = mailServerId;
            
            // Get all current form values
            const allValues = formMethods.getValues();
            
            // Reset form with updated values to ensure it sticks
            formMethods.reset({
              ...allValues,
              mailserver_id: valueToSet,
            }, { keepDefaultValues: true });
            
            console.log('✅ Set mailserver_id via reset:', { valueToSet });
          } else {
            // Already set correctly, just mark as done
            mailServerValueSetRef.current = mailServerId;
          }
        }
      }
    }
  }, [mailServer.data, formMethods, isCreateComponent, selectedDropdown]);

  useEffect(() => {
    if (!isCreateComponent && results.data && formMethods) {
      formMethods.setValue('banks', results.data.map((bank: any) => ({ label: bank.name, value: bank._id })));
    }
  }, [results.data, formMethods, isCreateComponent]);
};
