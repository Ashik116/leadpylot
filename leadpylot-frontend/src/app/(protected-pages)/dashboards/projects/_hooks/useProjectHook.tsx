import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { toastWithAxiosError } from '@/utils/toastWithAxiosError';
import { useProjectsNavigationStore } from '@/stores/navigationStores';
import {
  useAddProjectAgents,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from '@/services/hooks/useProjects';
import {
  apiCreateProject,
  CreateProjectRequest,
  ProjectDetails as ProjectDetailsType,
} from '@/services/ProjectsService';
import { useBanksLazy, useMailServerLazy, useVoipServerLazy } from '@/services/hooks/useSettings';
import { ProjectFormData } from './useProjectForm';

interface UseProjectHookProps {
  isCreateComponent: boolean;
  projectData?: ProjectDetailsType;
}

export const useProjectHook = ({ isCreateComponent, projectData }: UseProjectHookProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [projectCreated, setProjectCreated] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [createdProjectData, setCreatedProjectData] = useState<ProjectDetailsType | null>(null);
  const [selectedDropdown, setSelectedDropdown] = useState<{ label: string; value: string } | { label: string; value: string }[] | null>(null);
  const [selectedBank, setSelectedBank] = useState<{ label: string; value: string; }[]>([]);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<{ label: string; value: string; }[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // Add a key to force re-render of the sidebar when bank selection changes
  const [sidebarKey, setSidebarKey] = useState<number>(0);
  const [lastSelectedType, setLastSelectedType] = useState<
    | 'voip'
    | 'mail'
    | 'banks'
    | 'email_template'
    | 'agent_email'
    | 'new_voip'
    | 'new_mail'
    | 'new_bank'
    | 'new_email_template'
    | 'pdf_template'
    | null
  >(null);

  // Navigation store
  const getPreviousItem = useProjectsNavigationStore((state) => state.getPreviousItem);
  const getNextItem = useProjectsNavigationStore((state) => state.getNextItem);
  const getCurrentPosition = useProjectsNavigationStore((state) => state.getCurrentPosition);
  const getTotalItems = useProjectsNavigationStore((state) => state.getTotalItems);

  // Project mutations
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(
    projectData?._id as string
  );
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject(
    projectData?._id as string
  );
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: project } = useProject(projectId, projectCreated);
  const addProjectAgents = useAddProjectAgents();

  const createProject = useMutation({
    mutationFn: (data: CreateProjectRequest) => apiCreateProject(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectCreated(true);
      setProjectId(response._id);

      // Transform response to ProjectDetailsType format for display
      const responseName = response.name as any;
      const variablesName = (variables as any).name;
      const projectDetails: ProjectDetailsType = {
        _id: response._id,
        id: (response as any).id || 0,
        name: typeof responseName === 'string'
          ? responseName
          : { en_US: (responseName?.en_US || variablesName || '') as string },
        project_website: (response as any).project_website || (variables as any).project_website || '',
        project_website_link: (response as any).project_website_link || null,
        deport_link: (response as any).deport_link || (variables as any).deport_link || '',
        inbound_email: (response as any).inbound_email || (variables as any).inbound_email || '',
        inbound_number: (response as any).inbound_number || (variables as any).inbound_number || '',
        description: (response as any).description || (variables as any).description || '',
        banks: (response as any).banks || [],
        mailservers: (response as any).mailservers || [],
        allMailServers: (response as any).allMailServers || [],
        voipserver_id: (response as any).voipserver_id || null,
        mailserver_id: (response as any).mailserver_id || null,
        project_address3: null,
        agents: (response as any).agents || [],
        contract: (response as any).contract || null,
        confirmation_email: (response as any).confirmation_email || null,
        pdf_template_id: (response as any).pdf_template_id || null,
        color_code: (response as any).color_code || (variables as any).color_code || '',
      } as ProjectDetailsType;

      setCreatedProjectData(projectDetails);

      // Add project to navigation store
      const completeProject = {
        _id: response._id,
        name: typeof responseName === 'string' ? responseName : (responseName?.en_US || variablesName || '') as string,
        project_website_link: (response as any).project_website_link || null,
        deport_link: (response as any).deport_link || null,
        inbound_email: (response as any).inbound_email || null,
        inbound_number: (response as any).inbound_number || null,
        active: (response as any).active ?? true,
        users: 0,
      };
      useProjectsNavigationStore.getState().addItems([completeProject]);

      toast.push(
        <Notification title="Project created" type="success">
          Project created successfully
        </Notification>
      );
    },
  });

  // Navigation handlers
  const goToPreviousProject = () => {
    const previousProject = getPreviousItem();
    if (previousProject) {
      router.push(`/dashboards/projects/${previousProject._id}`);
    } else {
      router.push('/dashboards/projects');
    }
  };

  const goToNextProject = () => {
    const nextProject = getNextItem();
    if (nextProject) {
      router.push(`/dashboards/projects/${nextProject._id}`);
    } else {
      router.push('/dashboards/projects');
    }
  };

  // Delete handler
  const handleDelete = () => {
    deleteProject(undefined, {
      onSuccess: () => {
        useProjectsNavigationStore.getState().removeItem(projectData?._id as string);
        toast.push(
          <Notification title="Project deleted" type="success">
            Project deleted successfully
          </Notification>
        );
        router.push('/dashboards/projects');
      },
    });
    setIsDeleteDialogOpen(false);
  };

  // Helpers to normalize form values for API
  const normalizeId = async (input: any) =>
    input && typeof input === 'object' && 'value' in input ? input.value : input || undefined;
  const mapValueArray = async (arr: any[]) =>
    Array.isArray(arr) ? arr.map((it: any) => ('value' in it ? it.value : it)) : [];

  // Form submission handler
  const onSubmit = async (data: ProjectFormData) => {
    if (!isCreateComponent) {
      // Build plain JSON payload for update
      const payload: Record<string, any> = {
        name: data.name,
        description: data.description ?? '',
        project_website: data.project_website ?? '',
        deport_link: data.deport_link ?? '',
        inbound_email: data.inbound_email ?? '',
        inbound_number: data.inbound_number ?? '',
        voipserver_id: (await normalizeId(data.voipserver_id)) ?? null,
        // mailserver_id: (await normalizeId(data.mailserver_id)) ?? null,
        // mailservers: await mapValueArray(data.mailservers as any[] || []),
        banks: await mapValueArray(data.banks as any[] || []),
        email_template_id: (await normalizeId(data.email_template_id)) ?? null,
        pdf_templates: await mapValueArray(data.pdf_templates as any[] || []),
        email_templates: await mapValueArray((data as any).email_templates as any[] || []),
        color_code: data.color_code || '',
        outbound_cid: (data as any).outbound_cid || '',
        inbound_did: (data as any).inbound_did || '',
        trunk_name: (data as any).trunk_name || '',
      };

      if (data.contract && typeof data.contract === 'object' && (data.contract as any)._id) {
        payload.contract = (data.contract as any)._id;
      } else if (typeof data.contract === 'string') {
        payload.contract = data.contract;
      }
      if (
        data.confirmation_email &&
        typeof data.confirmation_email === 'object' &&
        (data.confirmation_email as any)._id
      ) {
        payload.confirmation_email = (data.confirmation_email as any)._id;
      } else if (typeof data.confirmation_email === 'string') {
        payload.confirmation_email = data.confirmation_email;
      }

      await updateProject(payload as any, {
        onSuccess: (updatedProjectData) => {
          const completeUpdatedProject = {
            _id: updatedProjectData._id || (projectData?._id as string),
            name:
              typeof updatedProjectData.name === 'string'
                ? updatedProjectData.name
                : updatedProjectData.name?.en_US || projectData?.name?.en_US || '',
            project_website_link: updatedProjectData?.project_website_link || null,
            deport_link: updatedProjectData.deport_link || null,
            inbound_email: updatedProjectData.inbound_email || null,
            inbound_number: updatedProjectData.inbound_number || null,
            active: true,
            users: 0,
          };
          useProjectsNavigationStore.getState().updateItem(completeUpdatedProject);

          queryClient.invalidateQueries({ queryKey: ['project', projectData?._id] });

          setIsEditing(false);
          toast.push(
            <Notification title="Project updated" type="success">
              Project updated successfully
            </Notification>
          );

          // Note: Form reset is handled by BaseFormComponent via defaultValues update
        },
        onError: (error) => {
          const { message } = toastWithAxiosError(error);
          toast.push(
            <Notification title="Error" type="danger">
              {message}
            </Notification>
          );
        },
      });
    } else {
      if (!projectCreated) {
        // Build plain JSON payload for create
        const payload: Record<string, any> = {
          name: data.name,
          project_website: data.project_website ?? '',
          deport_link: data.deport_link ?? '',
          inbound_email: data.inbound_email ?? '',
          inbound_number: data.inbound_number ?? '',
          banks: await mapValueArray(data.banks as any[] || []),
          // mailserver_id: (await normalizeId(data.mailserver_id)) ?? null,
          voipserver_id: (await normalizeId(data.voipserver_id)) ?? null,
          // mailservers: await mapValueArray(data.mailservers as any[] || []),
          email_template_id: (await normalizeId(data.email_template_id)) ?? null,
          description: data.description ?? '',
          pdf_templates: await mapValueArray(data.pdf_templates as any[] || []),
          email_templates: await mapValueArray((data as any).email_templates as any[] || []),
          color_code: data.color_code || '',
          outbound_cid: (data as any).outbound_cid || '',
          inbound_did: (data as any).inbound_did || '',
          trunk_name: (data as any).trunk_name || '',
          active: true,
        };

        // Only include attachments if IDs/strings
        // if (data.contract && typeof data.contract === 'object' && (data.contract as any)._id) {
        //   payload.contract = (data.contract as any)._id;
        // } else if (typeof data.contract === 'string') {
        //   payload.contract = data.contract;
        // }
        // if (data.confirmation_email && typeof data.confirmation_email === 'object' && (data.confirmation_email as any)._id) {
        //   payload.confirmation_email = (data.confirmation_email as any)._id;
        // } else if (typeof data.confirmation_email === 'string') {
        //   payload.confirmation_email = data.confirmation_email;
        // }

        await createProject.mutate(payload as any);

        // After creation, update form with created project data instead of resetting
        // This happens after the mutation completes, so we need to wait for it
        // The form will be updated via useEffect when createdProjectData is set
      }
      if (projectCreated && Array.isArray(data.agents) && data.agents.length > 0) {
        addProjectAgents.mutate(
          {
            projectId,
            data: {
              agents: data.agents,
            },
          },
          {
            onSuccess: (response) => {
              // Update createdProjectData with the response that includes agents
              if (response && createdProjectData) {
                const updatedProjectData: ProjectDetailsType = {
                  ...createdProjectData,
                  agents: (response as any).agents || createdProjectData.agents || [],
                };
                setCreatedProjectData(updatedProjectData);
              }

              // Invalidate and refetch project query to get latest data
              queryClient.invalidateQueries({ queryKey: ['project', projectId] });

              toast.push(
                <Notification title="Agents added" type="success">
                  Agents added successfully
                </Notification>
              );
              // Don't redirect - let user stay on create page to see agents
            },
            onError: (error) => {
              const { message } = toastWithAxiosError(error);
              toast.push(
                <Notification title="Error" type="danger">
                  {message}
                </Notification>
              );
            },
          }
        );
      }
    }
  };

  // Lazy queries
  const results = useBanksLazy();
  const mailServer = useMailServerLazy();
  const voipServer = useVoipServerLazy();
  const bankId = selectedBank?.[selectedBank.length - 1]?.value;
  const pdfTemplateId = selectedPdfTemplate?.[selectedPdfTemplate.length - 1]?.value;

  // Refs to track if queries have been triggered to prevent re-triggering on project updates
  const banksQueryTriggeredRef = useRef<string>('');
  const mailServerQueryTriggeredRef = useRef<string | null>(null);
  const voipServerQueryTriggeredRef = useRef<string | null>(null);

  // Effects
  useEffect(() => {
    if (!isCreateComponent && projectData && (projectData.banks?.length ?? 0) > 0) {
      // Create a stable key from bank IDs to compare
      const banksKey = projectData.banks.map((b: any) => b._id).sort().join(',');
      if (banksQueryTriggeredRef.current !== banksKey) {
        banksQueryTriggeredRef.current = banksKey;
        results.mutate(projectData.banks as any);
      }
    }
  }, [projectData?.banks, isCreateComponent, results]);

  useEffect(() => {
    if (!isCreateComponent && projectData?.mailserver_id) {
      // Extract ID whether it's a string or populated object
      let mailServerId: string;
      if (typeof projectData.mailserver_id === 'object' && projectData.mailserver_id !== null) {
        mailServerId = (projectData.mailserver_id as any)._id || (projectData.mailserver_id as any).id || '';
      } else {
        mailServerId = projectData.mailserver_id as string;
      }

      if (mailServerId && mailServerQueryTriggeredRef.current !== mailServerId) {
        mailServerQueryTriggeredRef.current = mailServerId;
        mailServer.mutate(mailServerId);
      }
    }
  }, [projectData?.mailserver_id, isCreateComponent, mailServer]);

  useEffect(() => {
    if (!isCreateComponent && projectData?.voipserver_id) {
      // Extract ID whether it's a string or populated object
      let voipServerId: string;
      if (typeof projectData.voipserver_id === 'object' && projectData.voipserver_id !== null) {
        voipServerId = (projectData.voipserver_id as any)._id || (projectData.voipserver_id as any).id || '';
      } else {
        voipServerId = projectData.voipserver_id as string;
      }

      if (voipServerId && voipServerQueryTriggeredRef.current !== voipServerId) {
        voipServerQueryTriggeredRef.current = voipServerId;
        voipServer.mutate(voipServerId);
      }
    }
  }, [projectData?.voipserver_id, isCreateComponent, voipServer]);

  // Update createdProjectData when project query returns data (includes agents)
  useEffect(() => {
    if (isCreateComponent && projectCreated && project && createdProjectData) {
      // Update createdProjectData with fresh data from query (includes agents)
      setCreatedProjectData(project);
    }
  }, [isCreateComponent, projectCreated, project, createdProjectData]);

  // Return all the necessary values and functions
  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditing,
    setIsEditing,
    projectCreated,
    selectedDropdown,
    setSelectedDropdown,
    sidebarVisible,
    setSidebarVisible,
    sidebarKey,
    setSidebarKey,
    lastSelectedType,
    setLastSelectedType,
    getCurrentPosition,
    totalProjects: getTotalItems(),
    goToPreviousProject,
    goToNextProject,
    onSubmit,
    setSelectedBank,
    setSelectedPdfTemplate,
    // Use project from useProject query if available (has latest data including agents)
    // Otherwise fall back to createdProjectData for newly created projects
    project: isCreateComponent && project ? project : (isCreateComponent && createdProjectData ? createdProjectData : project),
    bankId,
    pdfTemplateId,

    // Mutations
    isUpdating,
    isDeleting,
    createProject: createProject.mutate,
    isPendingCreate: createProject.isPending,
    handleDelete,

    // Lazy queries
    results,
    mailServer,
    voipServer,
  };
};

export default useProjectHook;
