const mongoose = require('mongoose');

/**
 * User-scoped saved domain filter (Odoo-style tuples), e.g.
 * [["team_id","in",["..."]],["status_id","in",["..."]]]
 */
const savedFilterSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    /** UI / route context this preset applies to (e.g. lead, offer) */
    page: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    /** Preset type: filter (domain-based) or grouping (groupBy-based) */
    type: {
      type: String,
      enum: ['filter', 'grouping'],
      default: 'filter',
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    /** Grouping fields for type=grouping, e.g. ["team_id","user_id"] */
    groupBy: {
      type: [String],
      default: undefined,
    },
    /** Dynamic filter payload — array of domain clauses */
    domain: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'saved_filters',
  }
);

savedFilterSchema.index({ user_id: 1, page: 1, createdAt: -1 });
savedFilterSchema.index({ user_id: 1, page: 1, type: 1, createdAt: -1 });
savedFilterSchema.index({ user_id: 1, title: 1 });

const SavedFilter = mongoose.model('SavedFilter', savedFilterSchema);

module.exports = SavedFilter;
