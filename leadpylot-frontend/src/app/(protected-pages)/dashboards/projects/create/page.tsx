'use client';

import ProjectCreateWrapper from './ProjectCreateWrapper';
import { usePathname } from 'next/navigation';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';

const ProjectCreatePage = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  return <ProjectCreateWrapper />;
};
export default ProjectCreatePage;
