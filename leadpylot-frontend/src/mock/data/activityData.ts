export type Activity = {
  id: string;
  type: 'meeting_scheduled' | 'stage_changed' | 'lead_created' | 'lead_assigned' | 'lead_updated';
  actor: string;
  timestamp: string;
  date: string;
  details?: {
    subject?: string;
    duration?: string;
    oldStage?: string;
    newStage?: string;
    lead?: any;
    agent?: any;
    project?: any;
    agentName?: string;
    projectName?: string;
  };
};

export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'meeting_scheduled',
    actor: 'Administrator',
    timestamp: '1 hour ago',
    date: 'Today',
    details: {
      subject: 'Walter Ferber',
      duration: '1 hour',
    },
  },
  {
    id: '2',
    type: 'stage_changed',
    actor: 'Administrator',
    timestamp: '3 days ago',
    date: 'May 6, 2025',
    details: {
      oldStage: 'New',
      newStage: 'Negativ',
    },
  },
  {
    id: '3',
    type: 'lead_created',
    actor: 'Administrator',
    timestamp: '10 days ago',
    date: 'April 30, 2025',
  },
];
