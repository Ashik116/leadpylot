/**
 * Type definitions for TicketModal component
 */

export interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  offers?: any[];
  lead?: any; // Optional lead data to get default agent
  opening?: any; // Optional opening data to get default agent
  dashboardType?: 'offer' | 'opening' | 'lead'; // Dashboard type to determine entity ID field
  taskType?: string;
  emailId?: string; // For email task type (create-from-email)
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ValidationError {
  message: string;
}

export interface TicketFormData {
  selectedTicketTypes: string[];
  selectedAgentId: string;
  description: string;
  uploadedDocumentIds: string[];
}

export interface CreateTicketPayload {
  lead_id: string;
  message: string;
  todoTypesids: string[];
  assignto: string;
  documents_ids?: string[];
}
