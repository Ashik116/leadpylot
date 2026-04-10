const mongoose = require('mongoose');

/**
 * Office Model - Simplified Version
 * Only 'name' is required. All other fields are optional.
 *
 * This model represents office locations where employees work.
 * Supports many-to-many relationship with Users.
 */

const OfficeSchema = new mongoose.Schema(
  {
    // ========================================================================
    // REQUIRED FIELDS
    // ========================================================================

    name: {
      type: String,
      required: [true, 'Office name is required'],
      trim: true,
      maxlength: [200, 'Office name cannot exceed 200 characters'],
      index: true,
    },

    // ========================================================================
    // OPTIONAL FIELDS - Location & Contact
    // ========================================================================

    country: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [100, 'Country name cannot exceed 100 characters'],
      index: true,
      default: null,
    },

    address: {
      street: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, default: null },
      postal_code: { type: String, trim: true, default: null },
      country_code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 3,
        default: null,
      },
    },

    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },

    contact: {
      phone: { type: String, trim: true, default: null },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      fax: { type: String, trim: true, default: null },
    },

    // ========================================================================
    // OPTIONAL FIELDS - Employees (Many-to-Many Relationship)
    // ========================================================================

    employees: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },

    manager_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
      default: null,
    },

    // ========================================================================
    // OPTIONAL FIELDS - Working Hours (Default 9-5 schedule)
    // ========================================================================

    working_hours: {
      monday: {
        is_working_day: { type: Boolean, default: true },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      tuesday: {
        is_working_day: { type: Boolean, default: true },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      wednesday: {
        is_working_day: { type: Boolean, default: true },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      thursday: {
        is_working_day: { type: Boolean, default: true },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      friday: {
        is_working_day: { type: Boolean, default: true },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      saturday: {
        is_working_day: { type: Boolean, default: false },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
      sunday: {
        is_working_day: { type: Boolean, default: false },
        start_time: { type: String, default: '09:00' },
        end_time: { type: String, default: '17:00' },
        breaks: { type: Array, default: [] },
      },
    },

    weekend_days: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['saturday', 'sunday'],
    },

    special_dates: {
      type: [
        {
          date: { type: Date, required: true },
          description: { type: String, trim: true },
          is_holiday: { type: Boolean, default: true },
        },
      ],
      default: [],
    },

    // ========================================================================
    // OPTIONAL FIELDS - Status & Metadata
    // ========================================================================

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: null,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

OfficeSchema.index({ active: 1, country: 1 });
OfficeSchema.index({ employees: 1 });
OfficeSchema.index({ name: 'text' });

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

OfficeSchema.virtual('employee_count').get(function () {
  return this.employees ? this.employees.length : 0;
});

OfficeSchema.virtual('is_at_capacity').get(function () {
  if (!this.capacity) return false;
  return this.employees && this.employees.length >= this.capacity;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if office is open on a specific date
 */
OfficeSchema.methods.isOpenOn = function (date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const daySchedule = this.working_hours && this.working_hours[dayName];
  return daySchedule && daySchedule.is_working_day;
};

/**
 * Check if user is employee of this office
 */
OfficeSchema.methods.hasEmployee = function (userId) {
  return this.employees && this.employees.some((empId) => empId && empId.equals(userId));
};

/**
 * Add employee to office
 */
OfficeSchema.methods.addEmployee = async function (userId) {
  if (this.hasEmployee(userId)) return false;

  if (this.capacity && this.employees.length >= this.capacity) {
    throw new Error('Office is at maximum capacity');
  }

  this.employees.push(userId);
  await this.save();
  return true;
};

/**
 * Remove employee from office
 */
OfficeSchema.methods.removeEmployee = async function (userId) {
  const initialLength = this.employees.length;
  this.employees = this.employees.filter((empId) => empId && !empId.equals(userId));

  if (this.employees.length < initialLength) {
    await this.save();
    return true;
  }
  return false;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

OfficeSchema.statics.findByCountry = function (country) {
  return this.find({ country: country.toUpperCase(), active: true });
};

OfficeSchema.statics.findByEmployee = function (userId) {
  return this.find({ employees: userId, active: true });
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

OfficeSchema.pre('save', function (next) {
  // Remove duplicate employees
  if (this.employees && this.employees.length > 0) {
    const uniqueIds = [...new Set(this.employees.map((id) => id.toString()))];
    this.employees = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
  }
  next();
});

// Clean up user references when office is deleted (doc.deleteOne())
OfficeSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    const User = mongoose.model('User');
    await User.updateMany({ offices: this._id }, { $pull: { offices: this._id } });
  } catch (error) {
    console.error('Error cleaning up office references:', error);
  }
});

// Clean up when office is deleted via findByIdAndDelete / findOneAndDelete
OfficeSchema.post('findOneAndDelete', async function (result) {
  if (result && result._id) {
    try {
      const User = mongoose.model('User');
      await User.updateMany({ offices: result._id }, { $pull: { offices: result._id } });
    } catch (error) {
      console.error('Error cleaning up office references:', error);
    }
  }
});

module.exports = mongoose.model('Office', OfficeSchema);
