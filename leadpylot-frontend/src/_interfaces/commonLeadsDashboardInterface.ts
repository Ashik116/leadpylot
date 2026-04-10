import { Lead } from '@/services/LeadsService';
import { TTodoFilter } from '@/app/(protected-pages)/dashboards/todo/_components/TodoDashboard';

export interface LeadsDashboardProps {
  data?: Lead[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPaginationChange?: React.Dispatch<React.SetStateAction<number>>;
  setIsProjectOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  isProjectOpen?: boolean;
  onPageSizeChange?: React.Dispatch<React.SetStateAction<number>>;
  pendingLeadsComponent?: boolean;
  pageTitle?: string;
  recentImport?: boolean;
  tableName?: string; // Add tableName support
  projectNameFromDetailsPage?: string;
  externalProjectId?: string;
  // Project data for default filters
  projectData?: any; // Project details data for default filters
  // Project navigation props
  getCurrentPosition?: () => number;
  totalProjects?: number;
  goToPreviousProject?: () => void;
  goToNextProject?: () => void;
  sharedDataTable?: boolean;
  // Control agent role-based hiding of actions
  hideActionsForAgent?: boolean;
  // Optional Todo scope for grouped filters on Todo dashboard
  todoFilterScope?: TTodoFilter;
  // NEW: Todo statistics for subtitle rendering on Todo dashboard
  todoStatistics?: { pendingCount?: number; completedCount?: number; totalCount?: number };
  // NEW: Optional static prefix to use for header subtitle (e.g., "All Archived")
  pageInfoSubtitlePrefix?: string;
  extraActions?: React.ReactNode;
  deleteButton?: boolean;
  // NEW: Optional action-area component (renders beside Actions button inside CommonActionBar)
  filterBtnComponent?: React.ReactNode;
  // NEW: Hide group by functionality (for project details page)
  hideGroupBy?: boolean;
  // NEW: Hide project option from group by filters
  hideProjectOption?: boolean;
}
