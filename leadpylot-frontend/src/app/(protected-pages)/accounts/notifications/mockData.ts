import { ActivityLogData, ActivityItem } from './types';

export const mockActivityLogData: ActivityLogData = {
  groups: [
    {
      date: '2024-03-06',
      label: 'Wednesday, March 6, 2024',
      items: [
        {
          id: '1',
          type: 'activity',
          title: 'Lead Status Changed',
          description: 'Lead "John Smith" status changed from "New" to "Qualified"',
          user: {

            name: 'Angelina Gotelli',
            initials: 'AG',
            role: 'Agent',
          },
          timestamp: '2024-03-06T18:00:00Z',
          category: 'lead',
          priority: 'medium',
          status: 'completed',
          metadata: {
            leadId: 'lead_123',
            oldStatus: 'New',
            newStatus: 'Qualified',
            reason: 'Initial contact successful',
          },
        },
        {
          id: '2',
          type: 'notification',
          title: 'New Email Received',
          description: 'Email from john.smith@example.com regarding investment inquiry',
          user: {

            name: 'Max Alexander',
            avatar: '/img/avatars/thumb-3.jpg',
            role: 'Agent',
          },
          timestamp: '2024-03-06T12:00:00Z',
          category: 'email',
          priority: 'high',
          status: 'pending',
          read: false,
          metadata: {
            from: 'john.smith@example.com',
            subject: 'Investment Inquiry',
            body: 'I am interested in learning more about your investment opportunities...',
          },
        },
        {
          id: '3',
          type: 'activity',
          title: 'Project Created',
          description: 'New project "Tech Startup Fund 2024" created',
          user: {

            name: 'Eugene Stewart',
            initials: 'ES',
            role: 'Admin',
          },
          timestamp: '2024-03-06T10:00:00Z',
          category: 'project',
          priority: 'medium',
          status: 'completed',
          metadata: {
            projectId: 'proj_456',
            projectName: 'Tech Startup Fund 2024',
            budget: 5000000,
            duration: '12 months',
          },
        },
      ],
    },
    {
      date: '2024-03-05',
      label: 'Tuesday, March 5, 2024',
      items: [
        {
          id: '4',
          type: 'activity',
          title: 'Offer Created',
          description: 'Investment offer created for lead "Sarah Johnson" - €250,000',
          user: {

            name: 'Angelina Gotelli',
            initials: 'AG',
            role: 'Agent',
          },
          timestamp: '2024-03-05T16:30:00Z',
          category: 'offer',
          priority: 'high',
          status: 'pending',
          metadata: {
            offerId: 'offer_789',
            leadId: 'lead_456',
            amount: 250000,
            currency: 'EUR',
            terms: '5 years, 8% annual return',
          },
        },
        {
          id: '5',
          type: 'activity',
          title: 'Agent Login',
          description: 'Agent "Mike Wilson" logged in from IP 192.168.1.100',
          user: {

            name: 'Mike Wilson',
            initials: 'MW',
            role: 'Agent',
          },
          timestamp: '2024-03-05T09:15:00Z',
          category: 'authentication',
          priority: 'low',
          status: 'completed',
          metadata: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            location: 'New York, NY',
          },
        },
      ],
    },
  ],
  totalCount: 5,
  currentPage: 1,
  totalPages: 1,
};

export const mockRealTimeActivities: ActivityItem[] = [
  {
    id: 'realtime-1',
    type: 'notification',
    title: 'Lead Assignment',
    description: 'New lead "Emma Davis" assigned to your project',
    user: {

      name: 'System',
      role: 'System',
    },
    timestamp: new Date().toISOString(),
    category: 'assignment',
    priority: 'medium',
    status: 'active',
    isRealtime: true,
    read: false,
    metadata: {
      leadId: 'lead_789',
      leadName: 'Emma Davis',
      projectId: 'proj_123',
      projectName: 'Real Estate Fund',
    },
  },
  {
    id: 'realtime-2',
    type: 'activity',
    title: 'Commission Earned',
    description: 'Commission earned from successful deal: €5,000',
    user: {

      name: 'Finance Team',
      role: 'System',
    },
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    category: 'financial',
    priority: 'high',
    status: 'completed',
    isRealtime: true,
    metadata: {
      dealId: 'deal_456',
      amount: 5000,
      currency: 'EUR',
      dealType: 'Property Investment',
    },
  },
];

export const mockActivityStats = {
  totalActivities: 25,
  readCount: 18,
  unreadCount: 7,
  liveUpdates: 3,
  byCategory: {
    lead: 8,
    email: 6,
    project: 4,
    offer: 3,
    authentication: 2,
    financial: 2,
  },
  byPriority: {
    high: 5,
    medium: 15,
    low: 5,
  },
  byStatus: {
    active: 10,
    completed: 12,
    pending: 3,
  },
};
