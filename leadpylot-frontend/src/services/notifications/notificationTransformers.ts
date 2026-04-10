import { formatDistanceToNow } from 'date-fns';
import { NotificationData } from '@/stores/notificationStore';

const stripHtml = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
};

const getCreatorName = (data: any): string => {
    return (
        data.creator?.name ||
        data.creator?.login ||
        data.assignedBy?.name ||
        data.assignedBy?.login ||
        data.agent?.name ||
        data.agent?.login ||
        data.adminName ||
        data.agentName ||
        data.from ||
        'System'
    );
};

const buildNotificationContent = (notification: any) => {
    const { type, data = {}, message } = notification;
    let target = getCreatorName(data);
    let description = message;
    let status = 'info';
    let locationLabel = '';

    const notificationMap: Record<string, () => void> = {
        lead_assigned: () => {
            status = 'assigned';
            if (data.batchInfo?.isMultiple) {
                description = `New Leads assigned to ${data.project?.name || 'Unknown Project'}`;
            } else {
                const leadName = data.lead?.displayName || data.lead?.contact_name || 'Unknown';
                description = `New Lead ${leadName} Assigned to ${data.project?.name || 'Unknown Project'}`;
            }
            locationLabel = `Project: ${data.project?.name || 'Unknown Project'}`;
        },
        lead_transferred: () => {
            status = 'transferred';
            const leadName = data.lead?.displayName || data.lead?.contact_name || 'Unknown';
            description = `Lead ${leadName} transferred to ${data.project?.name || 'Unknown Project'}`;
            locationLabel = `Project: ${data.project?.name || 'Unknown Project'}`;
        },
        bulk_lead_transferred: () => {
            status = 'transferred';
            const count = data.batchInfo?.totalCount || data.metadata?.leadCount || 'Multiple';
            description = `${count} leads transferred to ${data.project?.name || 'Unknown Project'}`;
            locationLabel = `Project: ${data.project?.name || 'Unknown Project'}`;
        },
        lead_assignment_admin: () => {
            status = 'completed';
            locationLabel = `Assigned to: ${data.assignedTo?.login || 'Unknown'}`;
        },
        agent_login: () => {
            status = 'online';
            locationLabel = `IP: ${data.metadata?.ipAddress || 'Unknown'}`;
        },
        agent_logout: () => {
            status = 'offline';
            locationLabel = `IP: ${data.metadata?.ipAddress || 'Unknown'}`;
        },
        project_created: () => {
            status = 'project';
            locationLabel = `Project: ${data.projectName || 'Unknown'}`;
        },
        project_updated: () => {
            status = 'project';
            locationLabel = `Project: ${data.projectName || 'Unknown'}`;
        },
        project_assigned: () => {
            status = 'assigned';
            locationLabel = `Project: ${data.projectName || 'Unknown'}`;
        },
        lead_status_changed: () => {
            target = data.updatedBy?.name || data.updatedBy?.login || target;
            status = 'updated';
            locationLabel = `Lead: ${data.leadName || 'Unknown'}`;
        },
        lead_converted: () => {
            target = data.convertedBy?.name || data.convertedBy?.login || target;
            status = 'success';
            locationLabel = `Lead: ${data.leadName || 'Unknown'}`;
        },
        offer_created: () => {
            status = 'offer';
            locationLabel = `Investment: ${data.offer?.investment_volume ? `€${data.offer.investment_volume.toLocaleString()}` : 'N/A'}`;
        },
        opening_created: () => {
            status = 'opening';
            locationLabel = `Lead: ${data.lead?.contact_name || data.lead?.displayName || 'Unknown'}`;
        },
        confirmation_created: () => {
            status = 'confirmation';
            locationLabel = `Lead: ${data.lead?.contact_name || data.lead?.displayName || 'Unknown'}`;
        },
        payment_voucher_created: () => {
            status = 'payment';
            const amount = data.offer?.investment_volume || data.paymentVoucher?.amount;
            locationLabel = `Payment: ${amount ? `€${amount.toLocaleString()}` : 'N/A'}`;
        },
        netto1_created: () => {
            status = 'netto';
            locationLabel = `Netto 1: ${data.offer?.investment_volume ? `€${data.offer.investment_volume.toLocaleString()}` : 'N/A'}`;
        },
        netto2_created: () => {
            status = 'netto';
            locationLabel = `Netto 2: ${data.offer?.investment_volume ? `€${data.offer.investment_volume.toLocaleString()}` : 'N/A'}`;
        },
        email: () => {
            // Try multiple ways to get the sender
            target = data.fromAddress || data.from || data.metadata?.fromAddress || data.metadata?.from || 'Unknown Sender';
            // Use the notification message directly (backend now sends a well-formatted message)
            const emailBody = message || data.body || data.metadata?.body || 'New email received';
            const cleanBody = stripHtml(emailBody);
            description = cleanBody.length > 80 ? cleanBody.substring(0, 80) + '...' : cleanBody;
            status = 'email';
            // Build locationLabel with subject + lead/project info when available
            const emailSubject = data.subject || data.metadata?.subject || 'No Subject';
            const emailLeadName = data.leadName || data.metadata?.leadName || '';
            const emailProjectName = data.projectName || data.metadata?.projectName || '';
            locationLabel = emailSubject;
            if (emailLeadName) {
                locationLabel += ` · ${emailLeadName}`;
            }
            if (emailProjectName) {
                locationLabel += ` [${emailProjectName}]`;
            }
        },
        email_comment_mention: () => {
            // Get commenter name from data
            target = data.commenter?.name || data.commenter?.login || data.metadata?.commenter_name || 'Someone';
            // Use the message from notification, or construct from data
            description = message ||
                `${target} mentioned you in a comment on email: ${data.email?.subject || data.metadata?.subject || 'an email'}`;
            status = 'info';
            locationLabel = `Email: ${data.email?.subject || data.metadata?.subject || 'No Subject'}`;
        },
        email_comment_added: () => {
            // Get commenter name from data
            target = data.commenter?.name || data.commenter?.login || data.metadata?.commenter_name || 'Someone';
            // Use the message from notification, or construct from data
            description = message ||
                `${target} added a comment on email: ${data.email?.subject || data.metadata?.subject || 'an email'}`;
            status = 'info';
            locationLabel = `Email: ${data.email?.subject || data.metadata?.subject || 'No Subject'}`;
        },
        email_approved: () => {
            target = data.admin?.name || data.admin?.login || 'Admin';
            status = 'success';
            locationLabel = `Lead: ${data.email?.leadName || data.metadata?.leadName || 'Unknown'}`;
        },
        email_agent_assigned: () => {
            target = data.admin?.name || data.admin?.login || 'Admin';
            status = 'success';
            const threadInfo = data.messageData?.threadInfo || `${data.metadata?.assignedCount || 1} email(s)`;
            locationLabel = `Thread: ${threadInfo}`;
        },
        // Todo/Kanban notifications
        todo_created: () => {
            const creatorName = data.creator?.name || data.creator?.login || data.assignedBy?.name || 'Someone';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a new ticket';
            const leadName = data.lead?.displayName || data.lead?.contact_name || '';
            target = creatorName;
            description = leadName 
                ? `${creatorName} assigned you a ticket for ${leadName}`
                : `${creatorName} assigned you: "${taskTitle}"`;
            status = 'todo';
            locationLabel = taskTitle;
        },
        todo_assigned: () => {
            const assignerName =
                data.assigner?.name ||
                data.assigner?.login ||
                data.creator?.name ||
                data.creator?.login ||
                data.assignedBy?.name ||
                data.assignedBy?.login ||
                data.metadata?.creatorLogin ||
                data.metadata?.creatorName ||
                data.metadata?.assignerLogin ||
                'Someone';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a ticket';
            const leadName = data.lead?.displayName || data.lead?.contact_name || '';
            target = assignerName;
            description = leadName 
                ? `${assignerName} assigned you to work on ${leadName}`
                : `${assignerName} assigned you: "${taskTitle}"`;
            status = 'assigned';
            locationLabel = taskTitle;
        },
        todo_agent_assignment: () => {
            const assigneeName = data.assignee?.name || data.assignee?.login || 'an agent';
            const assignerName =
                data.assigner?.name ||
                data.assigner?.login ||
                data.creator?.name ||
                data.creator?.login ||
                data.metadata?.creatorLogin ||
                data.metadata?.creatorName ||
                data.metadata?.assignerLogin ||
                'Someone';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a ticket';
            target = assignerName;
            description = `${assignerName} assigned ${assigneeName} to "${taskTitle}"`;
            status = 'assigned';
            locationLabel = taskTitle;
        },
        todo_completed: () => {
            const completedByName = data.completedBy?.name || data.completedBy?.login || data.updater?.name || 'Someone';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a ticket';
            const leadName = data.lead?.displayName || data.lead?.contact_name || '';
            target = completedByName;
            description = leadName 
                ? `${completedByName} completed the ticket for ${leadName}`
                : `${completedByName} completed: "${taskTitle}"`;
            status = 'success';
            locationLabel = taskTitle;
        },
        todo_completed_admin: () => {
            const completedByName = data.completedBy?.name || data.completedBy?.login || data.updater?.name || 'An agent';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a ticket';
            const leadName = data.lead?.displayName || data.lead?.contact_name || '';
            target = completedByName;
            description = leadName 
                ? `${completedByName} completed the ticket for ${leadName}`
                : `${completedByName} completed: "${taskTitle}"`;
            status = 'success';
            locationLabel = taskTitle;
        },
        todo_updated: () => {
            const updaterName = data.updater?.name || data.updater?.login ||
                data.updatedBy?.name || data.updatedBy?.login ||
                data.movedBy?.name || data.movedBy?.login ||
                'Someone';
            const taskTitle = data.todo?.message || data.task?.taskTitle || 'a ticket';
            target = updaterName;
            
            // Build human-readable change description
            let changeText = 'updated';
            if (data.changes) {
                const changes = data.changes;
                if (changes.isCompleted?.new === true) {
                    changeText = 'marked as completed';
                } else if (changes.isCompleted?.new === false) {
                    changeText = 'marked as incomplete';
                } else if (changes.priority) {
                    changeText = `changed priority to ${changes.priority.new}`;
                } else if (changes.taskTitle) {
                    changeText = 'updated the title';
                } else if (changes.taskDescription) {
                    changeText = 'updated the description';
                } else if (changes.dueDate) {
                    changeText = 'updated the due date';
                }
            }
            
            description = `${updaterName} ${changeText} "${taskTitle}"`;
            status = 'updated';
            locationLabel = taskTitle;
        },
        lead_form_created: () => {
            status = 'lead_form';
            const leadName = data.lead?.contact_name || 'Unknown';
            const siteLink = data.lead?.site_link || 'Unknown site';
            description = `New lead "${leadName}" received from ${siteLink}`;
            locationLabel = `Revenue: ${data.lead?.expected_revenue ? `€${data.lead.expected_revenue.toLocaleString()}` : 'N/A'}`;
        },
    };

    notificationMap[type]?.();

    return { target, description, status, locationLabel };
};

export const transformNotificationFromAPI = (n: any): NotificationData => {
    const isEmail = n.type === 'email';
    const isRead = n.read === true || n.read === 'true';
    const body = n.metadata?.body_text || stripHtml(n.metadata?.body) || n.metadata?.body || n.description || 'New notification';
    const description = isEmail ? (body.length > 100 ? body.slice(0, 100) + '...' : body) : body;

    const target = isEmail
        ? n.metadata?.from_address || 'Unknown Sender'
        : n.info?.user_id?.login || n.info?.user_id?.name || n.metadata?.creatorName || n.metadata?.creatorLogin ||
        n.metadata?.agentName || n.metadata?.agentLogin || n.metadata?.from || n.metadata?.sender ||
        n.data?.updater?.name || n.data?.updater?.login ||
        n.data?.movedBy?.name || n.data?.movedBy?.login ||
        n.data?.agent?.name || n.data?.agent?.login ||
        n.data?.creator?.name || n.data?.creator?.login ||
        n.data?.assigner?.name || n.data?.assigner?.login ||
        n.target || 'System';

    const locationLabel = n.metadata?.subject || n.locationLabel || (isEmail ? 'No Subject' : '');

    // Parse date safely
    const timestamp = n.created_at || n.timestamp || n.date || new Date().toISOString();
    const parsedDate = new Date(timestamp);
    const dateString = isNaN(parsedDate.getTime())
        ? 'Just now'
        : formatDistanceToNow(parsedDate, { addSuffix: true });

    return {
        id: n.dbId || n._id || n.id,
        target,
        description,
        date: dateString,
        offerId: n?.external_id?.split('_')?.[2] ?? null,
        image: n.image || '',
        type: isRead ? 3 : n.type || 1,
        location: n.info?.project_id?.name || n.location || '',
        locationLabel,
        status: n.type || n.status || 'info',
        readed: isRead,
        read: isRead,
        priority: n.metadata?.priority || n.priority || 'medium',
        category: n.metadata?.category || n.category || 'system',
        isRealtime: false,
        notificationType: n.type || n.notificationType,
        leadId: n?.info?.lead_id?._id ?? null,
        projectId: n.info?.project_id?._id || null,
        metadata: n.metadata,
        timestamp: timestamp,
        data: n.data || n,
        dbId: n._id || n.id,
        title: locationLabel || n.title || 'Notification',
        message: description,
        ...n,
    } as any;
};

export const transformRealtimeNotification = (notification: any): NotificationData => {
    const { target, description, status, locationLabel } = buildNotificationContent(notification);
    const { data = {} } = notification;

    const extractId = (field: string) =>
        data[field]?.id || data[field]?._id || data.metadata?.[`${field}Id`] || data[`${field}Id`] || null;

    // Debug logging for email notifications
    if (notification.type === 'email') {
        // eslint-disable-next-line no-console
        console.log('📧 Email notification received:', {
            id: notification.id,
            dbId: notification.dbId,
            timestamp: notification.timestamp,
            data: notification.data,
            target,
            description,
            locationLabel,
        });
    }

    // Debug logging for email comment mention notifications
    if (notification.type === 'email_comment_mention') {
        // eslint-disable-next-line no-console
        console.log('💬 Email comment mention notification received:', {
            id: notification.id,
            dbId: notification.dbId,
            type: notification.type,
            message: notification.message,
            title: notification.title,
            data: notification.data,
            target,
            description,
            locationLabel,
            fullNotification: JSON.stringify(notification, null, 2),
        });
    }

    // Debug logging for email comment added notifications
    if (notification.type === 'email_comment_added') {
        // eslint-disable-next-line no-console
        console.log('💬 Email comment added notification received:', {
            id: notification.id,
            dbId: notification.dbId,
            type: notification.type,
            message: notification.message,
            title: notification.title,
            data: notification.data,
            target,
            description,
            locationLabel,
            fullNotification: JSON.stringify(notification, null, 2),
        });
    }

    // Parse timestamp safely
    const timestamp = notification.timestamp || notification.created_at || new Date().toISOString();
    const parsedDate = new Date(timestamp);
    const dateString = isNaN(parsedDate.getTime())
        ? 'Just now'
        : formatDistanceToNow(parsedDate, { addSuffix: true });

    return {
        id: notification.dbId || notification.id,
        target,
        description,
        date: dateString,
        image: '',
        type: notification.priority === 'high' ? 1 : notification.priority === 'medium' ? 2 : 3,
        location: data.metadata?.ipAddress || data.project?.id || '',
        locationLabel,
        status,
        readed: false,
        read: false,
        priority: notification.priority,
        category: notification.category,
        isRealtime: true,
        notificationType: notification.type,
        offerId: extractId('offer'),
        leadId: extractId('lead'),
        projectId: extractId('project'),
        metadata: data.metadata,
        timestamp: timestamp,
        data,
        title: notification.title || locationLabel || 'Notification',
        message: notification.message || description,
    };
};
export function TransformDataNotification(event: any) {
    const { id, category, priority, type, title, message, data, timestamp, read, dbId } = event
    const { metadata, lead, creator, offer, project, agent } = data || {}

    // Handle email notifications differently
    const isEmailNotification = type === 'email';

    // Determine target (who triggered the notification)
    const isLeadNotification = ['lead_assigned', 'lead_transferred', 'bulk_lead_transferred'].includes(type);
    const target = isEmailNotification
        ? (data?.fromAddress || data?.from || metadata?.fromAddress || metadata?.from || 'Unknown Sender')
        : (creator?.login || creator?.name || agent?.login || agent?.name || data?.assignedBy?.login || "");

    // Build locationLabel based on notification type
    let locationLabel = '';
    if (isEmailNotification) {
        const emailSubject = data?.subject || metadata?.subject || 'No Subject';
        const emailLeadName = data?.leadName || metadata?.leadName || '';
        const emailProjectName = data?.projectName || metadata?.projectName || '';
        locationLabel = emailSubject;
        if (emailLeadName) locationLabel += ` · ${emailLeadName}`;
        if (emailProjectName) locationLabel += ` [${emailProjectName}]`;
    } else if (isLeadNotification) {
        locationLabel = project?.name ? `Project: ${project.name}` : '';
    }

    return {
        id: dbId || id, // Use dbId if available, otherwise fallback to id
        _id: dbId || id,
        target,
        description: message,
        date: timestamp,
        offerId: offer?.id || offer?._id || metadata?.offerId || "",
        image: "",
        type: 3,
        location: "",
        locationLabel,
        status: type,
        readed: !!read,
        priority,
        category,
        isRealtime: false,
        notificationType: type,
        leadId: lead?.id || lead?._id || metadata?.leadId || null,
        projectId: project?.id || project?._id || metadata?.projectId || null,
        metadata: {
            body: message,
            attachments: [],
            timestamp: metadata?.timestamp || timestamp,
            title,
            category,
            priority,
            isSharedRoleNotification: true,
            targetRole: "Agent",
            amount: metadata?.amount || "",
            interestRate: metadata?.interestRate || "",
            bonus: metadata?.bonus || "",
            bank: metadata?.bank || "",
            offerType: metadata?.offerType || "",
            offerId: metadata?.offerId || "",
            createdAt: metadata?.createdAt || timestamp,
            creatorName: creator?.name || "",
            creatorLogin: creator?.login || "",
            creatorId: creator?.id || creator?._id || "",
            // Email-specific metadata
            ...(isEmailNotification && {
                fromAddress: data?.fromAddress || data?.from,
                from: data?.from || data?.fromAddress,
                subject: data?.subject || metadata?.subject,
                emailId: data?.emailId || data?.email_id || metadata?.emailId,
                leadName: data?.leadName || metadata?.leadName,
                projectName: data?.projectName || metadata?.projectName,
                mailServerId: data?.mailserver_id,
            }),
            ...metadata,
        }
    }
}