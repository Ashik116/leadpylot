const mongoose = require('mongoose');

/**
 * ClosedAppointment Schema
 * Represents appointments/termine for closed leads
 * Preserves appointment history for historical reference
 */
const ClosedAppointmentSchema = new mongoose.Schema(
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

    // === Original Appointment Data (from Appointment model) ===
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
    collection: 'closedappointments',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full appointment datetime
ClosedAppointmentSchema.virtual('fullDateTime').get(function () {
  if (this.appointment_time) {
    const date = new Date(this.appointment_date);
    const [hours, minutes] = this.appointment_time.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    return date;
  }
  return this.appointment_date;
});

// Create indexes for common queries
ClosedAppointmentSchema.index({ closed_lead_id: 1, appointment_date: 1 });
ClosedAppointmentSchema.index({ original_appointment_id: 1 });
ClosedAppointmentSchema.index({ created_by: 1, appointment_date: 1 });
ClosedAppointmentSchema.index({ appointment_date: 1, status: 1 });
ClosedAppointmentSchema.index({ active: 1, appointment_date: 1 });

module.exports = mongoose.model('ClosedAppointment', ClosedAppointmentSchema);
