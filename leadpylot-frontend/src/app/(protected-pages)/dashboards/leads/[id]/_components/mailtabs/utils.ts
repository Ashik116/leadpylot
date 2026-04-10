import { Notification } from '@/services/notifications/NotificationsService';
import { Email } from '../../emailTypes/types';
import { Role } from '@/configs/navigation.config/auth.route.config';

/**
 * Helper function to strip HTML and CSS from text
 */
export const stripHtmlAndCss = (text: string): string => {
  if (!text) return '';

  // First remove any HTML tags
  let cleanText = text.replace(/<[^>]*>/g, '');

  // Remove CSS media queries
  cleanText = cleanText.replace(/@media\s+[^{]+\{[^}]*\}/g, '');

  cleanText = cleanText.replace(
    /\.[a-zA-Z][a-zA-Z0-9-_]*\s+[a-zA-Z][a-zA-Z0-9-_]*\s*\{[^}]*\}/g,
    ''
  );

  cleanText = cleanText.replace(/\.[a-zA-Z][a-zA-Z0-9-_]*\s*\{[^}]*\}/g, '');

  cleanText = cleanText.replace(/\{[^}]*\}/g, '');

  cleanText = cleanText.replace(/\.[a-zA-Z][a-zA-Z0-9-_]*/g, '');

  cleanText = cleanText.replace(/@[a-zA-Z][a-zA-Z0-9-_]*/g, '');

  cleanText = cleanText.replace(/[{}]/g, '');

  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return cleanText;
};

/**
 * Truncate content to a reasonable length while preserving readability
 */
export const truncateContent = (content: string, charLimit = 150): string => {
  if (!content) return '';

  // Remove any extra spaces and normalize whitespace
  const normalizedContent = content.replace(/\s+/g, ' ').trim();

  // If the content is already shorter than the limit, return it as is
  if (normalizedContent.length <= charLimit) {
    return normalizedContent;
  }

  // Find a good breaking point (preferably at a space) near the character limit
  let breakPoint = charLimit;
  while (breakPoint > 0 && normalizedContent[breakPoint] !== ' ') {
    breakPoint--;
  }

  // If we couldn't find a space, just break at the character limit
  if (breakPoint === 0) {
    breakPoint = charLimit;
  }

  return normalizedContent.substring(0, breakPoint) + '...';
};

/**
 * Map notifications to email format for display
 */
/**
 * Check if file is an image based on file extension
 */
export const isImageFile = (fileName: string): boolean => {
  if (!fileName) return false;
  const lowerFileName = fileName.toLowerCase();
  return (
    lowerFileName.endsWith('.jpg') ||
    lowerFileName.endsWith('.jpeg') ||
    lowerFileName.endsWith('.png') ||
    lowerFileName.endsWith('.gif') ||
    lowerFileName.endsWith('.webp')
  );
};

/**
 * Check if file is a PDF based on file extension
 */
export const isPdfFile = (fileName: string): boolean => {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith('.pdf');
};

/**
 * Check if file is a text file based on file extension
 */
export const isTextFile = (fileName: string): boolean => {
  if (!fileName) return false;
  const lowerFileName = fileName.toLowerCase();
  return (
    lowerFileName.endsWith('.txt') ||
    lowerFileName.endsWith('.md') ||
    lowerFileName.endsWith('.csv') ||
    lowerFileName.endsWith('.json') ||
    lowerFileName.endsWith('.xml') ||
    lowerFileName.endsWith('.html') ||
    lowerFileName.endsWith('.css') ||
    lowerFileName.endsWith('.js')
  );
};

/**
 * Get file type icon name based on file extension
 */
export const getFileIconName = (fileName: string): string => {
  if (!fileName) return 'file';

  const lowerFileName = fileName.toLowerCase();

  if (isImageFile(lowerFileName)) return 'image';
  if (isPdfFile(lowerFileName)) return 'file-pdf';
  if (lowerFileName.endsWith('.doc') || lowerFileName.endsWith('.docx')) return 'file-word';
  if (lowerFileName.endsWith('.xls') || lowerFileName.endsWith('.xlsx')) return 'file-excel';
  if (lowerFileName.endsWith('.ppt') || lowerFileName.endsWith('.pptx')) return 'file-powerpoint';
  if (isTextFile(lowerFileName)) return 'file-text';
  if (lowerFileName.endsWith('.zip') || lowerFileName.endsWith('.rar')) return 'file-archive';

  return 'file';
};
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';

  // Remove all <style> tags and their content
  let sanitized = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove all <script> tags and their content
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove all style attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

  // Remove all class attributes that might conflict
  sanitized = sanitized.replace(/\s*class\s*=\s*["'][^"']*["']/gi, '');

  // Remove all id attributes that might conflict
  sanitized = sanitized.replace(/\s*id\s*=\s*["'][^"']*["']/gi, '');

  // Remove all CSS properties that might affect global styling
  sanitized = sanitized.replace(/\s*background\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*color\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*font-family\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*font-size\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*margin\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*padding\s*:\s*[^;]+;?/gi, '');

  // Remove any remaining CSS properties that might be problematic
  sanitized = sanitized.replace(/\s*position\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*z-index\s*:\s*[^;]+;?/gi, '');
  sanitized = sanitized.replace(/\s*overflow\s*:\s*[^;]+;?/gi, '');

  // Clean up any empty style attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*["']\s*["']/gi, '');

  // Remove any remaining empty attributes
  sanitized = sanitized.replace(/\s*=\s*["']\s*["']/gi, '');

  return sanitized;
};

export const mapNotificationsToEmails = (
  notificationsResponse: { data: Notification[] } | undefined,
  leadContactMap: Record<string, string>,
  session: any
): Email[] => {
  return (
    notificationsResponse?.data.map((notification: Notification) => {
      // Extract email from the from field
      const fromEmailMatch = notification?.metadata?.from?.match(/<([^>]+)>/);
      const fromEmail = fromEmailMatch
        ? fromEmailMatch[1].toLowerCase()
        : notification?.metadata?.from_address?.toLowerCase();

      const matchedLeadName = leadContactMap[fromEmail];

      // Find agent alias_name if there's a match between agent_id and agent._id in project's agents array
      let agent_alias_name = null;
      if (notification?.info?.project_id?.agents && notification?.info?.agent_id) {
        // Handle the case where agent_id is a string
        const agentIdToMatch =
          typeof notification?.info?.agent_id === 'string'
            ? notification?.info?.agent_id
            : notification?.info?.agent_id?._id;

        const matchedAgent = notification?.info?.project_id?.agents.find(
          (agent) => agent._id === agentIdToMatch
        );

        if (matchedAgent) {
          agent_alias_name = matchedAgent.alias_name;
        }
      }

      return {
        id: notification._id,
        subject: stripHtmlAndCss(notification?.metadata?.subject),
        from: notification?.metadata?.from?.replace(/"/g, '').split('<')[0].trim(),
        fromEmail: notification?.metadata?.from_address,
        date: {
          dateStr: notification?.created_at
            ? new Date(notification.created_at).toString() !== 'Invalid Date'
              ? new Date(notification.created_at).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
              : 'Date not available'
            : 'Date not available',
          timeStr: notification?.created_at
            ? new Date(notification.created_at).toString() !== 'Invalid Date'
              ? new Date(notification.created_at).toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })
              : ''
            : '',
        },
        content: stripHtmlAndCss(notification.metadata.body).substring(0, 100),
        body: notification.metadata.body,
        starred: false,
        attachments: notification.metadata.attachments.map((attachment) => ({
          name: attachment.filename || 'Attachment',
          size: attachment.size || '0KB',
          icon: getFileIconName(attachment.filename || ''),
          documentId: attachment.documentId || null,
        })),
        matchedLeadName,
        project_name: notification.info.project_id?.name || '(No Project)',
        project_id: notification.info.project_id?._id || null,
        agent_login:
          typeof notification.info.agent_id === 'object' ? notification.info.agent_id?.login : null,
        agent_alias_name,
        lead_id: notification.info.lead_id?._id || null,
        lead_contact_name: notification.info.lead_id?.contact_name || null,
        isAgent: session?.user?.role === 'Agent',
        direction: notification.inbox || 'outgoing',
      };
    }) || []
  );
};

/**
 * Map new email system data to email format for display
 */
export const mapEmailSystemToEmails = (emailSystemResponse: any, session: any): Email[] => {
  // Handle both list response format {emails: [...]} and single email format {data: [...]}
  const emailsArray = emailSystemResponse?.emails || emailSystemResponse?.data || [];
  return (
    emailsArray?.map((email: any) => {
      return {
        id: email._id,
        _id: email._id,
        subject: (email.subject || '(No Subject)').replace(/^"(.*)"$/, '$1'),
        from: email.from_address,
        fromEmail: email.from_address,
        to: email.to,
        date: {
          dateStr:
            email.received_at || email.createdAt
              ? new Date(email.received_at || email.createdAt).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
              : 'Date not available',
          timeStr:
            email.received_at || email.createdAt
              ? new Date(email.received_at || email.createdAt).toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })
              : '',
        },
        content: stripHtmlAndCss(email.body || email.html_body || '').substring(0, 100),
        body: email.html_body || email.body,
        starred: false,
        attachments:
          email.attachments?.map((attachment: any) => ({
            name: attachment.filename || 'Attachment',
            size: attachment.size ? `${Math.round(attachment.size / 1024)}KB` : '0KB',
            icon: getFileIconName(attachment.filename || ''),

            documentId: attachment.document_id || attachment._id || null,
          })) || [],
        project_name: email.project_id?.name || '(No Project)',
        project_id:
          email.project_id?._id || (typeof email.project_id === 'string' ? email.project_id : null),
        agent_login: email.assigned_to || null,
        agent_alias_name: email.assigned_to || null,
        agent_viewed: email.agent_viewed || false,
        admin_viewed: email.admin_viewed || false,
        lead_id: email.lead_id || null,
        lead_contact_name: null, // Will be populated from lead data
        isAgent: session?.user?.role === Role.AGENT,
        isAdmin: session?.user?.role === Role.ADMIN,
        direction: email.direction || 'incoming', // Use actual direction from email data
        // Add email system specific fields
        approval_status: email.email_approved,
        attachment_approval_status: email.attachment_approved ? 'approved' : 'pending',
        is_new_system: true, // Flag to identify new system emails
        // Add intelligence fields
        spam_score: email.is_spam ? 1 : 0,
        sentiment: email.sentiment as 'positive' | 'negative' | 'neutral' | undefined,
        sentiment_score: email.sentiment_score || 0,
        topics: email.topics || [],
        priority: email.priority as 'low' | 'medium' | 'high' | undefined,
        category: email.category as
          | 'inquiry'
          | 'complaint'
          | 'follow_up'
          | 'support'
          | 'sales'
          | 'other'
          | undefined,
        intelligence_metadata: {
          analyzedAt: email.createdAt,
          processingTime: undefined,
          confidence: undefined,
          wordCount: undefined,
        },
        lead_matching: {
          confidence: email.lead_id ? 0.9 : 0.1,
          method: email.matched_by || 'auto',
          suggestions: {
            createNew: !email.lead_id,
            assignTo: email.lead_id,
            reasons: email.assignment_reason ? [email.assignment_reason] : [],
            extractedInfo: {
              name: undefined,
            },
          },
        },
        replies: email.replies || [],
        reply_count: email?.conversation?.reply_count || email?.reply_count || 0,
        security: {
          scanResults: {
            safe: !email.is_spam && email.spam_indicators?.length === 0,
            threats:
              email.spam_indicators?.map((indicator: string) => ({
                type: 'Spam Indicator',
                description: indicator,
                severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
              })) || [],
            riskLevel: email.is_spam
              ? ('medium' as 'low' | 'medium' | 'high' | 'critical')
              : ('low' as 'low' | 'medium' | 'high' | 'critical'),
          },
        },
      };
    }) || []
  );
};
