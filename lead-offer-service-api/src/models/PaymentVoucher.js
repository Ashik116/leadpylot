const mongoose = require('mongoose');

/**
 * Payment Voucher Schema
 * Represents a payment voucher with associated documents - can be linked directly to offer or through confirmation
 */
const paymentVoucherSchema = new mongoose.Schema(
  {
    // Direct reference to offer (new flexible approach)
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false, // Will be required when going directly from offer
    },
    // Reference to confirmation (chain approach)
    confirmation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Confirmation',
      required: false, // No longer always required
    },
    files: [
      {
        document: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      },
    ],
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Revert tracking fields
    revert_reason: {
      type: String,
      trim: true,
    },
    reverted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reverted_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Validation: Must have either offer_id or confirmation_id
paymentVoucherSchema.pre('validate', function(next) {
  if (!this.offer_id && !this.confirmation_id) {
    next(new Error('Payment voucher must have either offer_id or confirmation_id'));
  } else {
    next();
  }
});

const PaymentVoucher = mongoose.model('PaymentVoucher', paymentVoucherSchema);

module.exports = PaymentVoucher; 