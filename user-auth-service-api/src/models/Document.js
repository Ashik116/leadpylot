const mongoose = require('mongoose');

/**
 * Document Schema
 * Represents a document file uploaded to the system
 * Enhanced to support library functionality and assignment tracking
 * 
 * Note: This is a reference schema for user-auth-service to populate image_id
 * The primary Document service is pdf-service
 */
const documentSchema = new mongoose.Schema(
  {
    filetype: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'contract',
        'id',
        'extra',
        'email',
        'confirmation',
        'payment_voucher',
        'offer',
        'opening',
        'offer-contract',
        'offer-extra',
        'offer-email',
        'offer-contact',
        'opening-contract',
        'opening-id',
        'opening-extra',
        'opening-email',
        'opening-mail',
        'confirmation-contract',
        'confirmation-extra',
        'confirmation-email',
        'confirmation-mail',
        'payment-contract',
        'payment-extra',
        'payment-email',
        'payment-mail',
        'netto1-mail',
        'netto2-mail',
      ],
      required: true,
    },
    uploader_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    active: {
      type: Boolean,
      default: true,
    },

    // === LIBRARY FUNCTIONALITY ===
    // Document library status
    library_status: {
      type: String,
      enum: ['library', 'assigned', 'archived'],
      default: 'library', // Documents start in library by default
    },

    // Tags for categorization and search
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Notes about the document
    notes: {
      type: String,
      trim: true,
    },

    // Search optimization
    searchable_text: {
      type: String,
      index: true, // For faster text search
    },

    // File metadata
    metadata: {
      original_filename: String,
      file_hash: String, // MD5 hash for deduplication
      content_type: String,
      extracted_text: String, // For future OCR integration
    },

    // === ASSIGNMENT TRACKING ===
    // Current assignments (can be assigned to multiple entities)
    assignments: [
      {
        entity_type: {
          type: String,
          enum: ['lead', 'offer', 'opening', 'confirmation', 'payment_voucher'],
          required: true,
        },
        entity_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        assigned_at: {
          type: Date,
          default: Date.now,
        },
        assigned_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        active: {
          type: Boolean,
          default: true,
        },
        notes: String,
      },
    ],

    // Assignment history for audit trail
    assignment_history: [
      {
        action: {
          type: String,
          enum: ['assigned', 'unassigned', 'reassigned'],
          required: true,
        },
        entity_type: String,
        entity_id: mongoose.Schema.Types.ObjectId,
        performed_at: {
          type: Date,
          default: Date.now,
        },
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// === SCHEMA METHODS ===

// Update searchable text when document is saved
documentSchema.pre('save', function (next) {
  // Build searchable text from filename, tags, and notes
  const searchParts = [
    this.filename,
    this.metadata?.original_filename,
    ...(this.tags || []),
    this.notes,
  ].filter(Boolean);

  this.searchable_text = searchParts.join(' ').toLowerCase();
  next();
});

// Instance methods
documentSchema.methods.assignTo = function (entityType, entityId, assignedBy, notes = '') {
  // Check if already assigned to this entity
  const existingAssignment = this.assignments.find(
    (a) =>
      a.entity_type === entityType && a.entity_id.toString() === entityId.toString() && a.active
  );

  if (existingAssignment) {
    return { success: false, message: 'Document already assigned to this entity' };
  }

  // Add new assignment
  this.assignments.push({
    entity_type: entityType,
    entity_id: entityId,
    assigned_by: assignedBy,
    notes: notes,
  });

  // Add to history
  this.assignment_history.push({
    action: 'assigned',
    entity_type: entityType,
    entity_id: entityId,
    performed_by: assignedBy,
    notes: notes,
  });

  // Update library status
  this.library_status = 'assigned';

  return { success: true, message: 'Document assigned successfully' };
};

documentSchema.methods.unassignFrom = function (entityType, entityId, performedBy, notes = '') {
  // Find and deactivate assignment
  const assignment = this.assignments.find(
    (a) =>
      a.entity_type === entityType && a.entity_id.toString() === entityId.toString() && a.active
  );

  if (!assignment) {
    return { success: false, message: 'Assignment not found' };
  }

  assignment.active = false;

  // Add to history
  this.assignment_history.push({
    action: 'unassigned',
    entity_type: entityType,
    entity_id: entityId,
    performed_by: performedBy,
    notes: notes,
  });

  // Update library status if no active assignments
  const hasActiveAssignments = this.assignments.some((a) => a.active);
  if (!hasActiveAssignments) {
    this.library_status = 'library';
  }

  return { success: true, message: 'Document unassigned successfully' };
};

documentSchema.methods.getActiveAssignments = function () {
  return this.assignments.filter((a) => a.active);
};

documentSchema.methods.isAssignedTo = function (entityType, entityId) {
  return this.assignments.some(
    (a) =>
      a.entity_type === entityType && a.entity_id.toString() === entityId.toString() && a.active
  );
};

// Change document type
documentSchema.methods.changeType = function (newType, performedBy, notes = '') {
  const oldType = this.type;
  this.type = newType;

  // Add to history
  this.assignment_history.push({
    action: 'type_changed',
    performed_by: performedBy,
    notes: notes || `Type changed from ${oldType} to ${newType}`,
    metadata: {
      old_type: oldType,
      new_type: newType,
    },
  });

  return { success: true, message: `Document type changed from ${oldType} to ${newType}` };
};

// Reassign document to different entity
documentSchema.methods.reassignTo = function (newEntityType, newEntityId, performedBy, notes = '') {
  // Get current active assignments
  const activeAssignments = this.assignments.filter((a) => a.active);

  if (activeAssignments.length === 0) {
    return { success: false, message: 'Document has no active assignments to reassign' };
  }

  // Deactivate all current assignments
  activeAssignments.forEach((assignment) => {
    assignment.active = false;

    // Add unassignment to history
    this.assignment_history.push({
      action: 'unassigned',
      entity_type: assignment.entity_type,
      entity_id: assignment.entity_id,
      performed_by: performedBy,
      notes: `Unassigned for reassignment to ${newEntityType}:${newEntityId}`,
    });
  });

  // Create new assignment
  const assignResult = this.assignTo(
    newEntityType,
    newEntityId,
    performedBy,
    notes || `Reassigned from ${activeAssignments[0].entity_type}`
  );

  if (assignResult.success) {
    return { success: true, message: `Document reassigned to ${newEntityType}:${newEntityId}` };
  } else {
    return assignResult;
  }
};

// Static methods
documentSchema.statics.findLibraryDocuments = function (filters = {}) {
  const query = {
    library_status: { $in: ['library', 'assigned'] },
    active: true,
    ...filters,
  };
  return this.find(query);
};

documentSchema.statics.searchDocuments = function (searchText, filters = {}) {
  const query = {
    active: true,
    library_status: { $in: ['library', 'assigned'] },
    ...filters,
  };

  if (searchText) {
    query.$or = [
      { filename: { $regex: searchText, $options: 'i' } },
      { searchable_text: { $regex: searchText, $options: 'i' } },
      { tags: { $in: [new RegExp(searchText, 'i')] } },
    ];
  }

  return this.find(query);
};

documentSchema.statics.findByAssignment = function (entityType, entityId) {
  return this.find({
    assignments: {
      $elemMatch: {
        entity_type: entityType,
        entity_id: entityId,
        active: true,
      },
    },
    active: true,
  });
};

// Virtual for assignment count
documentSchema.virtual('assignmentCount').get(function () {
  return this.assignments.filter((a) => a.active).length;
});

// Virtual for formatted size
documentSchema.virtual('formattedSize').get(function () {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtuals are included in JSON
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

// Only register the model if it doesn't already exist
// This prevents errors if the model is already registered
const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

module.exports = Document;

