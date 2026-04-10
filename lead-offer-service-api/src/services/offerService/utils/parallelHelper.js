/**
 * Parallel Operations Helper
 * Utilities for running operations in parallel for maximum performance
 */

const logger = require('../../../utils/logger');

/**
 * Populate bank provider fields that are still IDs
 * @param {Array|Object} offers - Offers to process
 * @returns {Promise<Array|Object>} - Offers with populated providers
 */
const populateBankProviders = async (offers) => {
  if (!offers) return offers;
  
  const User = require('../../../models/User');
  const mongoose = require('mongoose');
  
  const isArray = Array.isArray(offers);
  const offersArray = isArray ? offers : [offers];
  
  // Collect all provider IDs that need to be populated
  const providerIds = [];
  
  offersArray.forEach((offer) => {
    if (offer.bank_id && offer.bank_id.provider) {
      // Check if provider is an ID string or ObjectId (not already populated)
      const providerId = typeof offer.bank_id.provider === 'string' || offer.bank_id.provider instanceof mongoose.Types.ObjectId
        ? offer.bank_id.provider.toString()
        : offer.bank_id.provider._id?.toString();
      
      if (providerId && !offer.bank_id.provider.name) {
        // Provider is not populated, add to list
        if (!providerIds.includes(providerId)) {
          providerIds.push(providerId);
        }
      }
    }
  });
  
  // Fetch all providers in one query
  if (providerIds.length > 0) {
    const providers = await User.find({ _id: { $in: providerIds } })
      .select('name login')
      .lean();
    
    // Create a map of provider ID to provider object
    const providerDataMap = new Map();
    providers.forEach(provider => {
      providerDataMap.set(provider._id.toString(), provider);
    });
    
    // Populate providers in offers
    offersArray.forEach((offer) => {
      if (offer.bank_id && offer.bank_id.provider) {
        const providerId = typeof offer.bank_id.provider === 'string' || offer.bank_id.provider instanceof mongoose.Types.ObjectId
          ? offer.bank_id.provider.toString()
          : offer.bank_id.provider._id?.toString();
        
        if (providerId) {
          if (providerDataMap.has(providerId)) {
            // Provider exists, populate it
            offer.bank_id.provider = providerDataMap.get(providerId);
          } else if (!offer.bank_id.provider.name) {
            // Provider ID exists but user not found, set to null
            offer.bank_id.provider = null;
          }
        }
      } else if (offer.bank_id && offer.bank_id.provider === undefined) {
        // Provider field doesn't exist, set to null
        offer.bank_id.provider = null;
      }
    });
  } else {
    // No providers to populate, but ensure null values are set
    offersArray.forEach(offer => {
      if (offer.bank_id && offer.bank_id.provider === undefined) {
        offer.bank_id.provider = null;
      }
    });
  }
  
  return isArray ? offersArray : offersArray[0];
};

/**
 * Populate documents for multiple offers in parallel
 * @param {Array} offers - Array of offers
 * @param {Object} DocumentManager - Document manager instance
 * @returns {Promise<Array>} - Offers with populated documents
 */
const populateOffersDocumentsParallel = async (offers, DocumentManager) => {
  if (!offers || offers.length === 0) return offers;

  const startTime = Date.now();
  
  // Populate all offers in parallel
  const offersWithDocs = await Promise.all(
    offers.map((offer) => DocumentManager.populateOfferDocuments(offer))
  );

  const duration = Date.now() - startTime;
  logger.debug(`Populated documents for ${offers.length} offers in ${duration}ms (parallel)`);

  return offersWithDocs;
};

/**
 * Batch populate documents for multiple offers with batching strategy
 * More efficient for large datasets
 * @param {Array} offers - Array of offers
 * @param {Array} offerIds - Array of offer IDs
 * @param {Object} DocumentManager - Document manager instance
 * @returns {Promise<Object>} - Map of offer ID to documents
 */
const batchPopulateDocuments = async (offers, offerIds, DocumentManager) => {
  if (!offers || offers.length === 0) return {};

  const startTime = Date.now();

  // Use batch population which fetches all documents in one query
  const documentsByOffer = await DocumentManager.populateMultipleOfferDocuments(
    offers,
    offerIds
  );

  const duration = Date.now() - startTime;
  logger.debug(`Batch populated documents for ${offers.length} offers in ${duration}ms`);

  return documentsByOffer;
};

/**
 * Execute multiple async operations in parallel with error handling
 * @param {Array<Promise>} operations - Array of promises to execute
 * @param {String} operationName - Name for logging
 * @returns {Promise<Array>} - Results array
 */
const executeParallel = async (operations, operationName = 'operations') => {
  const startTime = Date.now();

  try {
    const results = await Promise.all(operations);
    const duration = Date.now() - startTime;
    logger.debug(`Executed ${operations.length} ${operationName} in ${duration}ms (parallel)`);
    return results;
  } catch (error) {
    logger.error(`Error in parallel ${operationName}:`, error);
    throw error;
  }
};

/**
 * Execute async operations in batches to avoid overwhelming the system
 * @param {Array} items - Items to process
 * @param {Function} operation - Async operation to perform on each item
 * @param {Number} batchSize - Size of each batch
 * @returns {Promise<Array>} - Results array
 */
const executeBatched = async (items, operation, batchSize = 10) => {
  if (!items || items.length === 0) return [];

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }

  const duration = Date.now() - startTime;
  logger.debug(`Executed ${items.length} operations in ${Math.ceil(items.length / batchSize)} batches (${duration}ms)`);

  return results;
};

/**
 * Process offers with progress in parallel (with netto calculations if needed)
 * @param {Array} offerData - Aggregation results with progress info
 * @param {Map} offerMap - Map of full offer objects
 * @param {String} hasProgress - Progress filter type
 * @param {Object} user - User object
 * @param {Function} calculateNettoAmounts - Netto calculation function
 * @returns {Array} - Processed offers with progress
 */
const processOffersWithProgress = (offerData, offerMap, hasProgress, user, calculateNettoAmounts) => {
  const startTime = Date.now();
  const offersWithProgress = [];

  for (const progressItem of offerData) {
    const offer = offerMap.get(progressItem._id.toString());
    if (!offer) continue;

    let offerWithProgress = {
      ...offer,
      has_opening: progressItem.has_opening || false,
      has_confirmation: progressItem.has_confirmation || false,
      has_payment_voucher: progressItem.has_payment_voucher || false,
      has_netto1: progressItem.has_netto1 || false,
      has_netto2: progressItem.has_netto2 || false,
      current_stage: progressItem.current_stage || 'offer',
      opening_count: progressItem.opening_count || 0,
      confirmation_count: progressItem.confirmation_count || 0,
      payment_voucher_count: progressItem.payment_voucher_count || 0,
      netto1_count: progressItem.netto1_count || 0,
      netto2_count: progressItem.netto2_count || 0,
      lead_status: offer.lead_id?.status || null,
      lead_stage: offer.lead_id?.stage || null,
    };

    // Add netto calculations if needed
    if (hasProgress === 'netto1' || hasProgress === 'netto2' || hasProgress === 'netto') {
      const leadStatus = offer.lead_id?.status;
      if (leadStatus === 'Netto1' || leadStatus === 'Netto2') {
        const calculatedAmounts = calculateNettoAmounts(offer, user.role);
        offerWithProgress = {
          ...offerWithProgress,
          ...calculatedAmounts,
          nettoStage: leadStatus.toLowerCase(),
        };
      }
    }

    offersWithProgress.push(offerWithProgress);
  }

  const duration = Date.now() - startTime;
  logger.debug(`Processed ${offersWithProgress.length} offers with progress in ${duration}ms`);

  return offersWithProgress;
};

/**
 * Merge offers with documents in bulk
 * @param {Array} offers - Array of offers
 * @param {Object} documentsByOffer - Map of offer ID to documents
 * @returns {Array} - Offers with documents attached
 */
const mergeOffersWithDocuments = (offers, documentsByOffer) => {
  const startTime = Date.now();

  offers.forEach((offer) => {
    offer.files = documentsByOffer[offer._id.toString()] || [];
  });

  const duration = Date.now() - startTime;
  logger.debug(`Merged documents for ${offers.length} offers in ${duration}ms`);

  return offers;
};

/**
 * Apply netto calculations to offers in bulk
 * @param {Array} offers - Array of offers
 * @param {String} hasProgress - Progress filter type
 * @param {Object} user - User object
 * @param {Function} calculateNettoAmounts - Netto calculation function
 * @returns {Array} - Offers with netto calculations
 */
const applyNettoCalculations = (offers, hasProgress, user, calculateNettoAmounts) => {
  if (hasProgress !== 'netto1' && hasProgress !== 'netto2' && hasProgress !== 'netto') {
    return offers;
  }

  const startTime = Date.now();
  let calculatedCount = 0;

  offers.forEach((offer) => {
    const leadStatus = offer.lead_id?.status;
    if (leadStatus === 'Netto1' || leadStatus === 'Netto2') {
      const calculatedAmounts = calculateNettoAmounts(offer, user.role);
      Object.assign(offer, calculatedAmounts, {
        nettoStage: leadStatus.toLowerCase(),
      });
      calculatedCount++;
    }
  });

  const duration = Date.now() - startTime;
  logger.debug(`Applied netto calculations to ${calculatedCount}/${offers.length} offers in ${duration}ms`);

  return offers;
};

module.exports = {
  populateBankProviders,
  populateOffersDocumentsParallel,
  batchPopulateDocuments,
  executeParallel,
  executeBatched,
  processOffersWithProgress,
  mergeOffersWithDocuments,
  applyNettoCalculations,
};

