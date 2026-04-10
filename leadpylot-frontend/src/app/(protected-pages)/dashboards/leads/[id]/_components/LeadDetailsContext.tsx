'use client';

import { createContext, useContext, ReactNode } from 'react';
import { TLead } from '@/services/LeadsService';

export interface LeadDetailsContextValue {
  lead: TLead;
  leadId: string | number;
  projectId: string;
  agentId: string;
  showInDialog?: boolean;
  highlightedOfferId?: string;
  highlightedOpeningId?: string;
  highlightedEmailId?: string;
  forceEmailTab?: boolean;
  initialSelectedOpeningId?: string;
  defaultActiveTab?: 'offers' | 'openings';
  taskTypeFromDialog?: string;
  offerIdFromDialog?: string;
  openingIdFromDialog?: string;
  handleAddOpeningClick?: () => void;
  onOfferClick?: () => void;
  onEditOffer?: (offer: any) => void;
  onReclamationClick?: () => void;
  onMeetingClick?: (meeting: any) => void;
  onDelete?: () => void;
}

const LeadDetailsContext = createContext<LeadDetailsContextValue | null>(null);

interface LeadDetailsProviderProps {
  children: ReactNode;
  value: LeadDetailsContextValue;
}

export function LeadDetailsProvider({ children, value }: LeadDetailsProviderProps) {
  return (
    <LeadDetailsContext.Provider value={value}>{children}</LeadDetailsContext.Provider>
  );
}

export function useLeadDetailsContext(): LeadDetailsContextValue {
  const ctx = useContext(LeadDetailsContext);
  if (!ctx) {
    throw new Error('useLeadDetailsContext must be used within LeadDetailsProvider');
  }
  return ctx;
}

/** Returns null when used outside LeadDetailsProvider. Use for components that support both contexts. */
export function useLeadDetailsContextOptional(): LeadDetailsContextValue | null {
  return useContext(LeadDetailsContext);
}
