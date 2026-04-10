const mongoose = require('mongoose')

// Default roles (for backward compatibility)
const DEFAULT_ROLES = [
  'Admin',
  'Agent',
  'Manager',
  'Banker',
  'Client',
  'Provider',
]

const UserSchema = new mongoose.Schema(
  {
    id: Number,
    company_id: Number,
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
    info: { type: Object, default: null },
    active: { type: Boolean, default: true },
    create_date: { type: Date, default: Date.now },
    login: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allow null/undefined values while still enforcing uniqueness when present
      index: true,
    },
    password: {
      type: String,
      required: function() {
        // Password not required if user authenticates via SSO
        return !this.authentik_id;
      },
    },
    // Authentik SSO - external identity provider ID
    authentik_id: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
      comment: 'Authentik user subject ID (sub claim) for SSO authentication',
    },
    // Last SSO login timestamp
    last_sso_login: {
      type: Date,
      default: null,
    },
    // Role is now a string that matches a Role document name
    // Removed enum validation to allow dynamic roles from database
    role: {
      type: String,
      default: 'Agent',
      required: true,
      trim: true,
      // Async validation against Role collection
      // validate: {
      //   validator: async function (value) {
      //     // Allow default roles without DB check for backward compatibility
      //     if (DEFAULT_ROLES.includes(value)) {
      //       return true;
      //     }
      //     // Check if role exists in database
      //     try {
      //       const Role = mongoose.model('Role');
      //       const role = await Role.findOne({ name: value, active: true });
      //       return !!role;
      //     } catch (error) {
      //       // If Role model not registered yet, allow default roles
      //       return DEFAULT_ROLES.includes(value);
      //     }
      //   },
      //   message: (props) => `${props.value} is not a valid role!`,
      // },
    },
    action_id: Number,
    create_uid: Number,
    write_uid: Number,
    signature: String,
    share: Boolean,
    write_date: { type: Date, default: Date.now },
    totp_secret: String,
    notification_type: { type: String, default: 'email' },
    odoobot_state: String,
    odoobot_failed: Boolean,
    sale_team_id: Number,
    target_sales_won: Number,
    target_sales_done: Number,
    instance_userid: Number,
    anydesk: String,
    instance_status: String,
    instance_password: String,
    instance_message: String,
    backoffice: Boolean,
    instance_config_id: Number,
    instance_user_id: Number,
    unmask: { type: Boolean, default: false }, // Allow agent to see raw contact info

    // VoIP extension fields — one extension per user (unique only for non-empty strings; see index below)
    voip_extension: { type: String },
    voip_password: { type: String },
    voip_status: {
      type: String,
      enum: ['registered', 'unregistered', 'busy', 'dnd'],
      default: 'unregistered',
    },
    voip_enabled: { type: Boolean, default: false },

    view_type: {
      type: String,
      enum: ['listView', 'detailsView'],
      default: 'detailsView',
    },
    lastModified: { type: Date, default: Date.now },
    color_code: { type: String, default: null },
    image_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },

    // Individual permission overrides for this user
    // If set, these permissions are used instead of or in addition to role permissions
    permissions: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Commission percentages by offer category
    commission_percentage_opening: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Commission percentage for OPENING offers',
    },
    commission_percentage_load: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Commission percentage for LOAD offers',
    },

    // Other platform credentials (optional)
    // Stores login credentials for external platforms
    other_platform_credentials: {
      type: [
        {
          userName: {
            type: String,
            trim: true,
          },
          userEmail: {
            type: String,
            trim: true,
            lowercase: true,
          },
          userPass: {
            type: String, // Stored encrypted
          },
          link: {
            type: String,
            trim: true,
          },
          platform_name: {
            type: String,
            trim: true,
          },

          // Bot integration fields for Telegram, Discord, etc.
          platform_type: {
            type: String,
            enum: ['email', 'telegram', 'discord', 'other'],
            default: 'email',
            comment: 'Type of platform for bot notifications',
          },
          chat_id: {
            type: String,
            default: null,
            comment: 'Telegram chat_id or Discord user_id for bot notifications',
          },
          telegram_username: {
            type: String,
            default: null,
            comment: 'Telegram username (without @)',
          },
          telegram_phone: {
            type: String,
            default: null,
            comment: 'Telegram phone number (international format)',
          },
          bot_enabled: {
            type: Boolean,
            default: false,
            comment: 'Whether bot notifications are enabled for this platform',
          },
          linked_at: {
            type: Date,
            default: null,
            comment: 'When the bot account was linked',
          },
          bot_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TelegramBot',
            default: null,
            comment: 'Reference to the Telegram bot configuration used for linking',
          },
        },
      ],
      default: [],
      _id: true, // Enable _id for subdocuments so we can reference them by ID
    },

    // Mail server assignments (many-to-many with Settings where type='mailservers')
    mail_servers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Settings' }],
      default: [],
      index: true,
    },

    // Office assignments (many-to-many with Office)
    offices: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Office' }],
      default: [],
      index: true,
    },
    primary_office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Office',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password // Remove password from JSON output
        return ret
      },
    },
    toObject: { virtuals: true },
  }
)

// Virtual: office count
UserSchema.virtual('office_count').get(function () {
  return this.offices ? this.offices.length : 0
})

// Instance: check if user is assigned to office
UserSchema.methods.isInOffice = function (officeId) {
  return this.offices && this.offices.some((id) => id && id.toString() === officeId.toString())
}

// Instance: add office to user
UserSchema.methods.addOffice = function (officeId, setPrimary = false) {
  if (!this.offices) this.offices = []
  if (this.isInOffice(officeId)) return false
  this.offices.push(officeId)
  if (setPrimary) this.primary_office = officeId
  return true
}

// Instance: remove office from user
UserSchema.methods.removeOffice = function (officeId) {
  if (!this.offices) return false
  const before = this.offices.length
  this.offices = this.offices.filter((id) => id && id.toString() !== officeId.toString())
  if (this.primary_office && this.primary_office.toString() === officeId.toString()) {
    this.primary_office = this.offices[0] || null
  }
  return this.offices.length < before
}

// Instance: set primary office (must be in offices array)
UserSchema.methods.setPrimaryOffice = function (officeId) {
  if (!this.isInOffice(officeId)) return false
  this.primary_office = officeId
  return true
}

// Static: find active users in office
UserSchema.statics.findByOffice = function (officeId) {
  return this.find({ offices: officeId, active: true })
}

// Static: find users with this primary office
UserSchema.statics.findByPrimaryOffice = function (officeId) {
  return this.find({ primary_office: officeId, active: true })
}

// Add a pre-save hook to update lastModified date and office consistency
UserSchema.pre('save', function (next) {
  this.lastModified = new Date()
  // Remove duplicate offices
  if (this.offices && this.offices.length > 0) {
    const seen = new Set()
    this.offices = this.offices.filter((id) => {
      const key = id ? id.toString() : ''
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  // Ensure primary_office is in offices array
  if (this.primary_office && this.offices && this.offices.length > 0) {
    const primaryStr = this.primary_office.toString()
    const inList = this.offices.some((id) => id && id.toString() === primaryStr)
    if (!inList) this.primary_office = null
  }
  next()
})

// Add a pre-update hook
UserSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate()
  if (update && !update.$set) {
    this.set({ lastModified: new Date() })
  } else if (update && update.$set) {
    update.$set.lastModified = new Date()
  } else {
    this.set({ lastModified: new Date() })
  }
  next()
})

// When user is deleted, remove them from all offices' employees arrays
function removeUserFromOffices(userId) {
  const Office = mongoose.model('Office')
  return Office.updateMany({ employees: userId }, { $pull: { employees: userId } })
}

UserSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    await removeUserFromOffices(this._id)
  } catch (error) {
    console.error('Error removing user from offices:', error)
  }
})

UserSchema.post('findOneAndDelete', async function (result) {
  if (result && result._id) {
    try {
      await removeUserFromOffices(result._id)
    } catch (error) {
      console.error('Error removing user from offices:', error)
    }
  }
})

// Static method to get default values for a new user
UserSchema.statics.getDefaults = function () {
  return {
    id: null,
    company_id: null,
    partner_id: null,
    info: null,
    active: true,
    create_date: new Date(),
    login: null,
    password: null,
    role: 'Agent', // Default role is Agent
    action_id: null,
    create_uid: null,
    write_uid: null,
    signature: null,
    share: false,
    write_date: new Date(),
    totp_secret: null,
    notification_type: 'email',
    odoobot_state: null,
    odoobot_failed: false,
    sale_team_id: null,
    target_sales_won: null,
    target_sales_done: null,
    instance_userid: null,
    anydesk: null,
    instance_status: null,
    instance_password: null,
    instance_message: null,
    backoffice: false,
    instance_config_id: null,
    instance_user_id: null,
    unmask: false,
    view_type: 'detailsView',
    color_code: null,
    image_id: null,
    commission_percentage_opening: 0,
    commission_percentage_load: 0,
    other_platform_credentials: [],
    mail_servers: [],
    offices: [],
    primary_office: null,
  }
}

// Unique only when voip_extension is a non-empty string — avoids E11000 on duplicate { voip_extension: null }
UserSchema.index(
  { voip_extension: 1 },
  {
    unique: true,
    partialFilterExpression: {
      voip_extension: { $exists: true, $type: 'string', $gt: '' },
    },
  }
)

module.exports = mongoose.model('User', UserSchema)
