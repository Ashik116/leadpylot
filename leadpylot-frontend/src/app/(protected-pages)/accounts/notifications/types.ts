// Activity Log Types

export interface ActivityUser {
  id: string;
  name: string;
  initials?: string;
  avatar?: string;
  role?: string;
}

export interface ActivityStatus {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ActivityItem {
  id: string;
  type: 'activity' | 'notification';
  title: string;
  description: string;
  leadId?: string;
  offerId?: string;
  projectId?: string;
  user: {
    id?: string;
    name: string;
    avatar?: string;
    initials?: string;
    role?: string;
  };
  timestamp: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  metadata?: any;
  read?: boolean;
  isRealtime?: boolean;
}

export interface GroupedActivity {
  date: string;
  label: string;
  items: ActivityItem[];
}

export interface ActivityLogData {
  groups: GroupedActivity[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface FilterState {
  search: string;
  category: string;
  priority: string;
  status: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  showRead: boolean;
  showUnread: boolean;
}

export interface ActivityFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  subjectType?: string;
  action?: string;
  userId?: string;
  showRead?: boolean;
  showUnread?: boolean;
}

export interface ActivityStats {
  totalActivities: number;
  readCount: number;
  unreadCount: number;
  liveUpdates: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface RealTimeActivity extends ActivityItem {
  isRealtime: true;
  socketId?: string;
  eventType?: string;
  data?: any;
}
