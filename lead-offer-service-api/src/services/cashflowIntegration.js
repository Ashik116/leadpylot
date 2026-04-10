/**
 * Cashflow Integration Service
 * Handles cashflow entry creation directly via shared MongoDB
 * 
 * Since microservices are hosted on different servers but share the same
 * MongoDB database, we create cashflow entries directly in the database
 * instead of making HTTP API calls.
 * 
 * When a customer payment is received, this service creates a cashflow entry
 * to track the money movement through the banking system.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ============================================
// CASHFLOW MODELS (Inline definitions)
// Same schemas as cashflow-service uses
// ============================================

/**
 * Get or create CashflowEntry model
 */
const getCashflowEntryModel = () => {
  if (mongoose.models.CashflowEntry) {
    return mongoose.models.CashflowEntry;
  }

  const CashflowEntrySchema = new mongoose.Schema(
    {
      offer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
        required: true,
        index: true,
      },
      initial_bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
      },
      current_bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
        index: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'EUR',
        trim: true,
        uppercase: true,
      },
      status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
        index: true,
      },
      entered_at: {
        type: Date,
        default: Date.now,
      },
      entered_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      notes: {
        type: String,
        trim: true,
      },
      active: {
        type: Boolean,
        default: true,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    {
      timestamps: true,
      // No explicit collection - Mongoose will use 'cashflowentries' (matching cashflow-service)
    }
  );

  return mongoose.model('CashflowEntry', CashflowEntrySchema);
};

/**
 * Get or create CashflowTransaction model
 */
const getCashflowTransactionModel = () => {
  if (mongoose.models.CashflowTransaction) {
    return mongoose.models.CashflowTransaction;
  }

  const CashflowTransactionSchema = new mongoose.Schema(
    {
      cashflow_entry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashflowEntry',
        required: false,
        index: true,
      },
      bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
        index: true,
      },
      counterparty_bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true,
        index: true,
      },
      direction: {
        type: String,
        enum: ['incoming', 'outgoing'],
        required: true,
        index: true,
      },
      paired_transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashflowTransaction',
        index: true,
      },
      transaction_type: {
        type: String,
        enum: ['transfer', 'deposit', 'withdrawal', 'bounce', 'refund'],
        default: 'transfer',
      },
      reverses_transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashflowTransaction',
        index: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'EUR',
        trim: true,
        uppercase: true,
      },
      fees: {
        type: Number,
        default: 0,
        min: 0,
      },
      net_amount: {
        type: Number,
        min: 0,
      },
      status: {
        type: String,
        enum: ['sent', 'received'],
        default: 'sent',
        index: true,
      },
      documents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      ],
      created_at: {
        type: Date,
        default: Date.now,
      },
      created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      received_at: Date,
      received_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      notes: {
        type: String,
        trim: true,
      },
      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      // No explicit collection - Mongoose will use 'cashflowtransactions' (matching cashflow-service)
    }
  );

  return mongoose.model('CashflowTransaction', CashflowTransactionSchema);
};

// ============================================
// CASHFLOW INTEGRATION FUNCTIONS
// ============================================

/**
 * Create a cashflow entry for an offer (direct MongoDB)
 * Called when the first customer payment is received
 * NOTE: Does NOT create deposit transaction - use addCashflowDeposit for that
 * 
 * @param {Object} params - Parameters
 * @param {string} params.offerId - The offer ID
 * @param {number} [params.amount] - Optional amount (defaults to offer's expected_from_customer)
 * @param {string} [params.currency] - Currency (default: EUR)
 * @param {string} [params.notes] - Optional notes
 * @param {string} params.userId - User creating the entry
 * @returns {Object} Created cashflow entry
 */
const createCashflowEntry = async ({ offerId, amount, currency = 'EUR', notes, userId }) => {
  const CashflowEntry = getCashflowEntryModel();
  const { Offer } = require('../models');

  try {
    logger.info('Creating cashflow entry for offer (direct DB)', { offerId, userId });

    // Fetch offer to get bank_id and amount
    const offer = await Offer.findById(offerId)
      .populate('bank_id', 'name nickName type')
      .lean();

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (!offer.bank_id) {
      throw new Error('Offer does not have an associated bank');
    }

    const bankId = offer.bank_id._id || offer.bank_id;
    const cashflowAmount = amount || offer.financials?.expected_from_customer || offer.investment_volume || 0;

    if (!cashflowAmount || cashflowAmount <= 0) {
      throw new Error('Invalid amount: Cannot determine cashflow amount');
    }

    // Create the cashflow entry (tracks total expected, not individual payments)
    const entry = new CashflowEntry({
      offer_id: offerId,
      initial_bank_id: bankId,
      current_bank_id: bankId,
      amount: cashflowAmount,  // Total expected from customer
      currency: currency,
      status: 'active',
      entered_at: new Date(),
      entered_by: userId,
      notes: notes || 'Auto-created on first payment received',
      active: true,
    });

    await entry.save();

    // Update the offer with cashflow tracking info
    await Offer.findByIdAndUpdate(offerId, {
      in_cashflow: true,
      cashflow_entry_id: entry._id,
      cashflow_sent_at: new Date(),
    });

    logger.info('Cashflow entry created successfully (direct DB)', {
      offerId,
      entryId: entry._id,
      amount: cashflowAmount,
      bankId,
    });

    return {
      success: true,
      data: entry.toObject(),
    };
  } catch (error) {
    logger.error('Failed to create cashflow entry (direct DB)', {
      offerId,
      error: error.message,
    });

    return null;
  }
};

/**
 * Add a deposit transaction to an existing cashflow entry
 * Called for EVERY customer payment received
 * 
 * @param {Object} params - Parameters
 * @param {string} params.offerId - The offer ID
 * @param {string} params.cashflowEntryId - The cashflow entry ID (optional, will lookup if not provided)
 * @param {number} params.paymentAmount - The payment amount
 * @param {string} [params.currency] - Currency (default: EUR)
 * @param {string} [params.paymentMethod] - Payment method for notes
 * @param {string} [params.notes] - Optional notes
 * @param {string} params.userId - User creating the transaction
 * @returns {Object} Created transaction
 */
const addCashflowDeposit = async ({ 
  offerId, 
  cashflowEntryId, 
  paymentAmount, 
  currency = 'EUR', 
  paymentMethod,
  notes, 
  userId 
}) => {
  const CashflowEntry = getCashflowEntryModel();
  const CashflowTransaction = getCashflowTransactionModel();
  const { Offer } = require('../models');

  try {
    // Get cashflow entry ID if not provided
    let entryId = cashflowEntryId;
    if (!entryId) {
      const entry = await CashflowEntry.findOne({ offer_id: offerId, active: true });
      if (!entry) {
        throw new Error('Cashflow entry not found for offer');
      }
      entryId = entry._id;
    }

    // Get the entry to find bank
    const entry = await CashflowEntry.findById(entryId);
    if (!entry) {
      throw new Error('Cashflow entry not found');
    }

    // Get offer for title
    const offer = await Offer.findById(offerId).lean();

    // Create deposit transaction for this payment (incoming to the bank)
    const transaction = new CashflowTransaction({
      cashflow_entry_id: entryId,
      bank_id: entry.current_bank_id,  // Bank receiving the deposit
      counterparty_bank_id: entry.current_bank_id,  // Same bank (external source)
      direction: 'incoming',  // Money coming into the system
      paired_transaction_id: null,  // No paired transaction for deposits
      transaction_type: 'deposit',
      amount: paymentAmount,
      currency: currency,
      fees: 0,
      net_amount: paymentAmount,
      status: 'received',  // Payment received = deposit received
      created_at: new Date(),
      created_by: userId,
      received_at: new Date(),
      received_by: userId,
      notes: notes || `Customer payment: €${paymentAmount} (${paymentMethod || 'bank_transfer'}) - ${offer?.title || offerId}`,
      active: true,
    });

    await transaction.save();

    logger.info('Cashflow deposit transaction created', {
      offerId,
      entryId,
      transactionId: transaction._id,
      paymentAmount,
    });

    return {
      success: true,
      data: transaction.toObject(),
    };
  } catch (error) {
    logger.error('Failed to create cashflow deposit transaction', {
      offerId,
      error: error.message,
    });

    return null;
  }
};

/**
 * Get cashflow entry for an offer
 * 
 * @param {string} offerId - The offer ID
 * @returns {Object|null} Cashflow entry or null if not found
 */
const getCashflowEntryByOffer = async (offerId) => {
  const CashflowEntry = getCashflowEntryModel();
  const CashflowTransaction = getCashflowTransactionModel();

  try {
    const entry = await CashflowEntry.findOne({
      offer_id: offerId,
      active: true,
    })
      .populate('offer_id', 'title reference_no investment_volume')
      .populate('initial_bank_id', 'name nickName type')
      .populate('current_bank_id', 'name nickName type')
      .populate('entered_by', 'login name')
      .lean();

    if (!entry) {
      return null;
    }

    // Get associated transactions
    const transactions = await CashflowTransaction.find({
      cashflow_entry_id: entry._id,
      active: true,
    })
      .populate('from_bank_id', 'name nickName type')
      .populate('to_bank_id', 'name nickName type')
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...entry,
      transactions,
    };
  } catch (error) {
    logger.error('Failed to get cashflow entry', {
      offerId,
      error: error.message,
    });
    return null;
  }
};

/**
 * Check if an offer is in cashflow
 * 
 * @param {string} offerId - The offer ID
 * @returns {boolean} True if offer has a cashflow entry
 */
const isOfferInCashflow = async (offerId) => {
  const CashflowEntry = getCashflowEntryModel();

  try {
    const count = await CashflowEntry.countDocuments({
      offer_id: offerId,
      active: true,
    });
    return count > 0;
  } catch (error) {
    logger.error('Failed to check if offer is in cashflow', {
      offerId,
      error: error.message,
    });
    return false;
  }
};

/**
 * Update cashflow entry
 * 
 * @param {string} entryId - The cashflow entry ID
 * @param {Object} updates - Updates to apply (notes, status, metadata)
 * @param {string} userId - User making the update
 * @returns {Object|null} Updated entry or null
 */
const updateCashflowEntry = async (entryId, updates, userId) => {
  const CashflowEntry = getCashflowEntryModel();

  try {
    const allowedUpdates = ['notes', 'status', 'metadata'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const entry = await CashflowEntry.findOneAndUpdate(
      { _id: entryId, active: true },
      { $set: filteredUpdates },
      { new: true }
    ).lean();

    if (!entry) {
      return null;
    }

    logger.info('Cashflow entry updated', {
      entryId,
      updates: filteredUpdates,
      updatedBy: userId,
    });

    return entry;
  } catch (error) {
    logger.error('Failed to update cashflow entry', {
      entryId,
      error: error.message,
    });
    return null;
  }
};

/**
 * Delete (soft) cashflow entry and reset offer flag
 * 
 * @param {string} entryId - The cashflow entry ID
 * @param {string} userId - User deleting the entry
 * @returns {boolean} Success status
 */
const deleteCashflowEntry = async (entryId, userId) => {
  const CashflowEntry = getCashflowEntryModel();
  const CashflowTransaction = getCashflowTransactionModel();
  const { Offer } = require('../models');

  try {
    const entry = await CashflowEntry.findOneAndUpdate(
      { _id: entryId, active: true },
      { $set: { active: false, status: 'cancelled' } },
      { new: true }
    ).lean();

    if (!entry) {
      return false;
    }

    // Soft delete associated transactions
    await CashflowTransaction.updateMany(
      { cashflow_entry_id: entryId },
      { $set: { active: false } }
    );

    // Reset the offer's cashflow tracking flag
    if (entry.offer_id) {
      await Offer.findByIdAndUpdate(entry.offer_id, {
        in_cashflow: false,
        cashflow_entry_id: null,
        cashflow_sent_at: null,
      });
    }

    logger.info('Cashflow entry deleted', {
      entryId,
      deletedBy: userId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete cashflow entry', {
      entryId,
      error: error.message,
    });
    return false;
  }
};

module.exports = {
  createCashflowEntry,
  addCashflowDeposit,
  getCashflowEntryByOffer,
  isOfferInCashflow,
  updateCashflowEntry,
  deleteCashflowEntry,
  // Export model getters for advanced use
  getCashflowEntryModel,
  getCashflowTransactionModel,
};
