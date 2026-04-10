interface Lead {
  _id: string;
  lead: {
    _id: string;
    contact_name: string;
    email_from: string;
    phone?: string;
    expected_revenue: number;
    [key: string]: any;
  };
  assignment: {
    agent: {
      _id: string;
      login: string;
      role: string;
    };
    assignedAt: string;
    assignedBy: string;
    notes: string;
  };
}

interface Project {
  projectId: string;
  projectName: string;
  totalAgents: number;
  leads: Lead[];
  offers: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
    details: any[];
  };
  totalLeads: number;
}

interface ProjectTableData {
  _id: string;
  projectName: string;
  totalOffers: number;
  totalAgents: number;
  totalLeads: number;
  leads: Lead[];
}

export type { Project, ProjectTableData, Lead };
