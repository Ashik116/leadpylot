// import { Metadata } from 'next';

// Simple route to title mapping
const routeTitles: Record<string, string> = {
  // Dashboard routes
  '/dashboards/home': 'Dashboard',
  '/dashboards/mails': 'Mails',
  '/dashboards/calls': 'Calls',
  '/dashboards/leads': 'All Leads',
  '/dashboards/leads/archived': 'Archived Leads',
  '/dashboards/leads/projects': 'Lead Projects',
  '/dashboards/leads/pending-leads': 'Pending Leads',
  '/dashboards/live-leads': 'Live',
  '/dashboards/scheduled-leads': 'Scheduled Leads',
  '/dashboards/recycle-leads': 'Recycle',
  '/dashboards/todo': 'Todo',
  '/dashboards/documents': 'Documents',
  '/dashboards/projects': 'Projects',
  '/dashboards/projects/create': 'Create Project',
  '/dashboards/reclamations': 'Reclamations',
  '/dashboards/reclamations/pending-reclamations': 'Pending Reclamations',
  '/dashboards/openings': 'Openings',
  '/dashboards/confirmation': 'Confirmation',
  '/dashboards/payment': 'Payment',
  '/dashboards/netto': 'Netto',
  '/dashboards/offers': 'Offers',
  '/dashboards/out-offers': 'Out Offers',
  '/dashboards/accepted-offers': 'Accepted Offers',
  '/dashboards/payment-vouchers': 'Payment Vouchers',
  '/dashboards/holds': 'Hold Leads',

  // Admin routes
  '/admin/users': 'Users',
  '/admin/import-leads': 'Import Leads',
  '/admin/stages': 'Stages Management',
  '/admin/pdf': 'PDF Templates',
  '/admin/recent-imports': 'Recent Imports',
  '/admin/settings': 'Bot Setting',
  '/admin/voip-servers': 'Voip Servers',
  '/admin/banks': 'Banks Management',
  '/admin/mailservers': 'Mail Servers',
  '/admin/payment-terms': 'Payment Terms',
  '/admin/users/create': 'Create User',
  '/admin/sources': 'Sources',
  '/admin/bonus-amount': 'Bonus Amount',
  '/admin/email-templates': 'Email Templates',
  '/admin/auth-settings': 'Auth Settings',
  '/admin/agent-call-management': 'Agent Call Management',
  '/admin/email-system': 'Email System',
  '/admin/advanced-settings': 'Advanced Settings',
  '/admin/maintenance': 'Maintenance',
  '/admin/api-keys': 'API Keys',
  '/admin/logs': 'System Logs',
  '/admin/security': 'Security Center',

  // Other routes
  '/access-denied': 'Access Denied',
  '/profile': 'Profile',
};

/**
 * Get page title from route path
 */
export function getPageTitle(pathname: string): string {
  const cleanPath = pathname.split('?')[0].split('#')[0];

  // Check exact matches first
  if (routeTitles[cleanPath]) {
    return routeTitles[cleanPath];
  }

  // Handle dynamic routes
  if (cleanPath.match(/^\/dashboards\/leads\/[^\/]+$/)) {
    return 'Lead Details';
  }

  if (cleanPath.match(/^\/dashboards\/projects\/[^\/]+$/)) {
    return 'Project Details';
  }
  if (cleanPath.match(/^\/dashboards\/holds\/[^\/]+$/)) {
    return 'Hold Details';
  }
  if (cleanPath.match(/^\/admin\/users\/[^\/]+$/)) {
    return 'User';
  }

  // Default fallback
  return 'Lead Management System';
}
