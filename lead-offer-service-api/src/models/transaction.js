const mongoose = require('mongoose');
const { ROLES } = require('../middleware/roles/roleDefinitions');
const { Schema } = mongoose;

// Define your transaction types here
const TRANSACTION_TYPES = {
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  LEAD: 'lead',
};

const transactionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user_role: {
      type: String,
      required: true,
      enum: [ROLES.AGENT, ROLES.PROVIDER, ROLES.ADMIN],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TRANSACTION_TYPES),
      index: true,
    },
    lead_id: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    assignment_id: {
      type: Schema.Types.ObjectId,
      ref: 'AssignLead',
      default: null,
      index: true,
    },
    payment_id: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: 'Amount must be a positive number',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ user_id: 1, type: 1 });
transactionSchema.index({ user_id: 1, createdAt: -1 });
transactionSchema.index({ lead_id: 1, type: 1 });
transactionSchema.index({ assignment_id: 1, status: 1 });

const TransactionName = 'Transaction';
const Transaction = mongoose.model(TransactionName, transactionSchema);

module.exports = { Transaction, TransactionName, TRANSACTION_TYPES };
