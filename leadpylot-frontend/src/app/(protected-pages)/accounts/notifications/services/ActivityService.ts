import { apiGetActivities } from '@/services/ActivitiesService';
import { apiGetNotifications } from '@/services/notifications/NotificationsService';
import { ActivityItem, GroupedActivity } from '../types';
import { mapActivityCategory, mapNotificationCategory, getDateRangeStartDate } from '../utils';
import { format, parseISO } from 'date-fns';

export class ActivityService {
  /**
   * Load activities and notifications from API
   */
  static async loadData(
    currentPage: number,
    startDate?: string,
    endDate?: string
  ): Promise<ActivityItem[]> {
    try {
      // Load activities
      const activitiesResponse = await apiGetActivities({
        page: currentPage,
        limit: 10000,
        startDate,
        endDate,
      });

      // Load notifications
      const notificationsResponse = await apiGetNotifications({
        page: currentPage,
        limit: 10000,
      });

      // Transform activities
      //eslint-disable-next-line
      const transformedActivities = activitiesResponse.data.map((activity: any) => ({
        id: activity._id,
        type: 'activity' as const,
        title: `${activity.action} ${activity.subject_type}`,
        description: activity.message,
        user: {
          name: activity.creator?.login || 'Unknown User',
          role: 'User',
        },
        leadId: activity.info?.lead_id?._id || activity.metadata?.leadId,
        offerId: activity.external_id?.split('_')?.[2] || activity.metadata?.offerId,
        timestamp: activity.createdAt,
        category: mapActivityCategory(activity.subject_type),
        priority: 'medium' as const,
        status: 'active',
        metadata: activity.metadata,
      }));

      // Transform notifications – prefer metadata (body, title, creatorName, agentName) when present
      const transformedNotifications = notificationsResponse.data.map((notification: any) => {
        const meta = notification.metadata || {};
        const data = notification.data || {};
        // Creator/actor: metadata first, then data.creator/assigner
        // For Agent Login notifications, check data.agent first
        // For Task Moved (todo_updated), check data.movedBy, data.updater, data.updatedBy
        // Make sure we get the actual name/login, not the role
        let userName =
          // For agent_login type, check data.agent first
          (notification.type === 'agent_login' && (data.agent?.name || data.agent?.login)) ||
          // For todo_updated/task moved, check movedBy, updater, updatedBy
          (notification.type === 'todo_updated' && (
            data.movedBy?.name ||
            data.movedBy?.login ||
            data.updater?.name ||
            data.updater?.login ||
            data.updatedBy?.name ||
            data.updatedBy?.login
          )) ||
          // Check metadata updater fields
          (meta.updater?.name && meta.updater.name.trim()) ||
          (meta.updater?.login && meta.updater.login.trim()) ||
          (meta.updatedBy?.name && meta.updatedBy.name.trim()) ||
          (meta.updatedBy?.login && meta.updatedBy.login.trim()) ||
          (meta.movedBy?.name && meta.movedBy.name.trim()) ||
          (meta.movedBy?.login && meta.movedBy.login.trim()) ||
          (meta.agentName && meta.agentName.trim()) ||
          (meta.agentLogin && meta.agentLogin.trim()) ||
          (meta.creatorName && meta.creatorName.trim()) ||
          (meta.creatorLogin && meta.creatorLogin.trim()) ||
          meta.from ||
          data.creator?.name ||
          data.creator?.login ||
          data.assigner?.name ||
          data.assigner?.login ||
          (typeof notification.info?.agent_id === 'object' && notification.info.agent_id?.login) ||
          'System';
        
        // Get description early to extract name from it if needed
        let description = (meta.body && meta.body.trim()) || notification.message || '';
        
        // Try to extract name from description/body if not found or if userName is a role
        const roleNames = ['Admin', 'Agent', 'User', 'System'];
        if (!userName || userName === 'System' || roleNames.includes(userName)) {
          // Match patterns like "itadmin assigned", "peter assigned", etc.
          let nameMatch = description.match(/^(\w+)\s+(assigned|created|updated|deleted|moved)/i);
          
          // Also match "Agent {name} has logged in" pattern for login notifications
          if (!nameMatch && notification.type === 'agent_login') {
            nameMatch = description.match(/Agent\s+(\w+)\s+has\s+logged\s+in/i);
          }
          
          // For task moved, try to extract from "Task moved by {name}" or similar patterns
          if (!nameMatch && (notification.type === 'todo_updated' || description.toLowerCase().includes('transferred'))) {
            // Match patterns like "Task moved by {name}" or extract from transfer messages
            nameMatch = description.match(/(?:moved|transferred)\s+by\s+(\w+)/i) ||
                       description.match(/^(\w+)\s+(?:moved|transferred)/i);
          }
          
          if (nameMatch && nameMatch[1] && !roleNames.includes(nameMatch[1])) {
            userName = nameMatch[1];
          } else if (roleNames.includes(userName)) {
            // If userName is a role, try to get from other sources
            // For todo_updated, prioritize movedBy/updater
            if (notification.type === 'todo_updated') {
              if (data.movedBy?.name || data.movedBy?.login) {
                userName = data.movedBy.name || data.movedBy.login;
              } else if (data.updater?.name || data.updater?.login) {
                userName = data.updater.name || data.updater.login;
              } else if (data.updatedBy?.name || data.updatedBy?.login) {
                userName = data.updatedBy.name || data.updatedBy.login;
              } else if (meta.updater?.login) {
                userName = meta.updater.login;
              } else if (meta.movedBy?.login) {
                userName = meta.movedBy.login;
              }
            }
            // For agent_login
            if (userName === 'System' && notification.type === 'agent_login' && data.agent?.login) {
              userName = data.agent.login;
            }
            // General fallbacks
            if (userName === 'System' || roleNames.includes(userName)) {
              if (meta.creatorLogin) {
                userName = meta.creatorLogin;
              } else if (meta.agentLogin) {
                userName = meta.agentLogin;
              }
            }
          }
        }
        
        // Role should never be used as name - ensure we have a valid name
        const userRole =
          meta.targetRole ||
          data.creator?.role ||
          data.assigner?.role ||
          (userName === 'System' ? 'System' : 'User');
        
        // Final check: if userName is still a role, use it but log a warning
        const finalUserName = roleNames.includes(userName) && meta.creatorLogin
          ? meta.creatorLogin
          : userName;
        
        // Assignee/agent: data.assignee (todo) or metadata.agentName (lead assignment, etc.)
        const assigneeName =
          data.assignee?.name ||
          data.assignee?.login ||
          (meta.agentName && meta.agentName.trim()) ||
          meta.agentLogin;
        if (assigneeName && /\sassigned\s+you(\s*:)?/i.test(description)) {
          description = description.replace(/\sassigned\s+you(\s*:)?/gi, ` assigned ${assigneeName}$1`);
        }
        
        // Use description (may have been modified above) or fallback
        const finalDescription = description || 'No description available';
        // Prefer metadata title/subject over root title
        const title =
          (meta.title && meta.title.trim()) ||
          (meta.subject && meta.subject.trim()) ||
          notification.title ||
          'New Notification';
        return {
          id: notification._id,
          type: 'notification' as const,
          leadId: notification.info?.lead_id?._id || meta.leadId,
          offerId: notification.external_id?.split('_')?.[2] || meta.offerId,
          projectId: notification.info?.project_id?._id,
          title,
          description: finalDescription,
          user: {
            name: finalUserName,
            role: userRole,
          },
          timestamp: notification.created_at,
          category: (() => {
            // Use notification.category if available, but map 'monitoring' to 'lead' for lead assignments
            if (notification.category && notification.category.trim()) {
              const backendCategory = notification.category.trim();
              // Map backend 'monitoring' category to 'lead' for lead assignment notifications
              if (backendCategory === 'monitoring' && notification.type === 'lead_assignment_admin') {
                return 'lead';
              }
              return backendCategory;
            }
            return mapNotificationCategory(notification.type);
          })(),
          priority: (notification.priority || meta.priority || 'medium') as 'low' | 'medium' | 'high',
          status: notification.read ? 'completed' : 'pending',
          metadata: notification.metadata,
          read: notification.read,
        };
      });

      // Combine and sort by timestamp
      return [...transformedNotifications].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to load activity data:', error);
      }
      return [];
    }
  }

  /**
   * Transform real-time notifications to activity items
   */
  static transformRealtimeNotifications(realtimeNotifications: any[]): ActivityItem[] {
    return realtimeNotifications.slice(0, 5).map((notification: any) => ({
      id: `realtime-${notification.id}`,
      type: 'notification' as const,
      title: notification.title || 'Real-time Update',
      description: notification.message,
      user: {
        name: notification.data?.creator?.name || notification.data?.from || 'System',
        role: 'System',
      },
      timestamp: notification.timestamp,
      category: mapNotificationCategory(notification.type || notification.category),
      priority: notification.priority || 'medium',
      status: 'active',
      metadata: notification.data,
      isRealtime: true,
    }));
  }

  /**
   * Group activities by date
   */
  static groupActivitiesByDate(activities: ActivityItem[]): GroupedActivity[] {
    const groups: Record<string, ActivityItem[]> = {};

    activities.forEach((activity) => {
      const date = format(parseISO(activity.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        label: format(parseISO(date), 'EEEE, MMMM d, yyyy'),
        items: items.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      }));
  }

  /**
   * Filter activities based on filter criteria
   */
  static filterActivities(activities: ActivityItem[], filters: any): ActivityItem[] {
    return activities.filter((activity) => {
      // Search filter
      if (
        filters.search &&
        !activity.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !activity.description.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && activity.category !== filters.category) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && activity.priority !== filters.priority) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && activity.status !== filters.status) {
        return false;
      }

      // Read/Unread filter
      if (activity.read !== undefined) {
        if (filters.showRead && !filters.showUnread) return activity.read;
        if (!filters.showRead && filters.showUnread) return !activity.read;
      }

      return true;
    });
  }

  /**
   * Get date range start date based on filter
   */
  static getDateRangeStartDate(range: string): string | undefined {
    return getDateRangeStartDate(range);
  }
}
