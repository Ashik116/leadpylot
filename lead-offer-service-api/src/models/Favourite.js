const mongoose = require('mongoose');

/**
 * Favourite Schema
 * Tracks which leads are marked as favourite by which users
 */
const favouriteSchema = new mongoose.Schema(
  {
    // Lead reference
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    
    // User who marked as favourite
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // When it was marked as favourite
    marked_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    
    // Additional metadata about when marked
    marked_details: {
      ip_address: String,
      user_agent: String,
      source: {
        type: String,
        enum: ['web', 'api', 'mobile'],
        default: 'web'
      }
    },
    
    // Lead snapshot when marked (for quick access)
    lead_snapshot: {
      contact_name: String,
      email_from: String,
      phone: String,
      status: String,
      stage: String,
      expected_revenue: Number,
      lead_date: Date,
      source_name: String, // populated source name
      project_name: String, // populated project name
      agent_name: String, // populated agent name
    },
    
    // Related offers count (cached for performance)
    offers_count: {
      type: Number,
      default: 0,
    },
    
    // Related offers IDs (for quick reference)
    offer_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    }],
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    
    // Notes about why it's favourite
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    // Active status
    active: {
      type: Boolean,
      default: true,
    },
    
    // Last accessed date
    last_accessed_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    indexes: [
      { lead_id: 1, user_id: 1 }, // compound index for uniqueness check
      { user_id: 1, active: 1, marked_at: -1 }, // for user's favourites query
      { lead_id: 1, active: 1 }, // for checking if lead is favourite
      { marked_at: -1 }, // for sorting by recent
    ]
  }
);

// Compound unique index to ensure one favourite per user per lead
favouriteSchema.index({ lead_id: 1, user_id: 1 }, { unique: true });

// Pre-save middleware to update lead snapshot and offers info
favouriteSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('lead_id')) {
    try {
      // Populate lead information
      const Lead = mongoose.model('Lead');
      const Offer = mongoose.model('Offer');
      const Source = mongoose.model('Source');
      const Team = mongoose.model('Team');
      const User = mongoose.model('User');
      const AssignLeads = mongoose.model('AssignLeads');
      
      const lead = await Lead.findById(this.lead_id)
        .populate('source_id', 'name')
        .lean();
      
      if (lead) {
        // Update lead snapshot
        this.lead_snapshot = {
          contact_name: lead.contact_name,
          email_from: lead.email_from,
          phone: lead.phone,
          status: lead.status,
          stage: lead.stage,
          expected_revenue: lead.expected_revenue,
          lead_date: lead.lead_date,
          source_name: lead.source_id?.name || null,
        };
        
        // Get project and agent info from assignments
        const assignment = await AssignLeads.findOne({ 
          lead_id: this.lead_id, 
          status: 'active' 
        })
          .populate('project_id', 'name color_code')
          .populate('agent_id', 'login first_name last_name')
          .lean();
        
        if (assignment) {
          this.lead_snapshot.project_name = assignment.project_id?.name;
          const agent = assignment.agent_id;
          if (agent) {
            this.lead_snapshot.agent_name = agent.first_name && agent.last_name 
              ? `${agent.first_name} ${agent.last_name}` 
              : agent.login;
          }
        }
        
        // Get offers info
        const offers = await Offer.find({ lead_id: this.lead_id, active: true })
          .select('_id')
          .lean();
        
        this.offers_count = offers.length;
        this.offer_ids = offers.map(offer => offer._id);
      }
    } catch (error) {
      console.error('Error updating favourite lead snapshot:', error);
      // Continue with save even if snapshot fails
    }
  }
  next();
});

// Instance method to update access time
favouriteSchema.methods.updateAccess = function() {
  this.last_accessed_at = new Date();
  return this.save();
};

// Static method to check if lead is favourite for user
favouriteSchema.statics.isFavourite = async function(leadId, userId) {
  const favourite = await this.findOne({
    lead_id: leadId,
    user_id: userId,
    active: true
  });
  return !!favourite;
};

// Static method to get user's favourite lead IDs
favouriteSchema.statics.getUserFavouriteLeadIds = async function(userId) {
  const favourites = await this.find({
    user_id: userId,
    active: true
  }).select('lead_id').lean();
  
  return favourites.map(fav => fav.lead_id);
};

const Favourite = mongoose.model('Favourite', favouriteSchema);

module.exports = Favourite; 