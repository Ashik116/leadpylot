export interface EmailTemplate {
  _id: string;
  slug: string;
  name: string;
  template: string;
  locked: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// Sample data for email templates
export const sampleEmailTemplates: EmailTemplate[] = [
  {
    _id: '1',
    slug: 'reclamation-acknowledgment',
    name: 'Reclamation Acknowledgment',
    template:
      'Hello {user.name},\n\nWe have recieved your Reclemation about {lead.name}, we will review it and yo uwill get a mesage\n\nThank You,\nKeshra',
    locked: true,
    createdAt: '2023-05-15T10:30:00Z',
    updatedAt: '2023-05-15T10:30:00Z',
    deletedAt: null,
  },
  {
    _id: '2',
    slug: 'welcome-email',
    name: 'Welcome Email',
    template:
      'Welcome {user.name},\n\nThank you for signing up with us. We are excited to have you on board!',
    locked: false,
    createdAt: '2023-06-20T14:22:00Z',
    updatedAt: '2023-06-20T14:22:00Z',
    deletedAt: null,
  },
  {
    _id: '3',
    slug: 'password-reset',
    name: 'Password Reset',
    template:
      'Hello {user.name},\n\nWe received a request to reset your password. Click the link below to reset your password:\n\n{reset_link}',
    locked: true,
    createdAt: '2023-05-10T09:15:00Z',
    updatedAt: '2023-05-10T09:15:00Z',
    deletedAt: null,
  },
];
