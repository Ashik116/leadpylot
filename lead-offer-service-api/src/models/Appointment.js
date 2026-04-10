const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
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
  }
);

// Create compound indexes for common queries
appointmentSchema.index({ lead_id: 1, active: 1 });
appointmentSchema.index({ created_by: 1, appointment_date: 1 });
appointmentSchema.index({ appointment_date: 1, status: 1 });
appointmentSchema.index({ active: 1, appointment_date: 1 });

// Virtual for full appointment datetime
appointmentSchema.virtual('fullDateTime').get(function () {
  if (this.appointment_time) {
    const date = new Date(this.appointment_date);
    const [hours, minutes] = this.appointment_time.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    return date;
  }
  return this.appointment_date;
});

// Include virtuals in JSON output
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
