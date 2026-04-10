/**
 * Notification Message Formatter
 * 
 * Extracts and formats notification messages for compact table display.
 * Formats primary message, subtext (actor/entity), and entity links.
 */

import { NotificationData } from '@/stores/notificationStore';
import { getNotificationConfig, buildNavigationUrl } from '@/configs/notification.config';

export interface FormattedNotificationMessage {
  primary: string;
  subtext: string;
  /** Actor/agent name extracted separately so the row can render it with user color */
  actorName?: string;
  entityLink?: {
    text: string;
    href: string;
    type: 'ticket' | 'lead' | 'project' | 'offer';
  };
}

/**
 * Extract actor name from notification data.
 * For todo_updated, API sends actor in data.updater (task updated) or data.movedBy (task moved).
 */
function extractActor(notification: NotificationData): string {
  return (
    notification.target ||
    notification.metadata?.actor ||
    notification.metadata?.creatorName ||
    notification.metadata?.creatorLogin ||
    notification.metadata?.assignerLogin ||
    notification.metadata?.fromAgent ||
    notification.metadata?.updater?.name ||
    notification.metadata?.updater?.login ||
    notification.metadata?.updatedBy?.name ||
    notification.metadata?.updatedBy?.login ||
    (notification.data as any)?.updater?.name ||
    (notification.data as any)?.updater?.login ||
    (notification.data as any)?.updatedBy?.name ||
    (notification.data as any)?.updatedBy?.login ||
    (notification.data as any)?.movedBy?.name ||
    (notification.data as any)?.movedBy?.login ||
    (notification.data as any)?.assigner?.name ||
    (notification.data as any)?.assigner?.login ||
    ''
  );
}

/**
 * For todo_assigned / todo_agent_assignment: resolve actual assigner/creator from all possible
 * payload shapes (API and real-time may use data.assigner, data.creator, metadata, or target).
 */
function getAssignerForTicketAssignment(notification: NotificationData): string {
  const data = notification.data as {
    assigner?: { name?: string; login?: string };
    creator?: { name?: string; login?: string };
    assignedBy?: { name?: string; login?: string };
  } | undefined;
  const meta = notification.metadata as {
    assignerLogin?: string;
    assignerName?: string;
    creatorName?: string;
    creatorLogin?: string;
  } | undefined;
  const fromTarget =
    notification.target && notification.target !== 'You' && notification.target !== 'Someone'
      ? notification.target
      : '';
  return (
    data?.assigner?.name ||
    data?.assigner?.login ||
    data?.creator?.name ||
    data?.creator?.login ||
    data?.assignedBy?.name ||
    data?.assignedBy?.login ||
    meta?.assignerLogin ||
    meta?.assignerName ||
    meta?.creatorName ||
    meta?.creatorLogin ||
    fromTarget ||
    ''
  );
}

/**
 * For todo_updated: prefer data.updater / data.movedBy when target is missing or "System"
 * so subtext shows the actual agent/admin name (API sends actor in data, not top-level metadata).
 */
function getActorForTodoUpdated(notification: NotificationData): string {
  const actor = extractActor(notification);
  if (actor && actor !== 'System') return actor;
  const data = notification.data as {
    updater?: { name?: string; login?: string };
    updatedBy?: { name?: string; login?: string };
    movedBy?: { name?: string; login?: string };
  } | undefined;
  return (
    data?.updater?.name ||
    data?.updater?.login ||
    data?.updatedBy?.name ||
    data?.updatedBy?.login ||
    data?.movedBy?.name ||
    data?.movedBy?.login ||
    notification.metadata?.updater?.name ||
    notification.metadata?.updater?.login ||
    notification.metadata?.updatedBy?.name ||
    notification.metadata?.updatedBy?.login ||
    notification.target ||
    ''
  );
}

/**
 * Extract entity ID (ticket, lead, project, offer) from notification
 */
function extractEntityId(notification: NotificationData): {
  id: string;
  type: 'ticket' | 'lead' | 'project' | 'offer';
} | null {
  // Ticket/Todo IDs (metadata for realtime; data.todo for API)
  if (notification.metadata?.taskId) {
    return { id: notification.metadata.taskId, type: 'ticket' };
  }
  if (notification.metadata?.todoId) {
    return { id: notification.metadata.todoId, type: 'ticket' };
  }
  const dataTodo = (notification.data as { todo?: { id?: string } } | undefined)?.todo;
  if (dataTodo?.id) {
    return { id: dataTodo.id, type: 'ticket' };
  }

  // Lead IDs
  if (notification.leadId) {
    return { id: notification.leadId, type: 'lead' };
  }
  if (notification.metadata?.leadId) {
    return { id: notification.metadata.leadId, type: 'lead' };
  }

  // Project IDs
  if (notification.projectId) {
    return { id: notification.projectId, type: 'project' };
  }
  if (notification.metadata?.projectId) {
    return { id: notification.metadata.projectId, type: 'project' };
  }

  // Offer IDs
  if (notification.offerId) {
    return { id: notification.offerId, type: 'offer' };
  }
  if (notification.metadata?.offerId) {
    return { id: notification.metadata.offerId, type: 'offer' };
  }

  return null;
}

/**
 * Format entity link text and href
 */
function formatEntityLink(
  entity: { id: string; type: 'ticket' | 'lead' | 'project' | 'offer' },
  notification: NotificationData
): { text: string; href: string } {
  const { id, type } = entity;

  switch (type) {
    case 'ticket':
      return {
        text: `#${id.length > 8 ? id.substring(0, 8) : id}`,
        href: `/dashboards/kanban?task=${id}`,
      };

    case 'lead':
      const leadName = notification.metadata?.leadName || notification.metadata?.lead_name;
      return {
        text: leadName ? `Lead: ${leadName}` : `Lead #${id.substring(0, 8)}`,
        href: `/dashboards/leads/${id}`,
      };

    case 'project':
      const projectName = notification.metadata?.projectName || notification.metadata?.project_name;
      return {
        text: projectName ? `Project: ${projectName}` : `Project #${id.substring(0, 8)}`,
        href: `/dashboards/projects/${id}`,
      };

    case 'offer':
      return {
        text: `Offer #${id.substring(0, 8)}`,
        href: notification.leadId
          ? `/dashboards/leads/${notification.leadId}?highlightOffer=${id}`
          : `/dashboards/leads`,
      };

    default:
      return { text: `#${id}`, href: '#' };
  }
}

/**
 * Resolve display name:
 * - "You" → current user's name so agent and admin see same label (e.g. "by itadmin").
 * - "Someone" → current user's name when realtime payload has no updater; the viewer is usually
 *   the one who did the action (e.g. agent updates ticket and sees the realtime notification).
 */
function resolveActorDisplay(
  nameOrYouOrSomeone: string,
  currentUser?: { name?: string; login?: string } | null
): string {
  if (!nameOrYouOrSomeone) return nameOrYouOrSomeone;
  if (nameOrYouOrSomeone === 'You' || nameOrYouOrSomeone === 'Someone') {
    return currentUser?.name || currentUser?.login || nameOrYouOrSomeone;
  }
  return nameOrYouOrSomeone;
}

// ============================================
// RICH DETAIL HELPERS
// ============================================

/**
 * Join non-empty detail parts with a middle dot separator.
 * e.g. joinDetails(["Sophie Wagner", "€25,000", null, "Deutsche Bank"]) → "Sophie Wagner · €25,000 · Deutsche Bank"
 */
function joinDetails(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/**
 * Truncate text to maxLen with ellipsis.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1) + '…';
}

/**
 * Extract partner ID from various payload locations.
 */
function extractPartnerId(notification: NotificationData): string {
  const meta = notification.metadata || {};
  const data = notification.data as any;
  return (
    meta.partnerId ||
    meta.partner_id ||
    meta.partnerNo ||
    meta.partner_no ||
    data?.lead?.partner_id ||
    data?.lead?.partnerId ||
    data?.lead?.partner_no ||
    data?.metadata?.partnerId ||
    data?.metadata?.partner_id ||
    ''
  );
}

/**
 * Get creator name for offer/opening/confirmation types.
 */
function getCreatorName(
  notification: NotificationData,
  currentUser?: { name?: string; login?: string } | null
): string {
  const data = notification.data as { creator?: { name?: string; login?: string } } | undefined;
  const rawCreator =
    data?.creator?.name ||
    data?.creator?.login ||
    notification.metadata?.creatorName ||
    notification.metadata?.creatorLogin ||
    notification.target ||
    extractActor(notification);
  return resolveActorDisplay(rawCreator, currentUser);
}

/**
 * Format notification message for table display
 * 
 * @param notification - Notification data object
 * @param userRole - User role (Admin sees actor names)
 * @param currentUser - Current viewer (name/login); when backend sends "You", show this so agent and admin see same name
 * @returns Formatted message with primary text, subtext, and optional entity link
 */
export function formatNotificationMessage(
  notification: NotificationData,
  userRole?: string,
  currentUser?: { name?: string; login?: string } | null
): FormattedNotificationMessage {
  const notificationType = notification.notificationType || '';
  const config = getNotificationConfig(notificationType);
  const label = config.label;
  const meta = notification.metadata || {};

  // Get actor name (backend may send "You" for agent view; we resolve to actual name when currentUser is passed)
  const actor = resolveActorDisplay(extractActor(notification), currentUser);
  const showActor = userRole === 'Admin' && actor;

  // Get entity info
  const entity = extractEntityId(notification);

  // Build primary message (notification type label)
  const primary = label;

  // Build subtext with rich details per notification type
  // actorName is returned separately so the row can render it with the user's color
  let subtext = '';
  let actorName = '';

  // ── Offer Created / Opening Created ──
  // Admin: [colored agentName] · leadName · amount · interestRate · bank
  // Agent: leadName · amount · interestRate · bank
  if (notificationType === 'offer_created' || notificationType === 'opening_created') {
    const creatorName = getCreatorName(notification, currentUser);
    if (showActor && creatorName && creatorName !== 'System') {
      actorName = creatorName;
    }
    const details = joinDetails([
      meta.leadName || meta.lead_name,
      meta.amount,
      meta.interestRate || meta.interest_rate,
      meta.bank || meta.bankName || meta.bank_name,
    ]);
    if (details) {
      subtext = details;
    } else if (creatorName && creatorName !== 'System' && !actorName) {
      subtext = `by ${creatorName}`;
    }
  }
  // ── Confirmation / Payment Voucher / Netto ──
  // Admin: [colored agentName] · leadName · amount
  // Agent: leadName · amount
  else if (
    notificationType === 'confirmation_created' ||
    notificationType === 'payment_voucher_created' ||
    notificationType === 'netto1_created' ||
    notificationType === 'netto2_created'
  ) {
    const creatorName = getCreatorName(notification, currentUser);
    if (showActor && creatorName && creatorName !== 'System') {
      actorName = creatorName;
    }
    const details = joinDetails([
      meta.leadName || meta.lead_name,
      meta.amount,
    ]);
    if (details) {
      subtext = details;
    } else if (creatorName && creatorName !== 'System' && !actorName) {
      subtext = `by ${creatorName}`;
    }
  }
  // ── Lead Assigned / Lead Assignment Admin ──
  // Admin: [colored agentName] · #partnerId · leadName
  // Agent: #partnerId · leadName
  else if (notificationType === 'lead_assigned' || notificationType === 'lead_assignment_admin') {
    const partnerId = extractPartnerId(notification);
    const leadName = meta.leadName || meta.lead_name;
    if (showActor) {
      actorName = actor;
    }
    subtext = joinDetails([
      partnerId ? `#${partnerId}` : null,
      leadName,
    ]) || (leadName ? leadName : '');
  }
  // ── Lead Transferred / Bulk Lead Transferred ──
  // Admin: [colored agentName] · #partnerId · leadName
  // Agent: #partnerId · leadName
  else if (notificationType === 'lead_transferred' || notificationType === 'bulk_lead_transferred') {
    const partnerId = extractPartnerId(notification);
    const leadName = meta.leadName || meta.lead_name;
    if (showActor) {
      actorName = actor;
    }
    subtext = joinDetails([
      partnerId ? `#${partnerId}` : null,
      leadName,
    ]);
  }
  // ── Email types ──
  // Show: leadName · #partnerId · subject
  else if (
    notificationType === 'email' ||
    notificationType === 'email_received' ||
    notificationType === 'email_system_received' ||
    notificationType === 'email_approved' ||
    notificationType === 'email_agent_assigned'
  ) {
    const partnerId = extractPartnerId(notification);
    const leadName = meta.leadName || meta.lead_name;
    const subject = meta.subject;
    const details = joinDetails([
      leadName,
      partnerId ? `#${partnerId}` : null,
      subject ? truncate(subject, 40) : null,
    ]);
    subtext = details || (subject ? truncate(subject, 50) : '');
  }
  // ── Email comment mention / added ──
  // Show: [colored actor] · subject
  else if (notificationType === 'email_comment_mention' || notificationType === 'email_comment_added') {
    if (actor && actor !== 'System') {
      actorName = actor;
    }
    const subject = meta.subject;
    subtext = subject ? truncate(subject, 35) : '';
  }
  // ── Ticket assignments ──
  else if (notificationType === 'todo_assigned' || notificationType === 'todo_agent_assignment') {
    const rawAssigner = getAssignerForTicketAssignment(notification);
    const assignerName =
      !rawAssigner || rawAssigner === 'You' || rawAssigner === 'Someone'
        ? 'Someone'
        : resolveActorDisplay(rawAssigner, currentUser);
    if (assignerName && assignerName !== 'System') {
      actorName = assignerName;
    }
  }
  // ── Ticket updates ──
  else if (notificationType === 'todo_updated') {
    const updateActor = resolveActorDisplay(getActorForTodoUpdated(notification), currentUser);
    if (updateActor && updateActor !== 'System') {
      actorName = updateActor;
    }
  }
  // ── New Ticket ──
  else if (notificationType === 'todo_created') {
    const data = notification.data as { creator?: { name?: string; login?: string } } | undefined;
    const rawCreator =
      data?.creator?.name ||
      data?.creator?.login ||
      notification.metadata?.creatorName ||
      notification.metadata?.creatorLogin ||
      extractActor(notification);
    const creatorName = resolveActorDisplay(rawCreator, currentUser);
    if (creatorName && creatorName !== 'System') {
      actorName = creatorName;
    }
  }
  // ── Project assignments ──
  else if (notificationType === 'project_assigned' && meta.projectName) {
    subtext = `Project: ${meta.projectName}`;
  }
  // ── Agent login ──
  else if (notificationType === 'agent_login') {
    const data = notification.data as { agent?: { name?: string; login?: string } } | undefined;
    const loginAgent = data?.agent?.name || data?.agent?.login || actor;
    if (loginAgent) {
      actorName = loginAgent;
    }
  }
  // ── Default: show actor if available ──
  else if (showActor) {
    actorName = actor;
  }

  // Build entity link (skip for types that are not about a specific entity, e.g. agent login)
  let entityLink: FormattedNotificationMessage['entityLink'] | undefined;
  const noEntityLinkTypes = ['agent_login', 'agent_logout'];

  if (entity && !noEntityLinkTypes.includes(notificationType)) {
    const link = formatEntityLink(entity, notification);
    entityLink = {
      text: link.text,
      href: link.href,
      type: entity.type,
    };
  }

  return {
    primary,
    subtext,
    actorName: actorName || undefined,
    entityLink,
  };
}
