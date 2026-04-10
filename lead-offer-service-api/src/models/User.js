const mongoose = require('mongoose');
const { ROLES } = require('../middleware/roles/roleDefinitions');

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
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.AGENT,
      required: true,
      // Include all roles in validation
      validate: {
        validator: function (value) {
          return (
            value === ROLES.ADMIN ||
            value === ROLES.AGENT ||
            value === ROLES.MANAGER ||
            value === ROLES.BANKER ||
            value === ROLES.CLIENT ||
            value === ROLES.PROVIDER
          );
        },
        message: (props) =>
          `${props.value} is not a valid role! Valid roles are: ${Object.values(ROLES).join(', ')}`,
      },
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
    view_type: { type: String, enum: ['listView', 'detailsView'], default: 'listView' }, // View type for masking logic
    lastModified: { type: Date, default: Date.now },
    color_code: { type: String, default: null },
    image_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password; // Remove password from JSON output
        return ret;
      },
    },
  }
);

// Add a pre-save hook to update lastModified date
UserSchema.pre('save', function (next) {
  this.lastModified = new Date();
  next();
});

// Add a pre-update hook
UserSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ lastModified: new Date() });
  next();
});

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
    role: ROLES.AGENT, // Default role is Agent
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
    view_type: 'listView',
    color_code: null,
    image_id: null,
    
  };
};

module.exports = mongoose.model('User', UserSchema);
