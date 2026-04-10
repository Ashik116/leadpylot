'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { use } from 'react';
import Loading from '@/components/shared/Loading';
import { useProject } from '@/services/hooks/useProjects';
import { usePageInfoStore } from '@/stores/pageInfoStore';
 
import Card from '@/components/ui/Card';
import CommonLeadsDashboard from '../../../leads/_components/CommonLeadsDashboard';

const CloseProjectDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { data: project, isLoading: isProjectLoading } = useProject(id);
  const [isProjectOpen] = useState(true); // Always show leads directly
  const { setPageInfo, clearPageInfo } = usePageInfoStore();

  // Set default title immediately to prevent showing ID
  useEffect(() => {
    setPageInfo({
      title: 'Close Project',
    });

    return () => {
      clearPageInfo();
    };
  }, [setPageInfo, clearPageInfo]);

  // Update title when project data loads
  useEffect(() => {
    if (project && !isProjectLoading) {
      const projectName =
        typeof project.name === 'string' ? project.name : project.name?.en_US || 'Project';
      setPageInfo({
        title: `Close Project: ${projectName}`,
      });
    }
  }, [project, isProjectLoading, setPageInfo]);

  useEffect(() => {
    // Redirect Agents away from close project details page
    if (session?.user?.role === 'Agent') {
      router.push('/dashboards/projects/close-projects');
    }
  }, [session, router]);

  if (isProjectLoading) {
    return <Loading className="absolute inset-0" loading={true} />;
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Card>
          <div className="p-6">
            <h2 className="mt-4">No project found!</h2>
          </div>
        </Card>
      </div>
    );
  }

  // Get project name
  const projectName =
    typeof project.name === 'string' ? project.name : project.name?.en_US || 'Project';

  return (
    <div className="w-full">
      <CommonLeadsDashboard
        pageTitle={`Close Project: ${projectName}`}
        tableName="close_project_leads"
        setIsProjectOpen={() => {}} // Not used since we always show leads
        isProjectOpen={isProjectOpen}
        projectNameFromDetailsPage={projectName}
        externalProjectId={id}
        projectData={project}
        hideGroupBy={false}
        hideProjectOption={true}
        closeProjectId={id}
      />
    </div>
  );
};

export default CloseProjectDetailsPage;

