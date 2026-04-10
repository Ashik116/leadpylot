const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema(
  {
    user_id: Number,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    email_password: String,
    voip_username: String,
    voip_password: String,
    alias_phone_number: String,
    lead_receive: {
      type: Boolean,
      default: true,
    },
    // Optional attachment for agent (profile picture, ID document, etc.)
    attachment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Schema for team (project) with embedded agents
 */
const TeamSchema = new mongoose.Schema(
  {
    id: Number,
    sequence: Number,
    company_id: Number,
    color: Number,
    create_uid: Number,
    write_uid: Number,
    name: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
    active: {
      type: Boolean,
      default: true,
    },
    create_date: {
      type: Date,
      default: Date.now,
    },
    write_date: {
      type: Date,
      default: Date.now,
    },
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

    // Project-specific fields
    project_alias: String,
    project_website: String,
    deport_link: String,
    inbound_email: String,
    inbound_number: String,
    project_email: String,
    project_phone: String,
    project_whatsapp: String,
    project_hr_number: String,
    project_company_id: String,
    project_lei_code: String,
    project_create_date: String,
    project_ceo: String,
    project_chamber_of_commerce: String,
    project_finance_authority: String,
    project_finma: String,
    project_address1: String,
    project_address2: String,
    project_address3: String,

    // Instance fields
    instance_ip: String,
    instance_token: String,
    instance_user: Number,
    instance_database: String,
    instance_config_id: Number,
    instance_project_id: Number,

    // Server settings - Support for multiple mail servers
    mailserver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
    }, // Keep for backward compatibility
    mailservers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Settings',
      },
    ], // New: Support multiple mail servers
    voipserver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
    },
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

    // Embedded array of agents (replacing separate TeamMember collection)
    agents: [AgentSchema],

    // Linked PDF templates for this project
    pdf_templates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PdfTemplate',
      },
    ],
  },
  { timestamps: true }
);

// Add an index on the name field for faster lookups
TeamSchema.index({ name: 1 });

// Add an index on active field for filtering
TeamSchema.index({ active: 1 });

// Add index for mail server queries
TeamSchema.index({ mailservers: 1 });
TeamSchema.index({ mailserver_id: 1 });

/**
 * Get all mail servers for this team (combines single and multiple)
 */
TeamSchema.methods.getAllMailServers = function () {
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
 * Add a mail server to this team
 */
TeamSchema.methods.addMailServer = function (mailserverId) {
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
 * Remove a mail server from this team
 */
TeamSchema.methods.removeMailServer = function (mailserverId) {
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
 * Check if team has a specific mail server
 */
TeamSchema.methods.hasMailServer = function (mailserverId) {
  const allMailServers = this.getAllMailServers();
  return allMailServers.some((ms) => ms.toString() === mailserverId.toString());
};

/**
 * Create a formatted response object for API
 */
TeamSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    id: this.id || this._id,
    name: this.name,
    description: this.description,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    banks: this.banks,
    deport_link: this.deport_link,
    project_website: this.project_website,
    inbound_email: this.inbound_email,
    inbound_number: this.inbound_number,
    contract: this.contract,
    confirmation_email: this.confirmation_email,
    pdf_templates: this.pdf_templates || [],
    agents: this.agents.map((agent) => ({
      _id: agent._id,
      user: agent.user,
      active: agent.active,
      name: agent.name,
      attachment: agent.attachment,
    })),
    agentsCount: this.agents ? this.agents.length : 0,
    // Mail server information
    mailserver_id: this.mailserver_id, // Primary mail server
    mailservers: this.mailservers || [], // All mail servers
    allMailServers: this.getAllMailServers(), // Combined list
  };
};

module.exports = mongoose.models.Team || mongoose.model('Team', TeamSchema);
