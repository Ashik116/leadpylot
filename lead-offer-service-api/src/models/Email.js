const mongoose = require('mongoose');

/**
 * Email Schema for Enhanced Email Management System
 * Supports both incoming and outgoing emails with approval workflows, lead association, and audit trails
 */
const emailSchema = new mongoose.Schema(
  {
    // Email Direction
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      default: 'incoming',
      index: true,
    },

    // Basic Email Information
    external_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    }, // Email messageId from IMAP or nodemailer

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    from: {
      type: String,
      required: true,
      trim: true,
    }, // Display name (e.g., "John Doe")

    from_address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    }, // Email address (e.g., "john@example.com")

    to: {
      type: String,
      required: true,
      trim: true,
    },

    cc: {
      type: String,
      trim: true,
    },

    bcc: {
      type: String,
      trim: true,
    },

    body: {
      type: String,
      default: '',
    }, // Clean reply content (quotes removed)

    html_body: {
      type: String,
      default: '',
    }, // Clean HTML reply content (quotes removed)

    original_body: {
      type: String,
      default: '',
    }, // Original full email body with quotes

    original_html_body: {
      type: String,
      default: '',
    }, // Original full HTML body with quotes

    received_at: {
      type: Date,
      default: Date.now,
      index: true,
    }, // For incoming emails

    sent_at: {
      type: Date,
      index: true,
    }, // For outgoing emails

    // Project & Mail Server Association
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false, // Optional - null when no lead match found
      index: true,
    },

    mailserver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
      required: function () {
        return this.direction === 'incoming';
      }, // Only required for incoming emails
    },

    // Lead Association
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },

    matched_by: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },

    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }, // Admin who assigned the lead

    assignment_reason: {
      type: String,
      trim: true,
    }, // Why this lead was chosen

    // Email Approval Workflow (for both incoming and outgoing emails)
    email_status: {
      type: String,
      enum: ['received', 'email_approved', 'email_rejected', 'fully_approved', 'sent', 'draft'],
      default: 'received', // All emails start as 'received', even outgoing ones need approval
      index: true,
    },

    email_approved: {
      type: Boolean,
      default: false, // All emails require approval (both incoming and outgoing)
      index: true,
    },

    email_approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    email_approved_at: {
      type: Date,
    },

    email_rejection_reason: {
      type: String,
      trim: true,
    },

    // Attachment Approval Workflow (for both incoming and outgoing emails)
    attachment_approved: {
      type: Boolean,
      default: false, // All attachments require approval (both incoming and outgoing)
    },

    attachment_approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    attachment_approved_at: {
      type: Date,
    },

    attachment_rejection_reason: {
      type: String,
      trim: true,
    },

    // Agent Access Control
    visible_to_agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Agent Access Tracking - tracks how and when agents got access to this email
    email_access_to_agent: [
      {
        agent_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        access_type: {
          type: String,
          enum: ['manual', 'mentioned','lead_assign'],
          default: 'manual',
          required: true,
        },
        assigned_at: {
          type: Date,
          default: Date.now,
          required: true,
        },
        assigned_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    assigned_agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // For outgoing emails - the agent who sent the email
    sent_by_agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional - null when fetched from IMAP without knowing the sender
      index: true,
    },

    agent_viewed: {
      type: Boolean,
      default: false,
    },

    agent_viewed_at: {
      type: Date,
    },

    agent_viewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Admin View Tracking
    admin_viewed: {
      type: Boolean,
      default: false,
    },

    admin_viewed_at: {
      type: Date,
    },

    admin_viewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Attachments with Individual Approval
    attachments: [
      {
        document_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
        filename: {
          type: String,
          trim: true,
        },
        size: {
          type: Number,
          min: 0,
        },
        mime_type: {
          type: String,
          trim: true,
        },
        approved: {
          type: Boolean,
          default: false, // All attachments require approval (both incoming and outgoing)
        },
        approved_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        approved_at: {
          type: Date,
        },
        rejection_reason: {
          type: String,
          trim: true,
        },
        unmask: {
          type: Boolean,
          default: false,
        }, // Individual attachment visibility permission

        // Per-Agent Attachment Visibility
        visible_to_agents: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ], // Specific agents who can see this attachment (if empty, all agents with email access can see if approved)
      },
    ],

    // Email Classification
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    category: {
      type: String,
      enum: ['inquiry', 'complaint', 'follow_up', 'support', 'sales', 'other'],
      default: 'other',
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Email Intelligence (primarily for incoming emails)
    spam_score: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },

    spam_indicators: [
      {
        type: String,
        trim: true,
      },
    ],

    is_spam: {
      type: Boolean,
      default: false,
      index: true,
    },

    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral',
    },

    sentiment_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    topics: [
      {
        type: String,
        trim: true,
      },
    ],

    intelligence_metadata: {
      analyzedAt: Date,
      processingTime: Number,
      confidence: Number,
      wordCount: Number,
    },

    // Outgoing Email Specific Fields
    delivery_status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'pending',
    },

    delivery_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    nodemailer_message_id: {
      type: String,
      trim: true,
    }, // Message ID from nodemailer response

    delivery_errors: [
      {
        error: String,
        timestamp: Date,
        attempt: Number,
      },
    ],

    // Workflow Tracking and Audit Trail
    workflow_history: [
      {
        action: {
          type: String,
          required: true,
          trim: true,
        }, // 'received', 'email_approved', 'attachment_approved', 'sent', etc.
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        performed_at: {
          type: Date,
          default: Date.now,
        },
        comments: {
          type: String,
          trim: true,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],

    // Status and Metadata
    is_active: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
    },
    deleted_reason: {
      type: String, // Reason for deletion (e.g., "Deleted from mail server", "Deleted by user")
    },

    processed: {
      type: Boolean,
      default: false, // All emails need to be processed after approval
    },

    archived: {
      type: Boolean,
      default: false,
    },

    // Thread Information (for future email threading feature)
    thread_id: {
      type: String,
      trim: true,
    },

    in_reply_to: {
      type: String,
      trim: true,
    },

    references: [
      {
        type: String,
        trim: true,
      },
    ],

    // Additional metadata
    message_size: {
      type: Number,
      min: 0,
    }, // Email size in bytes

    flagged: {
      type: Boolean,
      default: false,
    }, // Manual flag for important emails

    flag_reason: {
      type: String,
      trim: true,
    },

    flagged_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    flagged_at: {
      type: Date,
    },

    // Email Reply System Fields
    reply_to_email: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
    }, // Reference to the email being replied to

    forwarded_from_email: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
    }, // Reference to the email being forwarded

    reply_count: {
      type: Number,
      default: 0,
    }, // Count of direct replies to this email

    is_reply: {
      type: Boolean,
      default: false,
      index: true,
    }, // Flag to quickly identify reply emails

    is_forward: {
      type: Boolean,
      default: false,
      index: true,
    }, // Flag to quickly identify forwarded emails

    // ========================================================================
    // MISSIVE-STYLE COLLABORATION FEATURES
    // ========================================================================

    // Internal Comments (Team Collaboration)
    internal_comments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        user: {
          _id: mongoose.Schema.Types.ObjectId,
          name: String,
          login: String,
        },
        text: {
          type: String,
          required: true,
        },
        mentioned_users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        attachments: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
          },
        ],
        created_at: {
          type: Date,
          default: Date.now,
        },
        updated_at: {
          type: Date,
        },
        edited: {
          type: Boolean,
          default: false,
        },
        is_internal: {
          type: Boolean,
          default: true,
        },
        // Edit History Tracking
        edit_history: [
          {
            text: {
              type: String,
              required: true,
            },
            mentioned_users: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            ],
            attachments: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Document',
              },
            ],
            edited_at: {
              type: Date,
              default: Date.now,
            },
            edited_by: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          },
        ],
      },
    ],

    // Email Snooze
    snoozed: {
      type: Boolean,
      default: false,
      index: true,
    },
    snoozed_until: {
      type: Date,
      index: true,
    },
    snoozed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    snooze_reason: {
      type: String,
    },
    snoozed_at: {
      type: Date,
    },
    unsnoozed_at: {
      type: Date,
    },
    unsnoozed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    unsnooze_type: {
      type: String,
      enum: ['manual', 'automatic'],
    },

    // Email Reminders
    reminders: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        remind_at: {
          type: Date,
          required: true,
        },
        note: {
          type: String,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completed_at: {
          type: Date,
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Email Scheduling Fields
    scheduled_at: { type: Date, index: true },
    schedule_status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      index: true,
    },
    scheduled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule_notification_sent: { type: Boolean, default: false },
    schedule_pre_approved: { type: Boolean, default: true },
    schedule_attempts: { type: Number, default: 0 },
    schedule_error: { type: String },
    schedule_cancelled_at: { type: Date },
    schedule_cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule_payload: { type: mongoose.Schema.Types.Mixed },

    // Draft Email Fields
    is_draft: {
      type: Boolean,
      default: false,
      index: true,
    },
    draft_created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    draft_last_saved_at: {
      type: Date,
    },
    draft_synced_to_imap: {
      type: Boolean,
      default: false,
    },
    draft_imap_uid: {
      type: String, // UID from IMAP server
    },
    draft_parent_email_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email', // Reference to email being replied to
    },
    draft_was_sent: {
      type: Boolean,
      default: false, // True if this draft was sent (and a separate sent email exists)
    },
    draft_sent_at: {
      type: Date, // When the draft was sent (if draft_was_sent is true)
    },
    sent_from_draft_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email', // Reference to the original draft (if this sent email came from a draft)
    },
    // Starred Emails (Gmail-like feature)
    starred_by: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        starred_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for Performance
emailSchema.index({ direction: 1, project_id: 1, received_at: -1 });
emailSchema.index({ direction: 1, project_id: 1, sent_at: -1 });

// Email Threading Indexes
emailSchema.index({ thread_id: 1, received_at: 1 });
emailSchema.index({ thread_id: 1, sent_at: 1 });
emailSchema.index({ in_reply_to: 1 });
emailSchema.index({ reply_to_email: 1 });
emailSchema.index({ forwarded_from_email: 1 });
emailSchema.index({ project_id: 1, received_at: -1 });
emailSchema.index({ lead_id: 1, received_at: -1 });
emailSchema.index({ email_status: 1, project_id: 1 });
emailSchema.index({ assigned_agent: 1, email_approved: 1 });
emailSchema.index({ sent_by_agent: 1, direction: 1 });
emailSchema.index({ from_address: 1, project_id: 1 });
emailSchema.index({ email_approved: 1, attachment_approved: 1 });

// Scheduling Index
emailSchema.index({ lead_id: 1, schedule_status: 1, scheduled_at: 1 });

// Draft Indexes
emailSchema.index({ is_draft: 1, draft_created_by: 1, createdAt: -1 });
emailSchema.index({ is_draft: 1, project_id: 1 });
emailSchema.index({ archived: 1, is_active: 1 });
emailSchema.index({ flagged: 1, project_id: 1 });
emailSchema.index({ delivery_status: 1, direction: 1 });

// Starred emails index (for efficient starred email queries per user per mailserver)
emailSchema.index({ 'starred_by.user_id': 1, mailserver_id: 1, received_at: -1 });
emailSchema.index({ 'starred_by.user_id': 1, mailserver_id: 1, sent_at: -1 });

// Agent access tracking index
emailSchema.index({ 'email_access_to_agent.agent_id': 1, 'email_access_to_agent.access_type': 1 });

// Text search index for subject and body
emailSchema.index(
  {
    subject: 'text',
    body: 'text',
    from: 'text',
  },
  {
    name: 'email_text_search',
  }
);

// Virtual for full approval status (for both incoming and outgoing emails)
emailSchema.virtual('fully_approved').get(function () {
  if (this.attachments.length === 0) {
    return this.email_approved;
  }
  return this.email_approved && this.attachment_approved;
});

// Virtual for attachment count
emailSchema.virtual('attachment_count').get(function () {
  return this.attachments ? this.attachments.length : 0;
});

// Virtual for approved attachment count
emailSchema.virtual('approved_attachment_count').get(function () {
  return this.attachments ? this.attachments.filter((att) => att.approved).length : 0;
});

// Instance method to add workflow history
emailSchema.methods.addWorkflowHistory = function (
  action,
  performedBy,
  comments = '',
  metadata = {}
) {
  this.workflow_history.push({
    action,
    performed_by: performedBy,
    performed_at: new Date(),
    comments,
    metadata,
  });
  return this.save();
};

// Instance method to approve email (for both incoming and outgoing emails)
emailSchema.methods.approveEmail = function (approvedBy, comments = '') {
  this.email_approved = true;
  this.email_approved_by = approvedBy;
  this.email_approved_at = new Date();
  this.email_status = this.attachments.length === 0 ? 'fully_approved' : 'email_approved';

  return this.addWorkflowHistory('email_approved', approvedBy, comments);
};

// Instance method to reject email (for both incoming and outgoing emails)
emailSchema.methods.rejectEmail = function (rejectedBy, reason, comments = '') {
  this.email_approved = false;
  this.email_rejection_reason = reason;
  this.email_status = 'email_rejected';

  return this.addWorkflowHistory('email_rejected', rejectedBy, comments, { reason });
};

// Instance method to approve attachments (for both incoming and outgoing emails)
emailSchema.methods.approveAttachments = function (approvedBy, attachmentIds = [], comments = '') {
  if (attachmentIds.length === 0) {
    // Approve all attachments
    this.attachments.forEach((att) => {
      att.approved = true;
      att.approved_by = approvedBy;
      att.approved_at = new Date();
    });
  } else {
    // Approve specific attachments
    this.attachments.forEach((att) => {
      if (attachmentIds.includes(att.document_id.toString())) {
        att.approved = true;
        att.approved_by = approvedBy;
        att.approved_at = new Date();
      }
    });
  }

  // Update overall attachment approval status
  const allApproved = this.attachments.every((att) => att.approved);
  this.attachment_approved = allApproved;
  this.attachment_approved_by = approvedBy;
  this.attachment_approved_at = new Date();

  // Update email status if email is also approved
  if (this.email_approved && allApproved) {
    this.email_status = 'fully_approved';
  }

  return this.addWorkflowHistory('attachments_approved', approvedBy, comments, {
    approved_count: this.attachments.filter((att) => att.approved).length,
    total_count: this.attachments.length,
  });
};

// Instance method to unapprove/remove approval from attachments
emailSchema.methods.unapproveAttachments = function (unapprovedBy, attachmentIds = [], reason = '') {
  if (attachmentIds.length === 0) {
    // Unapprove all attachments
    this.attachments.forEach((att) => {
      att.approved = false;
      att.approved_by = undefined;
      att.approved_at = undefined;
    });
  } else {
    // Unapprove specific attachments
    this.attachments.forEach((att) => {
      if (attachmentIds.includes(att.document_id.toString())) {
        att.approved = false;
        att.approved_by = undefined;
        att.approved_at = undefined;
      }
    });
  }

  // Update overall attachment approval status
  const allApproved = this.attachments.every((att) => att.approved);
  this.attachment_approved = allApproved;

  // If any attachment is unapproved, update email status
  if (!allApproved) {
    if (this.email_status === 'fully_approved') {
      this.email_status = 'email_approved'; // Downgrade from fully_approved
    }
  }

  return this.addWorkflowHistory('attachments_unapproved', unapprovedBy, '', {
    reason,
    unapproved_count: attachmentIds.length || this.attachments.length,
    total_count: this.attachments.length,
  });
};

// Instance method to assign to lead
emailSchema.methods.assignToLead = function (leadId, assignedBy, reason = '', comments = '') {
  this.lead_id = leadId;
  this.assigned_by = assignedBy;
  this.assignment_reason = reason;
  this.matched_by = 'manual';

  return this.addWorkflowHistory('lead_assigned', assignedBy, comments, {
    lead_id: leadId,
    reason,
  });
};

// Instance method to assign to agent (for incoming emails)
emailSchema.methods.assignToAgent = function (agentId, assignedBy, comments = '') {
  this.assigned_agent = agentId;

  if (!this.visible_to_agents.includes(agentId)) {
    this.visible_to_agents.push(agentId);
  }

  // Track agent access with manual type
  const existingAccess = this.email_access_to_agent.find(
    (access) => access.agent_id.toString() === agentId.toString()
  );

  if (!existingAccess) {
    this.email_access_to_agent.push({
      agent_id: agentId,
      access_type: 'manual',
      assigned_at: new Date(),
      assigned_by: assignedBy,
    });
  }

  return this.addWorkflowHistory('agent_assigned', assignedBy, comments, {
    agent_id: agentId,
  });
};

// Instance method to add agents via mention (for internal comments)
emailSchema.methods.addAgentsByMention = function (agentIds, mentionedBy, comments = '') {
  const newAgents = [];

  agentIds.forEach((agentId) => {
    const agentIdStr = agentId.toString();

    // Add to visible_to_agents if not already there
    if (!this.visible_to_agents.some((id) => id.toString() === agentIdStr)) {
      this.visible_to_agents.push(agentId);
      newAgents.push(agentId);
    }

    // Track agent access with mentioned type if not already tracked
    const existingAccess = this.email_access_to_agent.find(
      (access) => access.agent_id.toString() === agentIdStr
    );

    if (!existingAccess) {
      this.email_access_to_agent.push({
        agent_id: agentId,
        access_type: 'mentioned',
        assigned_at: new Date(),
        assigned_by: mentionedBy,
      });
    }
  });

  if (newAgents.length > 0) {
    return this.addWorkflowHistory('agents_mentioned', mentionedBy, comments, {
      agent_ids: newAgents,
      count: newAgents.length,
    });
  }

  return Promise.resolve(this);
};

// Instance method to add multiple agents manually (for lead assignments, etc.)
emailSchema.methods.addAgentsManually = function (agentIds, assignedBy, comments = '', accessType = 'manual') {
  const newAgents = [];

  agentIds.forEach((agentId) => {
    const agentIdStr = agentId.toString();

    // Add to visible_to_agents if not already there
    if (!this.visible_to_agents.some((id) => id.toString() === agentIdStr)) {
      this.visible_to_agents.push(agentId);
      newAgents.push(agentId);
    }

    // Track agent access with specified type if not already tracked
    const existingAccess = this.email_access_to_agent.find(
      (access) => access.agent_id.toString() === agentIdStr
    );

    if (!existingAccess) {
      this.email_access_to_agent.push({
        agent_id: agentId,
        access_type: accessType,
        assigned_at: new Date(),
        assigned_by: assignedBy,
      });
    }
  });

  if (newAgents.length > 0) {
    return this.addWorkflowHistory('agents_added_manually', assignedBy, comments, {
      agent_ids: newAgents,
      count: newAgents.length,
      access_type: accessType,
    });
  }

  return Promise.resolve(this);
};

// Instance method to unassign agent from email
emailSchema.methods.unassignAgent = function (agentId, unassignedBy, comments = '') {
  const agentIdStr = agentId.toString();

  // Remove from visible_to_agents
  this.visible_to_agents = this.visible_to_agents.filter(
    (id) => id.toString() !== agentIdStr
  );

  // Remove from email_access_to_agent
  this.email_access_to_agent = this.email_access_to_agent.filter(
    (access) => access.agent_id.toString() !== agentIdStr
  );

  // If this agent is the assigned_agent, clear it
  if (this.assigned_agent && this.assigned_agent.toString() === agentIdStr) {
    this.assigned_agent = undefined;
  }

  return this.addWorkflowHistory('agent_unassigned', unassignedBy, comments, {
    agent_id: agentId,
  });
};

// Instance method to mark as viewed by agent
emailSchema.methods.markViewedByAgent = function (agentId) {
  this.agent_viewed = true;
  this.agent_viewed_at = new Date();
  this.agent_viewed_by = agentId;

  return this.addWorkflowHistory('viewed_by_agent', agentId);
};

// Instance method to mark as viewed by admin
emailSchema.methods.markViewedByAdmin = function (adminId) {
  this.admin_viewed = true;
  this.admin_viewed_at = new Date();
  this.admin_viewed_by = adminId;

  return this.addWorkflowHistory('viewed_by_admin', adminId);
};

// Instance method to update delivery status (for outgoing emails)
emailSchema.methods.updateDeliveryStatus = function (status, messageId = null, error = null) {
  if (this.direction !== 'outgoing') {
    throw new Error('Can only update delivery status for outgoing emails');
  }

  this.delivery_status = status;
  this.delivery_attempts += 1;

  if (messageId) {
    this.nodemailer_message_id = messageId;
  }

  if (status === 'sent' && !this.sent_at) {
    this.sent_at = new Date();
  }

  if (error) {
    this.delivery_errors.push({
      error: error,
      timestamp: new Date(),
      attempt: this.delivery_attempts,
    });
  }

  return this.addWorkflowHistory(`delivery_${status}`, this.sent_by_agent, '', {
    delivery_status: status,
    delivery_attempts: this.delivery_attempts,
    message_id: messageId,
    error: error,
  });
};

// Instance method to star email
emailSchema.methods.starEmail = function (userId, comments = '') {
  // Check if already starred by this user
  const alreadyStarred = this.starred_by.some((star) => star.user_id.toString() === userId.toString());

  if (alreadyStarred) {
    throw new Error('Email already starred by this user');
  }

  this.starred_by.push({
    user_id: userId,
    starred_at: new Date(),
  });

  return this.addWorkflowHistory('email_starred', userId, comments);
};

// Instance method to unstar email
emailSchema.methods.unstarEmail = function (userId, comments = '') {
  const starIndex = this.starred_by.findIndex((star) => star.user_id.toString() === userId.toString());

  if (starIndex === -1) {
    throw new Error('Email not starred by this user');
  }

  this.starred_by.splice(starIndex, 1);

  return this.addWorkflowHistory('email_unstarred', userId, comments);
};

// Instance method to check if email is starred by user
emailSchema.methods.isStarredBy = function (userId) {
  return this.starred_by.some((star) => star.user_id.toString() === userId.toString());
};

// Static method to find emails requiring approval (both incoming and outgoing emails)
emailSchema.statics.findPendingApproval = function (projectId = null) {
  const filter = {
    is_active: true,
    archived: false,
    $or: [
      { email_approved: false },
      {
        $and: [
          { 'attachments.0': { $exists: true } }, // Has attachments
          { attachment_approved: false },
        ],
      },
    ],
  };

  if (projectId) {
    filter.project_id = projectId;
  }

  return this.find(filter)
    .populate('project_id', 'name')
    .populate('lead_id', 'contact_name email_from display_name')
    .populate('assigned_agent', 'name login email')
    .populate('email_approved_by', 'name login')
    .populate('attachment_approved_by', 'name login')
    .sort({ received_at: -1 });
};

// Static method to find approved emails for agent (incoming emails only)
emailSchema.statics.findApprovedForAgent = function (agentId, projectId = null) {
  const filter = {
    direction: 'incoming',
    is_active: true,
    archived: false,
    email_approved: true,
    $or: [{ assigned_agent: agentId }, { visible_to_agents: { $in: [agentId] } }],
  };

  if (projectId) {
    filter.project_id = projectId;
  }

  return this.find(filter)
    .populate('project_id', 'name')
    .populate('lead_id', 'contact_name email_from display_name phone')
    .populate('assigned_agent', 'name login')
    .sort({ received_at: -1 });
};

// Static method to find outgoing emails sent by agent
emailSchema.statics.findSentByAgent = function (agentId, projectId = null) {
  const filter = {
    direction: 'outgoing',
    is_active: true,
    archived: false,
    sent_by_agent: agentId,
  };

  if (projectId) {
    filter.project_id = projectId;
  }

  return this.find(filter)
    .populate('project_id', 'name')
    .populate('lead_id', 'contact_name email_from display_name phone')
    .populate('sent_by_agent', 'name login')
    .sort({ sent_at: -1 });
};

// Static method to find all emails for a lead (both incoming and outgoing)
emailSchema.statics.findByLead = function (leadId) {
  return this.find({
    lead_id: leadId,
    is_active: true,
    archived: false,
  })
    .populate('project_id', 'name')
    .populate('assigned_agent', 'name login')
    .populate('sent_by_agent', 'name login')
    .sort({ createdAt: -1 });
};

// Static method to find starred emails by user (scoped by mailserver)
emailSchema.statics.findStarredByUser = function (userId, mailserverId = null, options = {}) {
  const filter = {
    is_active: true,
    archived: false,
    'starred_by.user_id': userId,
  };

  if (mailserverId) {
    filter.mailserver_id = mailserverId;
  }

  // Support for optional filters
  if (options.project_id) {
    filter.project_id = options.project_id;
  }

  if (options.direction) {
    filter.direction = options.direction;
  }

  // Build query
  let query = this.find(filter)
    .populate('project_id', 'name')
    .populate('lead_id', 'contact_name email_from display_name phone')
    .populate('assigned_agent', 'name login')
    .populate('sent_by_agent', 'name login')
    .populate('mailserver_id', 'email_address name');

  // Sort by received_at for incoming, sent_at for outgoing
  if (options.direction === 'outgoing') {
    query = query.sort({ sent_at: -1 });
  } else if (options.direction === 'incoming') {
    query = query.sort({ received_at: -1 });
  } else {
    // Mixed direction - sort by most recent activity
    query = query.sort({ createdAt: -1 });
  }

  return query;
};

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;
