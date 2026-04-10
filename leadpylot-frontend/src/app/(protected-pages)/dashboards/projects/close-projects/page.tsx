import { PageProps } from '@/@types/common';
import ProjectsWrapperRefactored from '../ProjectsWrapperRefactored';

export default async function CloseProjectsPage({ searchParams }: PageProps) {
  const searchParamsData = await searchParams;

  return <ProjectsWrapperRefactored searchParams={searchParamsData} />;
}

