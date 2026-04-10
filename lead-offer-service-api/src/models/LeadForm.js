const mongoose = require('mongoose');

const formatRevenueForResponse = (value) => {
  const n = value == null || value === '' ? 0 : Math.round(Number(value) || 0);
  if (n <= 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}b`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  return String(n);
};

const LeadFormSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    contact_name: {
      type: String,
      trim: true,
    },
    use_status: {
      type: String,
      enum: ['none', 'pending', 'converted'],
      default: 'none',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    site_link: {
      type: String,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      trim: true,
      index: true,
    },
    expected_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    lead_source_no: {
      type: String,
      trim: true,
      unique: true,
      index: true,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const MAX_LEAD_SOURCE_NO_ATTEMPTS = 10;

LeadFormSchema.pre('save', function (next) {
  this.contact_name = `${this.first_name || ''} ${this.last_name || ''}`.trim();
  next();
});

LeadFormSchema.pre('validate', async function (next) {
  if (this.isNew && !this.lead_source_no) {
    const siteLink = this.site_link || '';
    let hostname = '';
    try {
      if (siteLink && typeof siteLink === 'string') {
        const trimmed = siteLink.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const url = new URL(trimmed);
          hostname = url.hostname || '';
        } else {
          hostname = trimmed.split('/')[0].split(':')[0] || '';
        }
      }
    } catch (_) {
      hostname = '';
    }
    const clean = hostname.replace(/[^a-z0-9.-]/gi, '').toLowerCase();
    const first = clean.charAt(0) || 'x';
    const last = clean.charAt(clean.length - 1) || 'x';
    const prefix = `${first}${last}`;
    const Model = this.constructor;
    for (let attempt = 0; attempt < MAX_LEAD_SOURCE_NO_ATTEMPTS; attempt++) {
      const suffix = String(Math.floor(100000 + Math.random() * 900000));
      const candidate = `${prefix}-${suffix}`;
      const exists = await Model.exists({ lead_source_no: candidate });
      if (!exists) {
        this.lead_source_no = candidate;
        break;
      }
    }
    if (!this.lead_source_no) {
      this.lead_source_no = `${prefix}-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

LeadFormSchema.index({ is_deleted: 1, createdAt: -1 });
LeadFormSchema.index({ is_deleted: 1, source: 1, createdAt: -1 });
LeadFormSchema.index({ lead_source_no: 1 }, { unique: true });

LeadFormSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    id: this._id.toString(),
    first_name: this.first_name,
    last_name: this.last_name,
    contact_name: this.contact_name,
    email: this.email,
    phone: this.phone,
    site_link: this.site_link,
    source: this.source,
    expected_revenue: formatRevenueForResponse(this.expected_revenue),
    lead_source_no: this.lead_source_no,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('LeadForm', LeadFormSchema);
