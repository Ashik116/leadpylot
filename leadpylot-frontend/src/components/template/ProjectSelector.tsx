import Select, { Option as DefaultOption } from '@/components/ui/Select';
import { useProjects, useAllProjects } from '@/services/hooks/useProjects';
import { useEffect, useMemo, useState } from 'react';
import type { ControlProps, OptionProps } from 'react-select';
import { components } from 'react-select';
import { useSelectedProjectStore, ProjectSelectorOption } from '@/stores/selectedProjectStore';
import { useSession } from '@/hooks/useSession';
import ProjectsMenuIcon from '@/assets/svg/menu-icons/ProjectsMenuIcon';
import { useLeadConditional } from '@/services/hooks/useLeads';
import { useParams, usePathname } from 'next/navigation';
import { getProjectColor, lightenColor } from '@/utils/projectColors';

const { Control } = components;

const CustomSelectOption = (props: OptionProps<ProjectSelectorOption>) => {
  return (
    <DefaultOption<ProjectSelectorOption>
      {...props}
      customLabel={(data, label) => (
        <span className="flex items-center gap-1">
          <span className="">{label}</span>
        </span>
      )}
    />
  );
};

const CustomControl = ({ children, ...props }: ControlProps<ProjectSelectorOption>) => {
  return (
    <Control {...props}>
      <div className="flex items-center" style={{ marginLeft: 2, marginRight: 2 }}>
        <ProjectsMenuIcon width={16} height={16} />
      </div>
      {children}
    </Control>
  );
};

// Only fetch lead when on lead details page (e.g. /dashboards/leads/69a13...)
// Avoids wrong API calls on reclamation/other detail pages that also have [id]
const LEAD_DETAILS_PATH_REGEX = /^\/dashboards\/leads\/[a-f0-9]{24}$/i;

const ProjectSelector = () => {
  const { selectedProject, setSelectedProject, setAllProjects } = useSelectedProjectStore();
  const { data: session } = useSession();
  const params = useParams();
  const pathname = usePathname();

  const id = params?.id as string | undefined;
  const isLeadDetailsPage = LEAD_DETAILS_PATH_REGEX.test(pathname || '');
  const shouldFetchLead = !!id && isLeadDetailsPage;

  const { data: lead, status: leadStatus } = useLeadConditional(id ?? '', shouldFetchLead);

  // Detect offers and openings pages - reset to "All Projects" for agents
  const isOffersPage = pathname?.includes('/offers') || false;
  const isOpeningsPage = pathname?.includes('/openings') || false;
  const shouldResetToAllProjects = isOffersPage || isOpeningsPage;

  // Access persist metadata in a type-safe way
  const storeWithPersist = useSelectedProjectStore as unknown as {
    persist?: {
      hasHydrated?: () => boolean;
      onFinishHydration?: (cb: () => void) => void;
    };
  };

  // Track hydration of persisted store to avoid overriding user selection on refresh
  const [hasHydrated, setHasHydrated] = useState(() => {
    try {
      return storeWithPersist.persist?.hasHydrated?.() ?? false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const finish = storeWithPersist.persist?.onFinishHydration;
    if (typeof finish === 'function') {
      finish(() => setHasHydrated(true));
    }
    if (storeWithPersist.persist?.hasHydrated?.()) {
      setHasHydrated(true);
    }
  }, []);

  // For agents, use useAllProjects to get full project data with VoIP credentials
  // For admins, use useProjects to get project summaries
  const { data: allProjects, status: allProjectsStatus } = useAllProjects({ limit: 100 });
  const { data: projectSummaries, status: projectSummariesStatus } = useProjects({
    role: session?.user?.role,
  });

  // Use the appropriate data source based on user role
  const projects = session?.user?.role === 'Agent' ? allProjects?.data : projectSummaries;
  const status = session?.user?.role === 'Agent' ? allProjectsStatus : projectSummariesStatus;

  const options = useMemo(() => {
    // Create "All Projects" option
    const allProjectsOption: ProjectSelectorOption = {
      value: 'all',
      label: 'All Projects',
      _id: 'all',
      name: 'All Projects',
      project_website: null,
      project_website_link: null,
      deport_link: null,
      inbound_email: null,
      inbound_number: null,
      active: true,
      users: 0,
      agents: [],
    };

    if (!Array.isArray(projects) || status !== 'success') {
      return [allProjectsOption];
    }

    const projectOptions = projects.map((project) => {
      // Type guard to handle both Project and ProjectLeads
      if ('_id' in project && 'name' in project) {
        // This is a Project (has VoIP credentials)
        return {
          ...project,
          value: project?._id,
          label: project?.name,
          _id: project?._id,
          name: project?.name,
        };
      }

      // This is a ProjectLeads (no VoIP credentials)
      return {
        ...project,
        value: project?.projectId,
        label: project?.projectName,
        _id: project?.projectId,
        name: project?.projectName,
        agents: [], // Empty agents array for ProjectLeads
      };
    });

    const sortedProjects = projectOptions.sort((a: any, b: any) =>
      String(a?.label)?.localeCompare(String(b?.label), undefined, { sensitivity: 'base' })
    );

    // Always put "All Projects" first
    return [allProjectsOption, ...sortedProjects];
  }, [projects, status]);

  // When ProjectSelector is active and has loaded projects, set allProjects in store for use elsewhere
  useEffect(() => {
    if (status === 'success' && options && options.length > 0) {
      setAllProjects(options as ProjectSelectorOption[]);
    }
  }, [status, options, setAllProjects]);

  // When navigating to a lead details page, clear previous selection to avoid showing stale value
  useEffect(() => {
    if (isLeadDetailsPage && id) {
      setSelectedProject(null);
    }
  }, [isLeadDetailsPage, id, setSelectedProject]);

  // When navigating to offers or openings pages, reset to "All Projects"
  // This ensures agents see all offers/openings across all projects
  useEffect(() => {
    if (shouldResetToAllProjects && options && options.length > 0) {
      const allProjectsOption = options.find((opt: any) => opt.value === 'all' || opt._id === 'all');
      if (allProjectsOption && selectedProject?.value !== 'all') {
        setSelectedProject(allProjectsOption as ProjectSelectorOption);
      }
    }
  }, [shouldResetToAllProjects, options, selectedProject?.value, setSelectedProject]);

  useEffect(() => {
    // Wait for projects and hydration to be ready
    if (status !== 'success' || !options || options?.length === 0 || !hasHydrated) {
      return;
    }

    // On lead details page: select the lead's project when available; otherwise default to All Projects
    if (isLeadDetailsPage && id) {
      if (leadStatus === 'success') {
        const leadProjectId =
          lead?.project && Array.isArray(lead?.project) && lead?.project[0]?._id;
        if (leadProjectId) {
          const matchedOption = options?.find(
            (option: any) => option?._id === leadProjectId || option?.value === leadProjectId
          );
          setSelectedProject(
            (matchedOption || (options[0] as ProjectSelectorOption)) as ProjectSelectorOption
          );
        } else {
          setSelectedProject(options[0] as ProjectSelectorOption);
        }
      }
      return;
    }

    // On other detail pages (reclamation, etc.): default to All Projects, no lead fetch
    if (id && !isLeadDetailsPage) {
      const allProjectsOption = options?.find(
        (opt: any) => opt?.value === 'all' || opt?._id === 'all'
      );
      if (allProjectsOption) {
        setSelectedProject(allProjectsOption as ProjectSelectorOption);
      }
      return;
    }

    // Not on a detail page: default to All Projects only if nothing is selected after hydration
    if (!selectedProject) {
      setSelectedProject(options[0] as ProjectSelectorOption);
    }
  }, [
    id,
    isLeadDetailsPage,
    status,
    options,
    leadStatus,
    lead,
    selectedProject,
    setSelectedProject,
    hasHydrated,
  ]);

  const showLoading = isLeadDetailsPage && id
    ? leadStatus === 'pending' || status === 'pending' || !selectedProject
    : status === 'pending' || !hasHydrated;

  return (
    <div>
      <Select<ProjectSelectorOption>
        options={options as any}
        components={{
          Option: CustomSelectOption,
          Control: CustomControl,
        }}
        value={selectedProject ?? null}
        onChange={(option) => setSelectedProject(option)}
        size="sm"
        styles={{
          control: (baseStyles, state) => {
            let backgroundColor = '#62a266'; // Evergreen for "All Projects"
            if (selectedProject && selectedProject?.value !== 'all') {
              backgroundColor = getProjectColor(selectedProject?.name);
            }

            const hoverBorderColor = lightenColor(backgroundColor, 20);

            return {
              ...baseStyles,
              minHeight: '28px',
              height: '28px',
              padding: '0 6px',
              borderRadius: '6px',
              backgroundColor: backgroundColor,
              borderColor: state?.isFocused ? hoverBorderColor : backgroundColor,
              color: 'white',
              alignItems: 'center',
              boxShadow: 'none',
              '&:hover': {
                borderColor: hoverBorderColor,
              },
            };
          },
          valueContainer: (baseStyles) => ({
            ...baseStyles,
            padding: '0 2px',
            gap: '4px',
            alignItems: 'center',
          }),
          singleValue: (baseStyles) => ({
            ...baseStyles,
            color: 'white',
            fontWeight: 600,
            marginLeft: '0.5rem',
          }),
          indicatorsContainer: (baseStyles) => ({
            ...baseStyles,
            padding: '0 2px',
          }),
          placeholder: (baseStyles) => ({
            ...baseStyles,
            color: 'rgba(255, 255, 255, 0.8)',
            marginLeft: '0.5rem',
          }),
          dropdownIndicator: (baseStyles) => ({
            ...baseStyles,
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              color: 'white',
            },
          }),
          indicatorSeparator: () => ({
            display: 'none',
          }),
          menu: (baseStyles) => ({
            ...baseStyles,
            width: 'max-content',
            minWidth: '100%',
          }),
        }}
        isDisabled={
          status !== 'success' ||
          (isLeadDetailsPage && !!id && (leadStatus === 'pending' || !selectedProject))
        }
        isLoading={showLoading}
        isSearchable={false}
        placeholder={
          isLeadDetailsPage && id
            ? showLoading
              ? 'Loading...'
              : 'Select Project'
            : showLoading
              ? 'Loading...'
              : status === 'error'
                ? 'Error'
                : 'Select Project'
        }
      />
    </div>
  );
};

export default ProjectSelector;
