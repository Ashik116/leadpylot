import { TLead } from "@/services/LeadsService";

export interface Reply {
  [x: string]: any;
  _id?: string;
  from: string;
  to?: string;
  date: string;
  content: string;
  html?: string;
}

export interface Email {
  _id?: string;
  id: string;
  subject: string;
  from: string;
  to?: string;
  fromEmail: string;
  date: {
    dateStr: string;
    timeStr: string;
  };
  content: string;
  starred: boolean;
  body?: string;
  label?: string;
  preview?: string;
  replies?: Reply[];
  reply_count?: number;
  matchedLeadName?: string;
  project_name?: string;
  project_id?: string | null;
  agent_login?: string | null;
  agent_alias_name?: string | null;
  lead_id?: string | null | TLead;
  lead_contact_name?: string | null;
  isAgent?: boolean;
  direction?: string;
  attachments?: any[];
  agent_viewed?: boolean;
  admin_viewed?: boolean;
  // New email system fields
  approval_status?: 'pending' | 'approved' | 'rejected';
  attachment_approval_status?: 'pending' | 'approved' | 'rejected';
  is_new_system?: boolean;

  // ✨ NEW: Email Intelligence Fields
  spam_score?: number;
  spam_indicators?: string[];
  is_spam?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentiment_score?: number;
  topics?: string[];
  priority?: 'low' | 'medium' | 'high';
  category?: 'inquiry' | 'complaint' | 'follow_up' | 'support' | 'sales' | 'other';

  // ✨ NEW: Intelligence Metadata
  intelligence_metadata?: {
    analyzedAt?: string;
    processingTime?: number;
    confidence?: number;
    wordCount?: number;
  };

  // ✨ NEW: Lead Matching Intelligence
  lead_matching?: {
    confidence?: number;
    method?: string;
    suggestions?: {
      createNew?: boolean;
      assignTo?: any;
      reasons?: string[];
      extractedInfo?: {
        email?: string;
        name?: string;
        company?: string;
        phones?: string[];
      };
    };
    matchingMetadata?: {
      totalMatches?: number;
      allMatches?: Array<{
        leadId: string;
        leadName: string;
        confidence: number;
        method: string;
        reasons: string[];
      }>;
    };
  };

  // ✨ NEW: Security Information
  security?: {
    scanResults?: {
      safe?: boolean;
      threats?: Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    };
    thumbnails?: {
      [attachmentId: string]: {
        path: string;
        width: number;
        height: number;
      };
    };
  };
}
