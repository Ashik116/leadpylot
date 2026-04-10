'use client';

import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Loading from '@/components/shared/Loading';
import ProjectDetailsWrapper from './ProjectDetailsWrapper';
import { Role } from '@/configs/navigation.config/auth.route.config';

const ProjectDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect Agents away from project details page
    if (session?.user?.role === Role.AGENT) {
      router.push('/dashboards/projects');
    }
  }, [session, router]);

  return (
    <Suspense fallback={<Loading className="min-h-[240px]" loading />}>
      <ProjectDetailsWrapper params={params} />
    </Suspense>
  );
};

export default ProjectDetailsPage;
