import { Metadata } from 'next';
import { getPageTitle } from '@/utils/dynamicMetadata';

const pageMeta: Metadata = {
  title: 'Lead Pylot',
  description: 'A platform for managing leads and offers',
  icons: {
    icon: '/favicon.ico',
  },
};

// Dynamic metadata generator function
export function generateDynamicMeta(pathname?: string): Metadata {
  const title = pathname ? `${getPageTitle(pathname)} | ePortaL` : 'Lead Pylot';

  return {
    ...pageMeta,
    title,
    description: 'Lead Management System',
  };
}

// Route-specific metadata templates
export const routeMetaTemplates = {
  // Add more as needed
};

// Generate metadata from route
export function getRouteMetadata(pathname: string): Metadata {
  const routeMeta = routeMetaTemplates[pathname as keyof typeof routeMetaTemplates];

  if (routeMeta) {
    return {
      ...pageMeta,
    };
  }

  return generateDynamicMeta(pathname);
}

export default pageMeta;
