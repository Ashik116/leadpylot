/**
 * Lead Service Index
 * Main entry point for the lead service
 */

// Import all modules
const {
    createLeads,
    updateLeadData,
    deleteLeadData,
    restoreLeadData,
    permanentlyDeleteLead,
    updateSecondaryEmail,
    makePrimaryEmail,
    updateOfferCalls,
  } = require('./crud');
  const { getAllLeads, getMyLeads, getLeadById, getLeadIds, getLeadsByPartnerIds, getExtraLeads, getAssignedLeads, getLeadsQueue } = require('./queries');
  const { buildLeadQuery, filterLeadsByUserAssignment } = require('./filters');
  const { processLeadWithStageAndStatus, attachOpeningsToOffers, flattenLeadsByState } = require('./transforms');
  const {
    createLookupMap,
    buildPaginationMeta,
    getStageAndStatusMaps,
    findStageAndStatusIdsByName,
    processBatchOperation,
  } = require('./utils');
  const { importLeadsFromExcel, getImportHistory, revertLeadImport } = require('./excel');
  
  // Export all functions
  module.exports = {
    // CRUD operations
    createLeads,
    updateLeadData,
    deleteLeadData,
    restoreLeadData,
    permanentlyDeleteLead,
    updateSecondaryEmail,
    makePrimaryEmail,
    updateOfferCalls,
  
    // Query operations
    getAllLeads,
    getMyLeads,
    getLeadById,
    getLeadIds,
    getLeadsByPartnerIds,
    getExtraLeads,
    getAssignedLeads,
    getLeadsQueue,
  
    // Filter operations
    buildLeadQuery,
    filterLeadsByUserAssignment,
  
    // Transform operations
    processLeadWithStageAndStatus,
    attachOpeningsToOffers,
    flattenLeadsByState,
  
    // Utility operations
    createLookupMap,
    buildPaginationMeta,
    getStageAndStatusMaps,
    findStageAndStatusIdsByName,
    processBatchOperation,
  
    // Excel operations
    importLeadsFromExcel,
    getImportHistory,
    revertLeadImport,
  };
  