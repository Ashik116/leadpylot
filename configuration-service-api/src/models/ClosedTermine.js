const mongoose = require('mongoose');

/**
 * ClosedTermine (Appointment) Schema
 * Represents an appointment/termine for closed leads
 * Preserves appointment history for historical reference
 */
const ClosedTermineSchema = new mongoose.Schema(
  {
    // Original appointment reference
    original_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: false,
      index: true,
    },

    // Closed lead reference
    closed_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClosedLead',
      required: true,
      index: true,
    },

    // === Original Appointment Data ===
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointment_date: {
      type: Date,
      required: true,
      index: true,
    },
    appointment_time: {
      type: String,
      required: false,
      trim: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      default: 'Appointment',
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      index: true,
    },
    reminder_sent: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'closedtermine',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full appointment datetime
ClosedTermineSchema.virtual('fullDateTime').get(function () {
  if (this.appointment_time) {
    const date = new Date(this.appointment_date);
    const [hours, minutes] = this.appointment_time.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    return date;
  }
  return this.appointment_date;
});

// Create indexes for common queries
ClosedTermineSchema.index({ closed_lead_id: 1, appointment_date: 1 });
ClosedTermineSchema.index({ original_appointment_id: 1 });
ClosedTermineSchema.index({ created_by: 1, appointment_date: 1 });
ClosedTermineSchema.index({ appointment_date: 1, status: 1 });
ClosedTermineSchema.index({ active: 1, appointment_date: 1 });

module.exports = mongoose.model('ClosedTermine', ClosedTermineSchema);
