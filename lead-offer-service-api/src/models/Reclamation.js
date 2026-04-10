const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReclamationSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false, // Optional for admin users
  },
  agent_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for admin users
  },
  lead_id: {
    type: Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    enum: [0, 1, 2], // 0 - Pending, 1 - Accepted, 2 - Rejected
    default: 0,
  },
  response: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the timestamp before saving
ReclamationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Reclamation', ReclamationSchema);
