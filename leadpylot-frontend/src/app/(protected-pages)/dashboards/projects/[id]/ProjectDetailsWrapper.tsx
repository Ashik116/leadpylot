'use client';

import Loading from '@/components/shared/Loading';
import { useProject, useProjects } from '@/services/hooks/useProjects';
import { use, useEffect } from 'react';

import { useProjectsNavigationStore } from '@/stores/navigationStores';
import ProjectFormCommon from '../_components/ProjectFormCommon/index';
import { GetAllProjectsResponse } from '@/services/ProjectsService';

function ProjectDetailsWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isLoading: isProjectLoading } = useProject(id);
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects();

  // Get navigation store methods
  const setCurrentIndex = useProjectsNavigationStore((state) => state.setCurrentIndex);
  const findItemIndexById = useProjectsNavigationStore((state) => state.findIndexById);

  // Store projects in the navigation store when they're loaded
  useEffect(() => {
    if (!projectsData) return;
    const isGetAllProjectResponse = (data: typeof projectsData): data is GetAllProjectsResponse => {
      return 'meta' in data && Array.isArray(data.data);
    };
    if (isGetAllProjectResponse(projectsData)) {
      if (projectsData?.data) {
        // Add these projects to the store
        const addItems = useProjectsNavigationStore.getState().addItems;
        addItems(projectsData.data);

        // Set total projects count if available
        // Ensure we use projectsData.meta.total if available, otherwise fallback to length
        const total = projectsData.meta?.total ?? projectsData.data.length;
        if (total) {
          const setTotalItems = useProjectsNavigationStore.getState().setTotalItems;
          setTotalItems(total);
        }
      }
    }
  }, [projectsData]);

  // Set the current project index when the project data is loaded
  useEffect(() => {
    const isGetAllProjectResponse = (data: unknown): data is GetAllProjectsResponse => {
      return typeof data === 'object' && data !== null && 'data' in data && 'meta' in data;
    };
    if (project && projectsData && isGetAllProjectResponse(projectsData)) {
      // Find the index of the current project in the collection
      const projectIndex = findItemIndexById(project._id);
      if (projectIndex !== -1) {
        setCurrentIndex(projectIndex);
      }
    }
  }, [project, projectsData, findItemIndexById, setCurrentIndex]);

  if (isProjectLoading || isProjectsLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="mt-4">No project found!</h2>
      </div>
    );
  }

  return <ProjectFormCommon projectData={project} isCreateComponent={false} />;
}

export default ProjectDetailsWrapper;
