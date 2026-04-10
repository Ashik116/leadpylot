const mongoose = require('mongoose');

/**
 * Agent Schema
 * Embedded agent details within projects
 */
const AgentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.Mixed, // Allow both Number and String/ObjectId
      required: false, // Make it optional since we have user field
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    assignment_max: Number,
    assignment_domain: String,
    assignment_optout: Boolean,
    name: String,
    alias_name: String,
    email_address: String,
    email_password: String, // Encrypted
    voip_username: String,
    voip_password: String, // Encrypted
    alias_phone_number: String,
    lead_receive: {
      type: Boolean,
      default: true,
    },
    // Mail servers assigned to this agent within the project
    mailservers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Settings',
      },
    ],
    // Optional attachment for agent (profile picture, ID document, etc.)
    attachment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
    },
    // Email signature document (ref Document)
    email_signature: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Project Schema
 * Organizational structure for leads and agents
 * Previously called "Team" in monolith
 */
const ProjectSchema = new mongoose.Schema(
  {
    // Legacy fields for migration compatibility
    id: Number,
    sequence: Number,
    company_id: Number,
    color: Number,
    color_code: String,
    create_uid: Number,
    write_uid: Number,

    // Core project fields
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Legacy date fields
    create_date: {
      type: Date,
      default: Date.now,
    },
    write_date: {
      type: Date,
      default: Date.now,
    },

    // Legacy fields
    alias_id: Number,
    assignment_domain: String,
    lead_properties_definition: mongoose.Schema.Types.Mixed,
    use_leads: {
      type: Boolean,
      default: true,
    },
    use_opportunities: {
      type: Boolean,
      default: false,
    },
    assignment_optout: Boolean,
    resource_calendar_id: Number,
    alias_name: String,

    // Project-specific information
    project_alias: String,
    project_website: String,
    project_email: String,
    project_phone: String,
    project_whatsapp: String,
    project_hr_number: String,
    
    // Company information
    project_company_id: String,
    project_lei_code: String,
    project_create_date: String,
    project_ceo: String,
    project_chamber_of_commerce: String,
    project_finance_authority: String,
    project_finma: String,
    
    // Addresses
    project_address1: String,
    project_address2: String,
    project_address3: String,

    // Links and integrations
    deport_link: String,
    inbound_email: String,
    inbound_number: String,

    // VoIP call routing
    outbound_cid: String,
    inbound_did: String,
    trunk_name: String,

    // Instance fields (for multi-tenant systems)
    instance_ip: String,
    instance_token: String,
    instance_user: Number,
    instance_database: String,
    instance_config_id: Number,
    instance_project_id: Number,

    // Server settings
    mailserver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings', // Primary mail server (backward compatibility)
    },
    mailservers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Settings', // Support multiple mail servers
      },
    ],
    voipserver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
    },

    // Associated banks
    banks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
      },
    ],

    // Project document files
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
    },
    confirmation_email: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
    },

    // Embedded array of agents
    agents: [AgentSchema],

    // Linked PDF templates for this project
    pdf_templates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PdfTemplate',
      },
    ],

    // Linked email templates for this project (many-to-many with Settings type=email_templates)
    email_templates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Settings',
      },
    ],
  },
  { 
    timestamps: true,
    collection: 'teams' // Keep existing collection name for compatibility
  }
);

// Indexes for performance
ProjectSchema.index({ name: 1 });
ProjectSchema.index({ active: 1 });
ProjectSchema.index({ mailservers: 1 });
ProjectSchema.index({ mailserver_id: 1 });
ProjectSchema.index({ 'agents.user': 1 });
ProjectSchema.index({ email_templates: 1 });

/**
 * Get all mail servers for this project (combines single and multiple)
 */
ProjectSchema.methods.getAllMailServers = function () {
  const mailservers = [...(this.mailservers || [])];

  // Include legacy single mailserver_id if it exists and not already in mailservers array
  if (
    this.mailserver_id &&
    !mailservers.some((ms) => ms.toString() === this.mailserver_id.toString())
  ) {
    mailservers.push(this.mailserver_id);
  }

  return mailservers;
};

/**
 * Add a mail server to this project
 */
ProjectSchema.methods.addMailServer = function (mailserverId) {
  if (!this.mailservers) {
    this.mailservers = [];
  }

  // Don't add duplicates
  if (!this.mailservers.some((ms) => ms.toString() === mailserverId.toString())) {
    this.mailservers.push(mailserverId);
  }

  // If this is the first mail server, also set as primary
  if (!this.mailserver_id) {
    this.mailserver_id = mailserverId;
  }

  return this;
};

/**
 * Remove a mail server from this project
 */
ProjectSchema.methods.removeMailServer = function (mailserverId) {
  if (this.mailservers) {
    this.mailservers = this.mailservers.filter((ms) => ms.toString() !== mailserverId.toString());
  }

  // If removing the primary mail server, set a new primary
  if (this.mailserver_id && this.mailserver_id.toString() === mailserverId.toString()) {
    this.mailserver_id =
      this.mailservers && this.mailservers.length > 0 ? this.mailservers[0] : null;
  }

  return this;
};

/**
 * Check if project has a specific mail server
 */
ProjectSchema.methods.hasMailServer = function (mailserverId) {
  const allMailServers = this.getAllMailServers();
  return allMailServers.some((ms) => ms.toString() === mailserverId.toString());
};

/**
 * Check if user is an agent in this project
 */
ProjectSchema.methods.hasAgent = function (userId) {
  if (!this.agents || this.agents.length === 0) return false;
  if (!userId) return false;
  
  const userIdStr = userId.toString();
  return this.agents.some(agent => {
    // Check both user and user_id fields for compatibility
    const agentUserId = agent.user ? agent.user.toString() : (agent.user_id ? agent.user_id.toString() : null);
    return agentUserId === userIdStr && agent.active !== false;
  });
};

/**
 * Get active agents for this project
 */
ProjectSchema.methods.getActiveAgents = function () {
  if (!this.agents) return [];
  return this.agents.filter(agent => agent.active !== false);
};

// Export as both Project and Team for compatibility
const ProjectModel = mongoose.model('Project', ProjectSchema);

// Also register as 'Team' for backward compatibility
// This allows ref: 'Team' to work in other schemas
try {
  mongoose.model('Team');
} catch (e) {
  // Team doesn't exist, create an alias
  mongoose.model('Team', ProjectSchema);
}

module.exports = ProjectModel;

