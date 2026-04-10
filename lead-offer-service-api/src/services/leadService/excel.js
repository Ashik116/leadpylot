/**
 * Lead Service Excel Import
 * Functions for importing leads from Excel files
 */

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { createLeads } = require('./crud');
const { eventEmitter, EVENT_TYPES } = require('../events');
const { AssignLeads, User, Lead, ImportHistory, Offer, Team, Settings, Reclamation, Transaction, Activity, Source } = require('../../models');
const storageConfig = require('../../config/storageConfig');
const mongoose = require('mongoose');
const freepbxService = require('./freepbxService');
const voipService = require('../voipService');

// Bulk import threshold - above this, use optimized batch processing
const BULK_IMPORT_THRESHOLD = 1000;

/**
 * Helper function to normalize names for matching (handles spaces, dashes, case)
 * @param {string} name - Name to normalize
 * @returns {string} Normalized name
 */
const normalizeNameForMatching = (name) => {
  if (!name) return '';
  return name.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '');
};

/**
 * Pre-load all reference data into memory Maps for O(1) lookups
 * This eliminates per-lead database queries for Users, Teams, Sources, and VOIP extensions
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Object} Reference data maps
 */
const preloadReferenceData = async (progressCallback) => {
  const startTime = Date.now();
  logger.info('🔄 Pre-loading reference data for optimized import...');
  
  if (progressCallback) {
    progressCallback({
      phase: 'validating',
      description: 'Loading reference data...',
      percentage: 2
    });
  }
  
  // Parallel fetch all reference data
  const [allUsers, allTeams, allSources, existingExtensions, allStages] = await Promise.all([
    User.find({ active: true }).select('_id login info.name').lean(),
    Team.find({ active: true }).select('_id name agents').lean(),
    Source.find({}).select('_id price').lean(),
    Lead.distinct('voip_extension'),
    Settings.find({ type: 'stage' }).lean()
  ]);
  
  // Build O(1) lookup Maps for Users
  const usersByName = new Map();
  const usersByLogin = new Map();
  allUsers.forEach(u => {
    if (u.info?.name) {
      usersByName.set(u.info.name.toLowerCase().trim(), u._id);
    }
    if (u.login) {
      usersByLogin.set(u.login.toLowerCase().trim(), u._id);
    }
  });
  
  // Build O(1) lookup Map for Teams with agents
  const teamsByName = new Map();
  const teamsById = new Map();
  allTeams.forEach(t => {
    const normalizedName = normalizeNameForMatching(t.name);
    teamsByName.set(normalizedName, {
      _id: t._id,
      name: t.name,
      agents: t.agents || []
    });
    teamsById.set(t._id.toString(), {
      _id: t._id,
      name: t.name,
      agents: t.agents || []
    });
  });
  
  // Build O(1) lookup Map for Source prices
  const sourcesPriceMap = new Map();
  allSources.forEach(s => {
    sourcesPriceMap.set(s._id.toString(), s.price || 0);
  });
  
  // Build Set for existing VOIP extensions (for uniqueness check)
  const existingExtensionsSet = new Set(existingExtensions.filter(Boolean));
  
  // Build O(1) lookup Map for Stages and Statuses
  const stagesByName = new Map();
  const stagesById = new Map();
  allStages.forEach(s => {
    const normalizedName = normalizeNameForMatching(s.name);
    const stageData = {
      _id: s._id,
      name: s.name,
      statuses: s.info?.statuses || []
    };
    stagesByName.set(normalizedName, stageData);
    stagesById.set(s._id.toString(), stageData);
  });
  
  const loadTime = Date.now() - startTime;
  logger.info(`✅ Reference data pre-loaded in ${loadTime}ms:`, {
    users: allUsers.length,
    teams: allTeams.length,
    sources: allSources.length,
    extensions: existingExtensionsSet.size,
    stages: allStages.length
  });
  
  return {
    usersByName,
    usersByLogin,
    teamsByName,
    teamsById,
    sourcesPriceMap,
    existingExtensionsSet,
    stagesByName,
    stagesById,
    // Keep raw arrays for edge cases
    allUsers,
    allTeams,
    allStages
  };
};

/**
 * Look up a user by name using pre-loaded data (O(1) instead of DB query)
 * @param {string} name - User name to look up
 * @param {Object} referenceData - Pre-loaded reference data
 * @returns {ObjectId|null} User ID or null
 */
const lookupUserByName = (name, referenceData) => {
  if (!name || !referenceData) return null;
  const normalized = name.toString().toLowerCase().trim();
  return referenceData.usersByName.get(normalized) || 
         referenceData.usersByLogin.get(normalized) || 
         null;
};

/**
 * Look up a team by name using pre-loaded data (O(1) instead of DB query)
 * @param {string} name - Team name to look up
 * @param {Object} referenceData - Pre-loaded reference data
 * @returns {Object|null} Team data or null
 */
const lookupTeamByName = (name, referenceData) => {
  if (!name || !referenceData) return null;
  const normalized = normalizeNameForMatching(name);
  return referenceData.teamsByName.get(normalized) || null;
};

/**
 * Enhanced database check with integrated duplicate detection
 * Updates existing leads with missing data OR assigns duplicate status for different Partner IDs
 * @param {Array} leads - Array of lead data objects from Excel
 * @returns {Object} - Object with enhancedLeads, duplicateLeads, failedLeads, and remainingLeads arrays
 */
const checkDatabaseEnhancement = async (leads) => {
  const startTime = Date.now();
  logger.info(`Starting integrated enhancement and duplicate check for ${leads.length} leads`);

  const results = {
    enhancedLeads: [],
    duplicateLeads: [], // New: leads with duplicate_status assigned
    failedLeads: [],   // New: leads that should be rejected
    remainingLeads: [],
  };

  // Helper function to normalize data for comparison
  const normalizeData = (lead) => {
    return {
      name: lead.contact_name?.toString().toLowerCase().trim() || '',
      email: lead.email_from?.toString().toLowerCase().trim() || '',
      phone: lead.phone?.toString().replace(/\D/g, '') || '', // Remove all non-digits
      partnerId: lead.lead_source_no?.toString().trim() || '',
    };
  };

  // Helper function to calculate date difference in weeks
  const getDateDifferenceInWeeks = (date1, date2) => {
    const d1 = new Date(date1 || 0);
    const d2 = new Date(date2 || 0);
    const diffTime = Math.abs(d2 - d1);
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks;
  };

  // ============ PHASE 1: BATCH EXTRACT ALL UNIQUE VALUES ============
  logger.info(`📊 Phase 2.1: Extracting unique values from ${leads.length} leads for batch lookup...`);
  const extractionStart = Date.now();

  const allPartnerIds = new Set();
  const allEmails = new Set();
  const allPhones = new Set();
  const normalizedLeadsMap = new Map(); // Store normalized data for each lead

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const normalized = normalizeData(lead);
    normalizedLeadsMap.set(i, normalized);

    if (normalized.partnerId) {
      allPartnerIds.add(normalized.partnerId);
    }
    if (normalized.email) {
      allEmails.add(normalized.email);
    }
    if (normalized.phone) {
      allPhones.add(normalized.phone);
    }
  }

  logger.info(`   Unique Partner IDs: ${allPartnerIds.size}, Emails: ${allEmails.size}, Phones: ${allPhones.size}`);
  logger.info(`   Extraction completed in ${Date.now() - extractionStart}ms`);

  // ============ PHASE 2: BATCH DATABASE QUERIES ============
  logger.info(`📊 Phase 2.2: Running batch database queries...`);
  const queryStart = Date.now();

  // Query 1: Get all leads by Partner IDs (batch)
  const partnerIdArray = Array.from(allPartnerIds);
  let existingLeadsByPartnerId = [];
  
  if (partnerIdArray.length > 0) {
    // Process in chunks of 10000 to avoid query size limits
    const CHUNK_SIZE = 10000;
    for (let i = 0; i < partnerIdArray.length; i += CHUNK_SIZE) {
      const chunk = partnerIdArray.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Lead.find({
        lead_source_no: { $in: chunk }
      }).lean();
      existingLeadsByPartnerId.push(...chunkResults);
      
      if (i + CHUNK_SIZE < partnerIdArray.length) {
        logger.info(`   Partner ID query chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(partnerIdArray.length / CHUNK_SIZE)} completed`);
      }
    }
  }
  
  logger.info(`   Found ${existingLeadsByPartnerId.length} existing leads by Partner ID`);

  // Query 2: Get all leads by Email (batch) - case-insensitive matching using $toLower
  const emailArray = Array.from(allEmails);
  let existingLeadsByEmail = [];
  
  if (emailArray.length > 0) {
    const CHUNK_SIZE = 5000; // Smaller chunks for $expr queries
    const totalChunks = Math.ceil(emailArray.length / CHUNK_SIZE);
    for (let i = 0; i < emailArray.length; i += CHUNK_SIZE) {
      const chunk = emailArray.slice(i, i + CHUNK_SIZE);
      // Case-insensitive matching - accurate duplicate detection
      const lowercaseEmails = chunk.map(e => e.toLowerCase());
      const chunkResults = await Lead.find({
        $expr: { $in: [{ $toLower: '$email_from' }, lowercaseEmails] }
      }).lean();
      existingLeadsByEmail.push(...chunkResults);
      
      logger.info(`   Email query chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${totalChunks} completed`);
    }
  }
  
  logger.info(`   Found ${existingLeadsByEmail.length} existing leads by Email`);

  // Query 3: Get all leads by Phone (batch) - using $in for performance (much faster than regex)
  const phoneArray = Array.from(allPhones);
  let existingLeadsByPhone = [];
  
  if (phoneArray.length > 0) {
    const CHUNK_SIZE = 10000; // Can use larger chunks with $in
    const totalChunks = Math.ceil(phoneArray.length / CHUNK_SIZE);
    for (let i = 0; i < phoneArray.length; i += CHUNK_SIZE) {
      const chunk = phoneArray.slice(i, i + CHUNK_SIZE);
      // Use exact $in matching - phones are already normalized
      const chunkResults = await Lead.find({
        phone: { $in: chunk }
      }).lean();
      existingLeadsByPhone.push(...chunkResults);
      
      logger.info(`   Phone query chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${totalChunks} completed`);
    }
  }
  
  logger.info(`   Found ${existingLeadsByPhone.length} existing leads by Phone`);
  logger.info(`   Batch queries completed in ${Date.now() - queryStart}ms`);

  // ============ PHASE 3: BUILD LOOKUP MAPS ============
  logger.info(`📊 Phase 2.3: Building lookup maps...`);
  const mapStart = Date.now();

  // Map by normalized Partner ID
  const dbPartnerIdMap = new Map();
  existingLeadsByPartnerId.forEach(lead => {
    const normalizedPid = lead.lead_source_no?.toString().trim() || '';
    if (normalizedPid) {
      if (!dbPartnerIdMap.has(normalizedPid)) {
        dbPartnerIdMap.set(normalizedPid, []);
      }
      dbPartnerIdMap.get(normalizedPid).push(lead);
    }
  });

  // Map by normalized Email
  const dbEmailMap = new Map();
  existingLeadsByEmail.forEach(lead => {
    const normalizedEmail = lead.email_from?.toString().toLowerCase().trim() || '';
    if (normalizedEmail) {
      if (!dbEmailMap.has(normalizedEmail)) {
        dbEmailMap.set(normalizedEmail, []);
      }
      dbEmailMap.get(normalizedEmail).push(lead);
    }
  });

  // Map by normalized Phone
  const dbPhoneMap = new Map();
  existingLeadsByPhone.forEach(lead => {
    const normalizedPhone = lead.phone?.toString().replace(/\D/g, '') || '';
    if (normalizedPhone) {
      if (!dbPhoneMap.has(normalizedPhone)) {
        dbPhoneMap.set(normalizedPhone, []);
      }
      dbPhoneMap.get(normalizedPhone).push(lead);
    }
  });

  logger.info(`   Maps built: ${dbPartnerIdMap.size} partner IDs, ${dbEmailMap.size} emails, ${dbPhoneMap.size} phones`);
  logger.info(`   Map building completed in ${Date.now() - mapStart}ms`);

  // ============ PHASE 4: PROCESS LEADS USING MAPS ============
  logger.info(`📊 Phase 2.4: Processing ${leads.length} leads using lookup maps...`);
  const processStart = Date.now();
  
  // Collect updates for batch processing
  const enhancementUpdates = [];

  for (let leadIndex = 0; leadIndex < leads.length; leadIndex++) {
    const lead = leads[leadIndex];
    const normalized = normalizedLeadsMap.get(leadIndex);

    // Log progress every 10000 leads
    if (leadIndex > 0 && leadIndex % 10000 === 0) {
      logger.info(`   Processed ${leadIndex}/${leads.length} leads...`);
    }

    try {
      // FIRST: Check if Partner ID already exists (highest priority - reject if same Partner ID)
      if (normalized.partnerId && dbPartnerIdMap.has(normalized.partnerId)) {
        const existingLeadsWithPartnerId = dbPartnerIdMap.get(normalized.partnerId);
        const existingLeadByPartnerId = existingLeadsWithPartnerId[0]; // Take first match
        
        // Same Partner ID found - check if we can enhance or must reject
        const fieldsToUpdate = {};
        
        if (!existingLeadByPartnerId.lead_source_no && lead.lead_source_no) {
          fieldsToUpdate.lead_source_no = lead.lead_source_no;
        }
        if (!existingLeadByPartnerId.expected_revenue && lead.expected_revenue) {
          fieldsToUpdate.expected_revenue = lead.expected_revenue;
        }
        if (!existingLeadByPartnerId.source_id && lead.source_id) {
          fieldsToUpdate.source_id = lead.source_id;
        }
        if (!existingLeadByPartnerId.salesperson_agent && lead.salesperson_agent) {
          fieldsToUpdate.salesperson_agent = lead.salesperson_agent;
        }
        if (!existingLeadByPartnerId.project && lead.project) {
          fieldsToUpdate.project = lead.project;
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
          // ✅ ENHANCEMENT: Same Partner ID + Missing fields
          enhancementUpdates.push({
            leadId: existingLeadByPartnerId._id,
            fieldsToUpdate: fieldsToUpdate
          });

          results.enhancedLeads.push({
            existingLeadId: existingLeadByPartnerId._id,
            enhancedFields: Object.keys(fieldsToUpdate),
            originalLead: lead,
            message: `Enhanced existing lead with Partner ID '${normalized.partnerId}' with fields: ${Object.keys(fieldsToUpdate).join(', ')}`,
          });

          continue; // Skip to next lead
        } else {
          // ❌ REJECT: Same Partner ID + No missing fields = Complete duplicate
          results.failedLeads.push({
            ...lead,
            error: `Complete duplicate: Partner ID '${normalized.partnerId}' already exists in database`,
          });

          continue; // Skip to next lead
        }
      }

      // SECOND: Find existing leads that match by email or phone (for duplicate status assignment)
      const existingLeads = [];
      
      // Get by email
      if (normalized.email && dbEmailMap.has(normalized.email)) {
        existingLeads.push(...dbEmailMap.get(normalized.email));
      }
      
      // Get by phone
      if (normalized.phone && dbPhoneMap.has(normalized.phone)) {
        existingLeads.push(...dbPhoneMap.get(normalized.phone));
      }

      // Remove duplicates from existingLeads (same lead might match both email and phone)
      const uniqueExistingLeads = existingLeads.filter(
        (lead, index, self) => index === self.findIndex(l => l._id.toString() === lead._id.toString())
      );

      let processed = false;

      for (const existingLead of uniqueExistingLeads) {
        const existingNormalized = normalizeData(existingLead);

        // SCENARIO 1: Same Partner ID - Enhancement or Complete Duplicate
        if (existingNormalized.partnerId && normalized.partnerId && 
            existingNormalized.partnerId === normalized.partnerId) {

          // Check if enhancement is possible
          const fieldsToUpdate = {};

          if (!existingLead.lead_source_no && lead.lead_source_no) {
            fieldsToUpdate.lead_source_no = lead.lead_source_no;
          }
          if (!existingLead.expected_revenue && lead.expected_revenue) {
            fieldsToUpdate.expected_revenue = lead.expected_revenue;
          }
          if (!existingLead.source_id && lead.source_id) {
            fieldsToUpdate.source_id = lead.source_id;
          }
          if (!existingLead.salesperson_agent && lead.salesperson_agent) {
            fieldsToUpdate.salesperson_agent = lead.salesperson_agent;
          }
          if (!existingLead.project && lead.project) {
            fieldsToUpdate.project = lead.project;
          }

          if (Object.keys(fieldsToUpdate).length > 0) {
            // ✅ ENHANCEMENT: Same Partner ID + Missing fields
            enhancementUpdates.push({
              leadId: existingLead._id,
              fieldsToUpdate: fieldsToUpdate
            });

            results.enhancedLeads.push({
              existingLeadId: existingLead._id,
              enhancedFields: Object.keys(fieldsToUpdate),
              originalLead: lead,
              message: `Enhanced existing lead with: ${Object.keys(fieldsToUpdate).join(', ')}`,
            });

            processed = true;
            break;
          } else {
            // ❌ REJECT: Same Partner ID + No missing fields = Complete duplicate
            results.failedLeads.push({
              ...lead,
              error: `Complete duplicate: Partner ID '${normalized.partnerId}' already exists with all fields filled`,
            });

            processed = true;
            break;
          }
        }

        // SCENARIO 1.5: Existing has form_import - Excel wins, replace with Excel data
        else if (existingLead.import_source === 'form_import') {
          const fieldsToUpdate = {
            import_source: 'excel_import',
          };
          if (lead.contact_name) fieldsToUpdate.contact_name = lead.contact_name;
          if (lead.email_from) fieldsToUpdate.email_from = lead.email_from;
          if (lead.phone) fieldsToUpdate.phone = lead.phone;
          if (lead.expected_revenue != null) fieldsToUpdate.expected_revenue = lead.expected_revenue;
          if (lead.lead_source_no) fieldsToUpdate.lead_source_no = lead.lead_source_no;
          if (lead.source_id) fieldsToUpdate.source_id = lead.source_id;
          if (lead.salesperson_agent) fieldsToUpdate.salesperson_agent = lead.salesperson_agent;
          if (lead.project) fieldsToUpdate.project = lead.project;

          enhancementUpdates.push({
            leadId: existingLead._id,
            fieldsToUpdate: fieldsToUpdate
          });

          results.enhancedLeads.push({
            existingLeadId: existingLead._id,
            enhancedFields: Object.keys(fieldsToUpdate),
            originalLead: lead,
            message: `Replaced form_import lead with Excel data (excel_import takes priority)`,
          });

          processed = true;
          break;
        }

        // SCENARIO 2: Different Partner IDs - Duplicate with Status
        else if (existingNormalized.partnerId && normalized.partnerId &&
          existingNormalized.partnerId !== normalized.partnerId) {

          // Calculate duplicate status based on lead date difference
          const weeksDiff = getDateDifferenceInWeeks(lead.lead_date, existingLead.lead_date);

          let duplicateStatus = 0;
          if (weeksDiff <= 10) {
            duplicateStatus = 2; // Recent duplicate (within 10 weeks)
          } else {
            duplicateStatus = 1; // Old duplicate (more than 10 weeks)
          }

          // Import with duplicate_status
          const duplicateLead = {
            ...lead,
            duplicate_status: duplicateStatus,
          };

          results.duplicateLeads.push({
            lead: duplicateLead,
            matchedLeadId: existingLead._id,
            matchedPartnerID: existingLead.lead_source_no,
            weeksDifference: weeksDiff,
            duplicateStatus: duplicateStatus,
            message: `Duplicate detected: Different Partner IDs ('${normalized.partnerId}' vs '${existingNormalized.partnerId}'), ${weeksDiff.toFixed(1)} weeks difference`,
          });

          processed = true;
          break;
        }

        // SCENARIO 3: One/both Partner IDs empty - Duplicate with Status
        else if ((!existingNormalized.partnerId || !normalized.partnerId)) {

          // Calculate duplicate status based on lead date difference
          const weeksDiff = getDateDifferenceInWeeks(lead.lead_date, existingLead.lead_date);

          let duplicateStatus = 0;
          if (weeksDiff <= 10) {
            duplicateStatus = 2; // Recent duplicate (within 10 weeks)
          } else {
            duplicateStatus = 1; // Old duplicate (more than 10 weeks)
          }

          // Import with duplicate_status
          const duplicateLead = {
            ...lead,
            duplicate_status: duplicateStatus,
          };

          results.duplicateLeads.push({
            lead: duplicateLead,
            matchedLeadId: existingLead._id,
            matchedPartnerID: existingLead.lead_source_no || 'Empty',
            weeksDifference: weeksDiff,
            duplicateStatus: duplicateStatus,
            message: `Duplicate detected: Empty Partner ID scenario ('${normalized.partnerId || 'Empty'}' vs '${existingNormalized.partnerId || 'Empty'}'), ${weeksDiff.toFixed(1)} weeks difference`,
          });

          processed = true;
          break;
        }
      }

      // If no existing lead was processed, add to remaining leads for normal processing
      if (!processed) {
        results.remainingLeads.push(lead);
      }

    } catch (error) {
      logger.error(`Error during integrated enhancement/duplicate check for lead ${normalized.email || normalized.phone}:`, error);
      // On error, add to remaining leads for normal processing
      results.remainingLeads.push(lead);
    }
  }

  logger.info(`   Lead processing completed in ${Date.now() - processStart}ms`);

  // ============ PHASE 5: BATCH EXECUTE ENHANCEMENT UPDATES ============
  if (enhancementUpdates.length > 0) {
    logger.info(`📊 Phase 2.5: Executing ${enhancementUpdates.length} enhancement updates...`);
    const updateStart = Date.now();
    
    // Use bulkWrite for batch updates
    const bulkOps = enhancementUpdates.map(update => ({
      updateOne: {
        filter: { _id: update.leadId },
        update: {
          $set: {
            ...update.fieldsToUpdate,
            updated_at: new Date(),
          }
        }
      }
    }));

    // Execute in chunks of 1000
    const UPDATE_CHUNK_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += UPDATE_CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + UPDATE_CHUNK_SIZE);
      await Lead.bulkWrite(chunk);
      
      if (i + UPDATE_CHUNK_SIZE < bulkOps.length) {
        logger.info(`   Update chunk ${Math.floor(i / UPDATE_CHUNK_SIZE) + 1}/${Math.ceil(bulkOps.length / UPDATE_CHUNK_SIZE)} completed`);
      }
    }

    logger.info(`   Enhancement updates completed in ${Date.now() - updateStart}ms`);
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `🎯 INTEGRATED CHECK COMPLETED in ${totalTime}ms: ${results.enhancedLeads.length} enhanced, ${results.duplicateLeads.length} duplicates with status, ${results.failedLeads.length} rejected, ${results.remainingLeads.length} remaining`
  );

  // Log summary (skip detailed logs for large imports to avoid log spam)
  if (results.enhancedLeads.length > 0 && results.enhancedLeads.length <= 100) {
    logger.info(`📊 ENHANCEMENT DETAILS:`);
    results.enhancedLeads.forEach((enhancement, index) => {
      logger.info(`   ${index + 1}. Enhanced lead ${enhancement.existingLeadId} with fields: ${enhancement.enhancedFields.join(', ')}`);
    });
  } else if (results.enhancedLeads.length > 100) {
    logger.info(`📊 ENHANCEMENT SUMMARY: ${results.enhancedLeads.length} leads enhanced (detailed logs skipped for performance)`);
  }

  if (results.duplicateLeads.length > 0 && results.duplicateLeads.length <= 100) {
    logger.info(`📊 DUPLICATE DETAILS:`);
    results.duplicateLeads.forEach((duplicate, index) => {
      const lead = duplicate.lead;
      logger.info(`   ${index + 1}. Lead "${lead.contact_name || lead.email_from}" - duplicate_status: ${duplicate.duplicateStatus} (${duplicate.weeksDifference.toFixed(1)} weeks diff)`);
    });
  } else if (results.duplicateLeads.length > 100) {
    logger.info(`📊 DUPLICATE SUMMARY: ${results.duplicateLeads.length} duplicates detected (detailed logs skipped for performance)`);
  }

  return results;
};

/**
 * Agent auto-assignment check for leads with Salesperson/Agent and Project fields
 * @param {Array} leads - Array of lead data objects from Excel
 * @returns {Object} - Object with autoAssignedLeads array and remainingLeads array
 */
const checkAgentAutoAssignment = async (leads) => {
  const startTime = Date.now();
  logger.info(`Starting agent auto-assignment check for ${leads.length} leads`);

  // Import Team model
  const results = {
    autoAssignedLeads: [],
    remainingLeads: [],
  };

  // Process each lead for potential agent auto-assignment
  for (const lead of leads) {
    try {
      const agentName = lead.salesperson_agent?.toString().trim();
      const projectName = lead.project?.toString().trim();

      // Skip if no agent or project specified
      if (!agentName || !projectName) {
        results.remainingLeads.push(lead);
        continue;
      }

      // Find the project (Team) in database using normalized name matching
      // Use the same normalization function as findTeamByName
      const normalizeNameForMatching = (name) => {
        if (!name) return '';
        return name.toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\s*-\s*/g, '-')
          .replace(/\s+/g, '');
      };
      
      const normalizedProjectName = normalizeNameForMatching(projectName);
      logger.info(`🔍 [Auto-Assignment] Looking for project: "${projectName}" (normalized: "${normalizedProjectName}") for lead "${lead.contact_name || lead.email_from}"`);
      
      // First try exact match
      let project = await Team.findOne({
        name: projectName,
        active: true
      }).lean();
      
      // If not found, try normalized matching
      if (!project) {
        const allTeams = await Team.find({ active: true }).lean();
        project = allTeams.find(t => {
          const dbName = normalizeNameForMatching(t.name);
          return dbName === normalizedProjectName;
        });
      }

      if (!project) {
        logger.info(`❌ PROJECT NOT FOUND: Project "${projectName}" (normalized: "${normalizedProjectName}") not found for lead "${lead.contact_name || lead.email_from}" - importing without assignment`);
        results.remainingLeads.push(lead);
        continue;
      }
      
      logger.info(`✅ [Auto-Assignment] Found project: "${project.name}" (ID: ${project._id})`);

      // Check if agent exists in this project's agents array
      // Try both 'name' and 'alias_name' fields, and also check info.name from User
      logger.info(`🔍 [Auto-Assignment] Looking for agent: "${agentName}" in project "${project.name}"`);
      logger.info(`🔍 [Auto-Assignment] Project has ${project.agents?.length || 0} agents`);
      
      let agent = project.agents?.find(agentItem =>
        agentItem.active &&
        (
          (agentItem.name && agentItem.name.toLowerCase().trim() === agentName.toLowerCase()) ||
          (agentItem.alias_name && agentItem.alias_name.toLowerCase().trim() === agentName.toLowerCase())
        )
      );
      
      // If not found by name/alias, try to find by User's info.name
      if (!agent && project.agents) {
        logger.info(`🔍 [Auto-Assignment] Agent not found by name/alias, trying to find by User info.name...`);
        for (const agentItem of project.agents) {
          if (agentItem.active && agentItem.user) {
            try {
              const user = await User.findById(agentItem.user).lean();
              if (user && user.info?.name) {
                if (user.info.name.toLowerCase().trim() === agentName.toLowerCase()) {
                  agent = agentItem;
                  logger.info(`✅ [Auto-Assignment] Found agent by User info.name: "${user.info.name}"`);
                  break;
                }
              }
            } catch (err) {
              // Continue searching
            }
          }
        }
      }

      if (agent && agent.user) {
        // Get the agent name - prefer name, fallback to alias_name
        const agentDisplayName = agent.name || agent.alias_name || 'Unknown Agent';

        // Auto-assign lead to this agent
        lead.assigned_to = agent.user;
        lead.assigned_agent_name = agentDisplayName;
        lead.assigned_date = new Date();
        lead.assignment_status = 'auto_assigned';
        lead.project_id = project._id;
        lead.project_name = project.name;
        // Set use_status to 'in_use' for assigned leads instead of 'pending'
        lead.use_status = 'in_use';
        // NOTE: We don't set team_id and user_id here during lead creation,
        // Instead, we'll update them after the leads are created, just like assignLeadsService does
        // This ensures proper assignment tracking for agent visibility

        // Handle stage and status assignment if specified
        const stageName = lead.stage_name?.toString().trim();
        const statusName = lead.status_name?.toString().trim();

        if (stageName) {
          try {
            // Import Settings model for stage/status handling

            // Helper function to normalize stage/status names for flexible matching
            const normalizeName = (name) => {
              if (!name) return '';
              return name.toString().toLowerCase().trim().replace(/\s+/g, '');
            };

            // Find the stage in database with flexible matching
            let stage = await Settings.findOne({
              name: stageName,
              type: 'stage'
            }).lean();

            // If not found, try flexible matching (normalized names)
            if (!stage) {
              logger.debug(`🔍 EXACT MATCH FAILED: Trying flexible matching for stage "${stageName}"`);
              const normalizedStageName = normalizeName(stageName);

              // Get all stages and find by normalized name
              const allStages = await Settings.find({ type: 'stage' }).lean();
              stage = allStages.find(s => normalizeName(s.name) === normalizedStageName);

              if (stage) {
                logger.info(`✅ FLEXIBLE MATCH FOUND: Stage "${stageName}" matched to existing stage "${stage.name}"`);
              }
            }

            // If stage doesn't exist, create it
            if (!stage) {
              logger.info(`🆕 CREATING NEW STAGE: Stage "${stageName}" not found - creating new stage`);

              const newStage = new Settings({
                type: 'stage',
                name: stageName,
                info: {
                  isWonStage: false,
                  statuses: []
                }
              });

              stage = await newStage.save();
              logger.info(`✅ NEW STAGE CREATED: "${stageName}" with ID ${stage._id}`);
            }

            // If status is specified, handle status assignment
            if (statusName) {
              // Check if status exists in this stage with flexible matching
              const normalizedStatusName = normalizeName(statusName);
              const existingStatus = stage.info.statuses?.find(status =>
                normalizeName(status.name) === normalizedStatusName
              );

              let finalStatusId;
              let finalStatusCode;

              if (!existingStatus) {
                // Create new status
                const newStatusId = new mongoose.Types.ObjectId();
                const newStatusCode = `STATUS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                logger.info(`🆕 CREATING NEW STATUS: Status "${statusName}" not found in stage "${stageName}" - creating with code "${newStatusCode}"`);

                const newStatus = {
                  name: statusName,
                  code: newStatusCode,
                  allowed: true,
                  _id: newStatusId
                };

                // Add new status to stage
                await Settings.findByIdAndUpdate(stage._id, {
                  $push: { 'info.statuses': newStatus }
                });

                logger.info(`✅ NEW STATUS CREATED: Status "${statusName}" added to stage "${stageName}" with code "${newStatusCode}"`);

                finalStatusId = newStatusId;
                finalStatusCode = newStatusCode;
              } else {
                logger.debug(`✅ EXISTING STATUS FOUND: "${statusName}" with code "${existingStatus.code}" in stage "${stageName}"`);
                finalStatusId = existingStatus._id;
                finalStatusCode = existingStatus.code;
              }

              // Assign stage and status to lead
              lead.stage_id = stage._id;
              lead.stage_name = stage.name;
              lead.status_id = finalStatusId;
              lead.status_name = statusName;
              lead.status_code = finalStatusCode;

              // Special handling for Reklamation stage
              if (stageName.toLowerCase() === 'reklamation') {
                lead.use_status = 'reclamation';
                logger.info(`🔄 SPECIAL STATUS: Lead "${lead.contact_name || lead.email_from}" stage is "Reklamation" - setting use_status to 'reclamation'`);
              }

              // Special handling for "out" status - set active to false
              if (statusName.toLowerCase() === 'out') {
                lead.active = false;
                logger.info(`🔄 OUT STATUS: Lead "${lead.contact_name || lead.email_from}" status is "out" - setting active to false`);
              }

              logger.info(`🎯 STAGE/STATUS ASSIGNMENT: Lead "${lead.contact_name || lead.email_from}" assigned to stage "${stage.name}" with status "${statusName}" (after agent assignment)`);
            } else {
              // Only stage specified, no status
              lead.stage_id = stage._id;
              lead.stage_name = stage.name;

              // Special handling for Reklamation stage
              if (stageName.toLowerCase() === 'reklamation') {
                lead.use_status = 'reclamation';
                logger.info(`🔄 SPECIAL STATUS: Lead "${lead.contact_name || lead.email_from}" stage is "Reklamation" - setting use_status to 'reclamation'`);
              }

              logger.info(`🎯 STAGE ASSIGNMENT: Lead "${lead.contact_name || lead.email_from}" assigned to stage "${stage.name}" (no status, after agent assignment)`);
            }
          } catch (stageError) {
            logger.error(`❌ ERROR during stage/status assignment for lead ${lead.contact_name || lead.email_from}:`, stageError.message || stageError);
            // Continue with agent assignment even if stage/status fails
          }
        }

        results.autoAssignedLeads.push({
          lead: lead,
          agentId: agent.user,
          agentName: agentDisplayName,
          projectId: project._id,
          projectName: project.name,
          message: `Auto-assigned to agent '${agentDisplayName}' in project '${project.name}'${stageName ? ` with stage '${stageName}'${statusName ? ` and status '${statusName}'` : ''}` : ''}`,
        });

        logger.info(`🎯 AUTO-ASSIGNMENT: Lead "${lead.contact_name || lead.email_from}" has been auto-assigned to agent "${agentDisplayName}" in project "${project.name}" (use_status: in_use)${stageName ? ` with stage '${stageName}'${statusName ? ` and status '${statusName}'` : ''}` : ''}`);
      } else {
        logger.info(`❌ ASSIGNMENT FAILED: Agent "${agentName}" not found in project "${projectName}" for lead "${lead.contact_name || lead.email_from}" - importing without assignment`);
        results.remainingLeads.push(lead);
      }

    } catch (error) {
      logger.error(`Error during agent auto-assignment for lead ${lead.contact_name || lead.email_from}:`, error);
      // On error, add to remaining leads for normal processing
      results.remainingLeads.push(lead);
    }
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `🎯 AUTO-ASSIGNMENT PHASE COMPLETED in ${totalTime}ms: ${results.autoAssignedLeads.length} leads auto-assigned, ${results.remainingLeads.length} leads remaining for normal processing`
  );

  // Log summary of auto-assigned leads
  if (results.autoAssignedLeads.length > 0) {
    logger.info(`📊 AUTO-ASSIGNMENT DETAILS:`);
    results.autoAssignedLeads.forEach((assignment, index) => {
      logger.info(`   ${index + 1}. Lead "${assignment.lead.contact_name || assignment.lead.email_from}" → Agent "${assignment.agentName}" in Project "${assignment.projectName}"`);
    });
  }

  return results;
};

/**
 * Stage and Status auto-assignment check for leads with Stage Name and Status fields
 * @param {Array} leads - Array of lead data objects from Excel
 * @returns {Object} - Object with stageAssignedLeads array and remainingLeads array
 */
const checkStageAndStatusAssignment = async (leads) => {
  const startTime = Date.now();
  logger.info(`🎯 STAGE/STATUS ASSIGNMENT: Starting assignment check for ${leads.length} leads`);

  // Import Settings model (stages are stored as settings with type: 'stage')
  try {
    logger.debug(`✅ Settings model imported successfully`);
  } catch (importError) {
    logger.error(`❌ ERROR importing Settings model:`, importError);
    throw importError;
  }

  // Helper function to normalize stage/status names for flexible matching
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toString().toLowerCase().trim().replace(/\s+/g, '');
  };

  const results = {
    stageAssignedLeads: [],
    remainingLeads: [],
  };

  // Track statistics
  const stats = {
    totalProcessed: 0,
    noStageSpecified: 0,
    existingStageUsed: 0,
    newStageCreated: 0,
    existingStatusUsed: 0,
    newStatusCreated: 0,
    stageOnlyAssigned: 0,
    stageAndStatusAssigned: 0,
    errors: 0
  };

  // Process each lead for potential stage and status assignment
  for (const lead of leads) {
    stats.totalProcessed++;

    try {
      const stageName = lead.stage_name?.toString().trim();
      const statusName = lead.status_name?.toString().trim();

      logger.debug(`🎯 PROCESSING LEAD ${stats.totalProcessed}: "${lead.contact_name || lead.email_from}" - Stage: "${stageName || 'N/A'}", Status: "${statusName || 'N/A'}"`);

      // Skip if no stage specified
      if (!stageName) {
        logger.debug(`⏭️  SKIPPING LEAD: No stage specified for "${lead.contact_name || lead.email_from}"`);
        stats.noStageSpecified++;
        results.remainingLeads.push(lead);
        continue;
      }

      // Skip if agent and project are specified (let agent auto-assignment handle these first)
      if (lead.salesperson_agent && lead.project) {
        logger.debug(`⏭️  SKIPPING LEAD: Agent and project specified for "${lead.contact_name || lead.email_from}" - will handle in agent auto-assignment phase`);
        stats.noStageSpecified++;
        results.remainingLeads.push(lead);
        continue;
      }

      // Find the stage in database with flexible matching
      logger.debug(`🔍 SEARCHING FOR STAGE: "${stageName}" in database`);

      // First try exact match
      let stage = await Settings.findOne({
        name: stageName,
        type: 'stage'
      }).lean();

      // If not found, try flexible matching (normalized names)
      if (!stage) {
        logger.debug(`🔍 EXACT MATCH FAILED: Trying flexible matching for stage "${stageName}"`);
        const normalizedStageName = normalizeName(stageName);

        // Get all stages and find by normalized name
        const allStages = await Settings.find({ type: 'stage' }).lean();
        stage = allStages.find(s => normalizeName(s.name) === normalizedStageName);

        if (stage) {
          logger.info(`✅ FLEXIBLE MATCH FOUND: Stage "${stageName}" matched to existing stage "${stage.name}"`);
        }
      }

      // If stage doesn't exist, create it
      if (!stage) {
        logger.info(`🆕 CREATING NEW STAGE: Stage "${stageName}" not found - creating new stage`);
        stats.newStageCreated++;

        const newStage = new Settings({
          type: 'stage',
          name: stageName,
          info: {
            isWonStage: false, // Default to false for new stages
            statuses: []
          }
        });

        stage = await newStage.save();
        logger.info(`✅ NEW STAGE CREATED: "${stageName}" with ID ${stage._id}`);
      } else {
        logger.debug(`✅ EXISTING STAGE FOUND: "${stageName}" with ID ${stage._id} (${stage.info?.statuses?.length || 0} existing statuses)`);
        stats.existingStageUsed++;
      }

      // If status is specified, handle status assignment
      if (statusName) {
        logger.debug(`🔍 SEARCHING FOR STATUS: "${statusName}" in stage "${stageName}"`);

        // Check if status exists in this stage with flexible matching
        const normalizedStatusName = normalizeName(statusName);
        const existingStatus = stage.info.statuses?.find(status =>
          normalizeName(status.name) === normalizedStatusName
        );

        let finalStatusId;
        let finalStatusCode;

        if (!existingStatus) {
          // Create new status
          const newStatusId = new mongoose.Types.ObjectId();
          const newStatusCode = `STATUS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          logger.info(`🆕 CREATING NEW STATUS: Status "${statusName}" not found in stage "${stageName}" - creating with code "${newStatusCode}"`);
          stats.newStatusCreated++;

          const newStatus = {
            name: statusName,
            code: newStatusCode,
            allowed: true,
            _id: newStatusId
          };

          // Add new status to stage
          await Settings.findByIdAndUpdate(stage._id, {
            $push: { 'info.statuses': newStatus }
          });

          logger.info(`✅ NEW STATUS CREATED: Status "${statusName}" added to stage "${stageName}" with code "${newStatusCode}"`);

          // Update stage object with new status
          stage.info.statuses = stage.info.statuses || [];
          stage.info.statuses.push(newStatus);

          // Set final values for new status
          finalStatusId = newStatusId;
          finalStatusCode = newStatusCode;
        } else {
          logger.debug(`✅ EXISTING STATUS FOUND: "${statusName}" with code "${existingStatus.code}" in stage "${stageName}"`);
          stats.existingStatusUsed++;

          // Set final values for existing status
          finalStatusId = existingStatus._id;
          finalStatusCode = existingStatus.code;
        }

        // Assign stage and status to lead
        lead.stage_id = stage._id;
        lead.stage_name = stage.name;
        lead.status_id = finalStatusId;
        lead.status_name = statusName;
        lead.status_code = finalStatusCode;

        // Special handling for Reklamation stage
        if (stageName.toLowerCase() === 'reklamation') {
          lead.use_status = 'reclamation';
          logger.info(`🔄 SPECIAL STATUS: Lead "${lead.contact_name || lead.email_from}" stage is "Reklamation" - setting use_status to 'reclamation'`);
        }

        // Special handling for "out" status - set active to false
        if (statusName.toLowerCase() === 'out') {
          lead.active = false;
          logger.info(`🔄 OUT STATUS: Lead "${lead.contact_name || lead.email_from}" status is "out" - setting active to false`);
        }

        results.stageAssignedLeads.push({
          lead: lead,
          stageId: stage._id,
          stageName: stage.name,
          statusId: finalStatusId,
          statusName: statusName,
          statusCode: finalStatusCode,
          isNewStage: !stage.createdAt || (Date.now() - new Date(stage.createdAt).getTime()) < 60000,
          isNewStatus: !existingStatus,
          message: `Assigned to stage '${stage.name}' with status '${statusName}'${!existingStatus ? ' (newly created)' : ''}`,
        });

        logger.info(`🎯 STAGE/STATUS ASSIGNMENT: Lead "${lead.contact_name || lead.email_from}" assigned to stage "${stage.name}" with status "${statusName}"`);
        stats.stageAndStatusAssigned++;
      } else {
        // Only stage specified, no status
        logger.debug(`📝 STAGE ONLY: No status specified for lead "${lead.contact_name || lead.email_from}" - assigning to stage only`);

        lead.stage_id = stage._id;
        lead.stage_name = stage.name;

        // Special handling for Reklamation stage
        if (stageName.toLowerCase() === 'reklamation') {
          lead.use_status = 'reclamation';
          logger.info(`🔄 SPECIAL STATUS: Lead "${lead.contact_name || lead.email_from}" stage is "Reklamation" - setting use_status to 'reclamation'`);
        }

        results.stageAssignedLeads.push({
          lead: lead,
          stageId: stage._id,
          stageName: stage.name,
          statusId: null,
          statusName: null,
          statusCode: null,
          isNewStage: !stage.createdAt || (Date.now() - new Date(stage.createdAt).getTime()) < 60000, // Consider new if created within last minute
          isNewStatus: false,
          message: `Assigned to stage '${stage.name}' (no status specified)`,
        });

        logger.info(`🎯 STAGE ASSIGNMENT: Lead "${lead.contact_name || lead.email_from}" assigned to stage "${stage.name}" (no status)`);
        stats.stageOnlyAssigned++;
      }

    } catch (error) {
      logger.error(`❌ ERROR during stage/status assignment for lead ${lead.contact_name || lead.email_from}:`, error.message || error);
      logger.error(`❌ ERROR DETAILS:`, error);
      stats.errors++;
      // On error, add to remaining leads for normal processing
      results.remainingLeads.push(lead);
    }
  }

  const totalTime = Date.now() - startTime;

  // Log comprehensive statistics
  logger.info(`📊 STAGE/STATUS ASSIGNMENT STATISTICS:`);
  logger.info(`   📈 Total leads processed: ${stats.totalProcessed}`);
  logger.info(`   ⏭️  No stage specified: ${stats.noStageSpecified}`);
  logger.info(`   ✅ Existing stages used: ${stats.existingStageUsed}`);
  logger.info(`   🆕 New stages created: ${stats.newStageCreated}`);
  logger.info(`   ✅ Existing statuses used: ${stats.existingStatusUsed}`);
  logger.info(`   🆕 New statuses created: ${stats.newStatusCreated}`);
  logger.info(`   📝 Stage-only assignments: ${stats.stageOnlyAssigned}`);
  logger.info(`   🎯 Stage+Status assignments: ${stats.stageAndStatusAssigned}`);
  logger.info(`   ❌ Errors encountered: ${stats.errors}`);

  logger.info(
    `🎯 STAGE/STATUS ASSIGNMENT PHASE COMPLETED in ${totalTime}ms: ${results.stageAssignedLeads.length} leads assigned, ${results.remainingLeads.length} leads remaining for normal processing`
  );

  // Log detailed summary of stage/status assigned leads
  if (results.stageAssignedLeads.length > 0) {
    logger.info(`📋 STAGE/STATUS ASSIGNMENT DETAILS:`);
    results.stageAssignedLeads.forEach((assignment, index) => {
      const statusInfo = assignment.statusName ? ` with status "${assignment.statusName}"` : ' (no status)';
      const newInfo = [];
      if (assignment.isNewStage) newInfo.push('new stage');
      if (assignment.isNewStatus) newInfo.push('new status');
      const newText = newInfo.length > 0 ? ` [${newInfo.join(', ')}]` : '';

      logger.info(`   ${index + 1}. Lead "${assignment.lead.contact_name || assignment.lead.email_from}" → Stage "${assignment.stageName}"${statusInfo}${newText}`);
    });
  }

  return results;
};

/**
 * Create assignment records for auto-assigned leads
 * @param {Array} createdLeads - Array of successfully created leads
 * @param {Array} autoAssignedLeads - Array of auto-assignment data
 * @param {Object} user - User who performed the import
 */
const createAssignmentRecords = async (createdLeads, autoAssignedLeads, user) => {
  const startTime = Date.now();
  logger.info(`Creating assignment records for ${autoAssignedLeads.length} auto-assigned leads`);



  // Create a map of lead contact info to created lead IDs
  const leadMap = new Map();
  createdLeads.forEach(lead => {
    const key = `${lead.contact_name}|${lead.email_from}|${lead.phone}`;
    leadMap.set(key, lead._id);
  });

  let successCount = 0;
  let failureCount = 0;

  // Create assignment records
  for (const autoAssignment of autoAssignedLeads) {
    try {
      const leadKey = `${autoAssignment.lead.contact_name}|${autoAssignment.lead.email_from}|${autoAssignment.lead.phone}`;
      const leadId = leadMap.get(leadKey);

      if (!leadId) {
        logger.warn(`Could not find created lead for auto-assignment: ${leadKey}`);
        failureCount++;
        continue;
      }

      // Validate assignment data before creating record
      if (!leadId || !autoAssignment.projectId || !autoAssignment.agentId || !user._id) {
        logger.error(`Invalid assignment data for lead ${autoAssignment.lead.contact_name}:`, {
          leadId,
          projectId: autoAssignment.projectId,
          agentId: autoAssignment.agentId,
          userId: user._id
        });
        failureCount++;
        continue;
      }

      // Create assignment record
      const assignmentData = {
        lead_id: leadId,
        project_id: autoAssignment.projectId,
        agent_id: autoAssignment.agentId,
        assigned_by: user._id,
        assigned_at: new Date(),
        status: 'active',
        notes: `Auto-assigned during Excel import to agent '${autoAssignment.agentName}' in project '${autoAssignment.projectName}'`,
      };

      // Check if assignment record already exists to avoid duplicates
      const existingAssignment = await AssignLeads.findOne({
        lead_id: leadId,
        project_id: autoAssignment.projectId,
        agent_id: autoAssignment.agentId,
        status: 'active'
      });

      if (existingAssignment) {
        logger.info(`Assignment record already exists for lead ${leadId}, skipping creation`);
        successCount++;
        continue;
      }

      const assignment = new AssignLeads(assignmentData);
      await assignment.save();

      // Update the lead with team_id and user_id for proper assignment tracking (same as assignLeadsService)
      // Find the lead and update it with project_id as team_id and agent_id as user_id
      if (autoAssignment.projectId && autoAssignment.agentId) {
        // Both project_id and agent_id are ObjectIds, use them directly
        const updateResult = await Lead.findByIdAndUpdate(
          leadId,
          {
            $set: {
              team_id: autoAssignment.projectId,  // Save project_id as team_id
              user_id: autoAssignment.agentId,     // Save agent_id as user_id
              assigned_date: new Date(), // Ensure assigned_date is set during assignment record creation
            },
          },
          { new: true } // Return updated document
        );

        if (updateResult) {
          logger.info(`✅ Updated Lead ${leadId}: team_id=${autoAssignment.projectId}, user_id=${autoAssignment.agentId}`);
        } else {
          logger.warn(`⚠️ Lead ${leadId} not found when trying to update team_id and user_id`);
        }
      } else {
        logger.warn(`⚠️ Invalid project_id or agent_id for lead ${leadId}: projectId=${autoAssignment.projectId}, agentId=${autoAssignment.agentId}`);
      }

      // Emit event for activity logging and notifications (same as assignLeadsService)
      try {
        // Get the full lead document for the event
        const fullLead = await Lead.findById(leadId).lean();
        const agent = await User.findById(autoAssignment.agentId).lean();
        const project = await Team.findById(autoAssignment.projectId).lean();

        eventEmitter.emit(EVENT_TYPES.LEAD.ASSIGNED, {
          lead: fullLead,
          creator: user, // The user who performed the import
          agent,
          project,
          batchInfo: {
            isMultiple: autoAssignedLeads.length > 1,
            totalCount: autoAssignedLeads.length,
            currentIndex: successCount + 1 // Current index in the batch
          }
        });

        logger.info(`📧 NOTIFICATION EVENT EMITTED: Assignment notification sent for lead "${autoAssignment.lead.contact_name || autoAssignment.lead.email_from}" assigned to agent "${autoAssignment.agentName}"`);
      } catch (eventError) {
        logger.error(`Failed to emit assignment event for lead ${leadId}:`, eventError);
        // Continue with assignment creation even if event emission fails
      }

      logger.info(`✅ ASSIGNMENT RECORD CREATED: Lead "${autoAssignment.lead.contact_name || autoAssignment.lead.email_from}" (ID: ${leadId}) has been successfully assigned to agent "${autoAssignment.agentName}" in project "${autoAssignment.projectName}"`);
      successCount++;

    } catch (error) {
      logger.error(`Error creating assignment record for lead ${autoAssignment.lead.contact_name}:`, error);
      failureCount++;
    }
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `📋 ASSIGNMENT SUMMARY: Assignment record creation completed in ${totalTime}ms: ${successCount} successful assignments, ${failureCount} failed`
  );

  // Log individual assignment details for successful ones
  if (successCount > 0) {
    logger.info(`🎉 TOTAL LEADS ASSIGNED: ${successCount} leads have been successfully assigned to their respective agents and projects`);
  }
};

/**
 * Optimized duplicate checker for lead imports (max 300 leads)
 * Two-phase approach: In-file duplicates first, then database check with duplicate_status
 * Matches on name OR email OR phone, imports duplicates with status
 * @param {Array} leads - Array of lead data objects from Excel
 * @returns {Object} - Object with validLeads array and failedLeads array with error messages
 */
const checkImportDuplicates = async (leads) => {
  const startTime = Date.now();
  logger.info(`Starting duplicate check for ${leads.length} leads`);

  const results = {
    validLeads: [],
    failedLeads: [],
  };

  // Helper function to normalize data for comparison
  const normalizeData = (lead) => {
    return {
      name: lead.contact_name?.toString().toLowerCase().trim() || '',
      email: lead.email_from?.toString().toLowerCase().trim() || '',
      phone: lead.phone?.toString().replace(/\D/g, '') || '', // Remove all non-digits
      partnerId: lead.lead_source_no?.toString().trim() || '',
    };
  };

  // Helper function to calculate date difference in weeks
  const getDateDifferenceInWeeks = (date1, date2) => {
    const d1 = new Date(date1 || 0);
    const d2 = new Date(date2 || 0);
    const diffTime = Math.abs(d2 - d1);
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks;
  };

  // Helper function to check if dates match (same date, ignoring time)
  const datesMatch = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    // Compare only the date part (year, month, day), ignoring time
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // PHASE 1: In-file duplicate detection (Partner ID duplicates + Contact duplicates)
  logger.info('Phase 1: Checking in-file duplicates...');

  const partnerIdMap = new Map(); // partner_id -> { lead, index }
  const contactMap = new Map(); // contact_key -> { lead, index }
  const processedLeads = [];

  leads.forEach((lead, index) => {
    const normalized = normalizeData(lead);

    // Skip leads with missing critical data (email OR phone required)
    if (!normalized.email && !normalized.phone) {
      results.failedLeads.push({
        ...lead,
        row: index + 2,
        error: 'Missing required contact information (email or phone required)',
      });
      return; // Skip this lead completely
    }

    // Check for Partner ID duplicates in same file (highest priority - reject these)
    if (normalized.partnerId) {
      if (partnerIdMap.has(normalized.partnerId)) {
        const existing = partnerIdMap.get(normalized.partnerId);
        results.failedLeads.push({
          ...lead,
          row: index + 2,
          error: `Duplicate Partner ID '${normalized.partnerId}' in file (first occurrence at row ${existing.index + 2
            }) - Human error`,
        });
        return; // Skip this lead completely - do NOT add to processedLeads
      }
      partnerIdMap.set(normalized.partnerId, { lead, index });
    }

    // Check for contact duplicates in same file (email + phone combination)
    const contactKey = `${normalized.email}|${normalized.phone}`;
    if (contactMap.has(contactKey)) {
      const existing = contactMap.get(contactKey);
      const existingNormalized = normalizeData(existing.lead);

      // If it's the same contact with same Partner ID, it's a complete duplicate - reject
      if (existingNormalized.partnerId === normalized.partnerId) {
        results.failedLeads.push({
          ...lead,
          row: index + 2,
          error: `Complete duplicate contact '${normalized.email || normalized.phone}' with same Partner ID '${normalized.partnerId}' in file (first occurrence at row ${existing.index + 2}) - Human error`,
        });
        return; // Skip this lead completely - do NOT add to processedLeads
      }

      // If it's the same contact with different Partner IDs, set duplicate_status based on lead date difference
      const currentLeadDate = new Date(lead.lead_date || Date.now());
      const existingLeadDate = new Date(existing.lead.lead_date || Date.now());

      // Check if lead dates match (same date, ignoring time)
      const leadDatesMatch = datesMatch(lead.lead_date, existing.lead.lead_date);

      // Calculate date difference in weeks
      const weeksDiff = getDateDifferenceInWeeks(currentLeadDate, existingLeadDate);

      // Determine which lead is newer
      const isCurrentLeadNewer = currentLeadDate > existingLeadDate;

      // Set duplicate_status based on date difference
      let duplicateStatus = 0;
      // If lead dates match, mark as duplicate (status 2 - 10 weeks duplicate)
      if (leadDatesMatch) {
        duplicateStatus = 2; // Duplicate with same date (10 weeks duplicate)
      } else if (Math.abs(weeksDiff) <= 10) {
        duplicateStatus = 2; // Recent duplicate (within 10 weeks)
      } else {
        duplicateStatus = 1; // Old duplicate (more than 10 weeks)
      }

      // If dates match, mark current lead as duplicate
      // Otherwise, only set duplicate_status for the NEWER lead
      if (leadDatesMatch) {
        // When dates match, mark current lead as duplicate (status 2 - 10 weeks duplicate)
        lead.duplicate_status = duplicateStatus;
        logger.debug(
          `Set duplicate_status ${duplicateStatus} for current lead at row ${index + 2} (same date match)`
        );
      } else if (isCurrentLeadNewer) {
        // Current lead is newer - set its duplicate_status
        lead.duplicate_status = duplicateStatus;
        logger.debug(
          `Set duplicate_status ${duplicateStatus} for current lead at row ${index + 2} (newer, weeks diff: ${Math.abs(weeksDiff).toFixed(1)})`
        );
      } else {
        // Existing lead is newer - update the existing lead's duplicate_status
        const existingProcessedIndex = processedLeads.findIndex(
          (item) => item.index === existing.index
        );
        if (existingProcessedIndex !== -1) {
          processedLeads[existingProcessedIndex].lead.duplicate_status = duplicateStatus;
          logger.debug(
            `Set duplicate_status ${duplicateStatus} for existing lead at row ${existing.index + 2} (newer, weeks diff: ${Math.abs(weeksDiff).toFixed(1)})`
          );
        }
        // Current lead remains duplicate_status = 0 (older)
        logger.debug(`Current lead at row ${index + 2} remains duplicate_status = 0 (older lead)`);
      }

      // Update contactMap to track this contact (don't replace, just track that we've seen it)
      contactMap.set(contactKey, { lead, index });
    } else {
      // First occurrence of this contact
      contactMap.set(contactKey, { lead, index });
    }

    // Only add to processed leads if it passed all Phase 1 checks
    processedLeads.push({ lead, normalized, index });
  });

  logger.info(
    `Phase 1 complete: ${processedLeads.length} unique leads, ${results.failedLeads.length} in-file duplicates (Partner ID + Contact)`
  );

  if (processedLeads.length === 0) {
    logger.info(`All leads had in-file duplicates. Completed in ${Date.now() - startTime}ms`);
    return results;
  }

  // PHASE 2: Database duplicate check with duplicate_status (OPTIMIZED - chunked batch queries)
  logger.info('Phase 2: Checking database duplicates and setting duplicate_status...');

  try {
    // ============ PHASE 2.1: Extract unique values ============
    logger.info('   Phase 2.1: Extracting unique values for batch lookup...');
    const extractStart = Date.now();

    const partnerIdSet = new Set();
    const emailSet = new Set();
    const phoneSet = new Set();

    processedLeads.forEach((item) => {
      if (item.normalized.partnerId) partnerIdSet.add(item.normalized.partnerId);
      if (item.normalized.email) emailSet.add(item.normalized.email);
      if (item.normalized.phone) phoneSet.add(item.normalized.phone);
    });

    const partnerIds = Array.from(partnerIdSet);
    const emails = Array.from(emailSet);
    const phones = Array.from(phoneSet);

    logger.info(`   Unique values: ${partnerIds.length} partner IDs, ${emails.length} emails, ${phones.length} phones`);
    logger.info(`   Extraction completed in ${Date.now() - extractStart}ms`);

    // ============ PHASE 2.2: Batch database queries (chunked to avoid BSON limit) ============
    logger.info('   Phase 2.2: Running chunked batch database queries...');
    const queryStart = Date.now();

    let dbLeads = [];
    const CHUNK_SIZE = 5000; // Smaller chunks to stay well under 16MB BSON limit

    // Query 1: Get leads by Partner IDs (chunked)
    if (partnerIds.length > 0) {
      for (let i = 0; i < partnerIds.length; i += CHUNK_SIZE) {
        const chunk = partnerIds.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Lead.find({
          lead_source_no: { $in: chunk }
        })
          .select('contact_name email_from secondary_email phone lead_source_no lead_date')
          .lean();
        dbLeads.push(...chunkResults);
        
        if (partnerIds.length > CHUNK_SIZE && (i + CHUNK_SIZE) % (CHUNK_SIZE * 2) === 0) {
          logger.info(`      Partner ID query progress: ${Math.min(i + CHUNK_SIZE, partnerIds.length)}/${partnerIds.length}`);
        }
      }
      logger.info(`   Found ${dbLeads.length} leads by Partner ID`);
    }

    // Query 2: Get leads by Email (chunked) - using $toLower for case-insensitive matching
    if (emails.length > 0) {
      const existingIds = new Set(dbLeads.map(l => l._id.toString()));
      let emailMatchCount = 0;
      
      for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
        const chunk = emails.slice(i, i + CHUNK_SIZE);
        // Case-insensitive matching using $toLower (faster than regex)
        const lowercaseEmails = chunk.map(e => e.toLowerCase());
        const chunkResults = await Lead.find({
          $expr: { $in: [{ $toLower: '$email_from' }, lowercaseEmails] }
        })
          .select('contact_name email_from secondary_email phone lead_source_no lead_date')
          .lean();
        
        // Add only new leads not already in dbLeads
        chunkResults.forEach(lead => {
          if (!existingIds.has(lead._id.toString())) {
            dbLeads.push(lead);
            existingIds.add(lead._id.toString());
            emailMatchCount++;
          }
        });
        
        logger.info(`      Email query progress: ${Math.min(i + CHUNK_SIZE, emails.length)}/${emails.length}`);
      }
      logger.info(`   Found ${emailMatchCount} additional leads by Email`);
    }

    // Query 3: Get leads by Phone (chunked) - using $in for exact matching (faster than regex)
    const PHONE_CHUNK_SIZE = 5000;
    if (phones.length > 0) {
      const existingIds = new Set(dbLeads.map(l => l._id.toString()));
      let phoneMatchCount = 0;
      
      for (let i = 0; i < phones.length; i += PHONE_CHUNK_SIZE) {
        const chunk = phones.slice(i, i + PHONE_CHUNK_SIZE);
        // Use exact $in matching - phones are already normalized digits
        const chunkResults = await Lead.find({
          phone: { $in: chunk }
        })
          .select('contact_name email_from secondary_email phone lead_source_no lead_date')
          .lean();
        
        // Add only new leads not already in dbLeads
        chunkResults.forEach(lead => {
          if (!existingIds.has(lead._id.toString())) {
            dbLeads.push(lead);
            existingIds.add(lead._id.toString());
            phoneMatchCount++;
          }
        });
        
        logger.info(`      Phone query progress: ${Math.min(i + PHONE_CHUNK_SIZE, phones.length)}/${phones.length}`);
      }
      logger.info(`   Found ${phoneMatchCount} additional leads by Phone`);
    }

    logger.info(`   Total potential database matches: ${dbLeads.length}`);
    logger.info(`   Batch queries completed in ${Date.now() - queryStart}ms`);

    // ============ PHASE 2.3: Build lookup maps ============
    logger.info('   Phase 2.3: Building lookup maps...');
    const mapStart = Date.now();

    // Create lookup maps for matching
    const dbPartnerIdMap = new Map();
    const dbByEmailMap = new Map();
    const dbByPhoneMap = new Map();

    dbLeads.forEach((dbLead) => {
      const dbNormalized = normalizeData(dbLead);

      if (dbNormalized.partnerId) {
        // Store all leads with this partner ID (overwrites, but we only need to know if it exists)
        dbPartnerIdMap.set(dbNormalized.partnerId, dbLead);
      }
      if (dbNormalized.email) {
        if (!dbByEmailMap.has(dbNormalized.email)) dbByEmailMap.set(dbNormalized.email, []);
        dbByEmailMap.get(dbNormalized.email).push(dbLead);
      }
      if (dbNormalized.phone) {
        if (!dbByPhoneMap.has(dbNormalized.phone)) dbByPhoneMap.set(dbNormalized.phone, []);
        dbByPhoneMap.get(dbNormalized.phone).push(dbLead);
      }
    });

    logger.info(`   Maps built: ${dbPartnerIdMap.size} partner IDs, ${dbByEmailMap.size} emails, ${dbByPhoneMap.size} phones`);
    logger.info(`   Map building completed in ${Date.now() - mapStart}ms`);

    // ============ PHASE 2.4: Process leads using maps ============
    logger.info('   Phase 2.4: Processing leads using lookup maps...');
    const processStart = Date.now();

    // Check each lead against database
    processedLeads.forEach((item, idx) => {
      const { lead, normalized } = item;
      let foundMatch = false;
      let duplicateStatus = lead.duplicate_status || 0; // Preserve Phase 1 status or default to 0

      // Log progress every 10000 leads
      if (idx > 0 && idx % 10000 === 0) {
        logger.info(`      Processing progress: ${idx}/${processedLeads.length} leads...`);
      }

      // Check Partner ID match (highest priority - reject these)
      if (normalized.partnerId && dbPartnerIdMap.has(normalized.partnerId)) {
        const existingLead = dbPartnerIdMap.get(normalized.partnerId);
        // Skip verbose logging for large imports
        if (processedLeads.length <= 1000) {
          logger.info(`Rejecting lead with Partner ID '${normalized.partnerId}' - already exists in database (existing lead ID: ${existingLead._id})`);
        }
        results.failedLeads.push({
          ...lead,
          error: `Partner ID '${normalized.partnerId}' already exists in database`,
        });
        return; // Skip this lead, don't add to validLeads
      }

      // Check for content matches (email OR phone)
      const potentialMatches = [];

      // Check email matches
      if (normalized.email && dbByEmailMap.has(normalized.email)) {
        potentialMatches.push(...dbByEmailMap.get(normalized.email));
      }

      // Check phone matches
      if (normalized.phone && dbByPhoneMap.has(normalized.phone)) {
        potentialMatches.push(...dbByPhoneMap.get(normalized.phone));
      }

      // Remove duplicates from potential matches and find the best match
      const uniqueMatches = potentialMatches.filter(
        (match, index, self) =>
          index === self.findIndex((m) => m._id.toString() === match._id.toString())
      );

      if (uniqueMatches.length > 0) {
        // Find match with different Partner ID or both empty Partner IDs
        foundMatch = uniqueMatches.find((match) => {
          const matchNormalized = normalizeData(match);

          // If both have empty Partner IDs, consider them different partners (allow match)
          if (!matchNormalized.partnerId && !normalized.partnerId) {
            return true;
          }

          // If one has empty Partner ID, consider them different partners (allow match)
          if (!matchNormalized.partnerId || !normalized.partnerId) {
            return true;
          }

          // If both have non-empty Partner IDs, they must be different to allow match
          return matchNormalized.partnerId !== normalized.partnerId;
        });

        if (foundMatch) {
          // Calculate duplicate status based on lead date difference
          const weeksDiff = getDateDifferenceInWeeks(lead.lead_date, foundMatch.lead_date);

          if (weeksDiff <= 10) {
            duplicateStatus = 2; // Recent duplicate (within 10 weeks)
          } else {
            duplicateStatus = 1; // Old duplicate (more than 10 weeks)
          }
        }
      }

      // Only add lead to validLeads if it passed all checks
      results.validLeads.push({
        ...lead,
        duplicate_status: duplicateStatus, // This will preserve Phase 1 status if no database match found
      });
    });

    logger.info(`   Lead processing completed in ${Date.now() - processStart}ms`);
  } catch (error) {
    logger.error('Error during database duplicate check:', error);
    throw new Error(`Database duplicate check failed: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `Duplicate check completed in ${totalTime}ms: ${results.validLeads.length} valid leads, ${results.failedLeads.length} failures`
  );

  return results;
};

/**
 * Automatically create reclamation records for leads with Reklamation stage
 * @param {Array} createdLeads - Array of successfully created leads
 * @param {Array} stageAssignedLeads - Array of stage-assigned leads data
 * @param {Array} autoAssignedLeads - Array of auto-assigned leads data
 * @param {Object} user - User who performed the import
 */
const createReclamationRecordsForReklamationLeads = async (createdLeads, stageAssignedLeads, autoAssignedLeads, user) => {
  const startTime = Date.now();
  logger.info(`🔴 RECLAMATION AUTO-CREATION: Starting automatic reclamation creation for Reklamation stage leads`);

  // Import required models and services
  const reclamationService = require('../reclamationService');

  // Create a map of lead contact info to created lead IDs for quick lookup
  const leadMap = new Map();
  createdLeads.forEach(lead => {
    const key = `${lead.contact_name}|${lead.email_from}|${lead.phone}`;
    leadMap.set(key, lead._id);
  });

  // Collect all leads that have reklamation stage
  const reklamationLeads = [];

  // Check stage-assigned leads
  stageAssignedLeads.forEach((stageAssignment) => {
    if (stageAssignment.stageName.toLowerCase() === 'reklamation') {
      const leadKey = `${stageAssignment.lead.contact_name}|${stageAssignment.lead.email_from}|${stageAssignment.lead.phone}`;
      const leadId = leadMap.get(leadKey);

      if (leadId) {
        reklamationLeads.push({
          leadId: leadId,
          leadData: stageAssignment.lead,
          projectId: stageAssignment.lead.project_id || null,
          agentId: stageAssignment.lead.assigned_to || null,
          statusName: stageAssignment.statusName || 'Reclamation',
          source: 'stage_assignment'
        });
      }
    }
  });

  // Check auto-assigned leads
  autoAssignedLeads.forEach((autoAssignment) => {
    const stageName = autoAssignment.lead.stage_name?.toString().trim();
    if (stageName && stageName.toLowerCase() === 'reklamation') {
      const leadKey = `${autoAssignment.lead.contact_name}|${autoAssignment.lead.email_from}|${autoAssignment.lead.phone}`;
      const leadId = leadMap.get(leadKey);

      if (leadId) {
        // Check if already added from stage assignment to avoid duplicates
        const alreadyAdded = reklamationLeads.some(rl => rl.leadId.toString() === leadId.toString());

        if (!alreadyAdded) {
          reklamationLeads.push({
            leadId: leadId,
            leadData: autoAssignment.lead,
            projectId: autoAssignment.projectId || null,
            agentId: autoAssignment.agentId || null,
            statusName: autoAssignment.lead.status_name || 'Reclamation',
            source: 'auto_assignment'
          });
        }
      }
    }
  });

  if (reklamationLeads.length === 0) {
    logger.info(`🔴 RECLAMATION AUTO-CREATION: No leads with Reklamation stage found - skipping reclamation creation`);
    return {
      successCount: 0,
      failureCount: 0,
      createdReclamations: [],
      errors: []
    };
  }

  logger.info(`🔴 RECLAMATION AUTO-CREATION: Found ${reklamationLeads.length} leads with Reklamation stage for automatic reclamation creation`);

  let successCount = 0;
  let failureCount = 0;
  const createdReclamations = [];
  const errors = [];

  // Create reclamation records for each reklamation lead
  for (const reklamationLead of reklamationLeads) {
    try {
      const { leadId, leadData, projectId, agentId, statusName, source } = reklamationLead;

      // Prepare reclamation data
      const reclamationData = {
        lead_id: leadId,
        project_id: projectId, // Optional - can be null for admin imports
        agent_id: agentId, // Optional - can be null for admin imports
        reason: `Automatic reclamation created during Excel import - Lead imported with Reklamation stage${statusName ? ` and status "${statusName}"` : ''}`,
        status: 0, // Pending
      };

      logger.debug(`🔴 CREATING RECLAMATION: Lead "${leadData.contact_name || leadData.email_from}" (ID: ${leadId}) - Source: ${source}`);

      // Create the reclamation record using the reclamation service
      // This will automatically handle stage/status updates and activity logging
      const reclamation = await reclamationService.createReclamation(reclamationData, user);

      if (reclamation) {
        createdReclamations.push({
          reclamationId: reclamation._id,
          leadId: leadId,
          leadName: leadData.contact_name || leadData.email_from,
          source: source,
          projectId: projectId,
          agentId: agentId,
        });

        successCount++;
        logger.info(`✅ RECLAMATION CREATED: Successfully created reclamation record ${reclamation._id} for lead "${leadData.contact_name || leadData.email_from}" (${source})`);
      } else {
        errors.push({
          leadId: leadId,
          leadName: leadData.contact_name || leadData.email_from,
          error: 'Reclamation service returned null',
          source: source
        });
        failureCount++;
        logger.error(`❌ RECLAMATION FAILED: Reclamation service returned null for lead "${leadData.contact_name || leadData.email_from}"`);
      }

    } catch (error) {
      errors.push({
        leadId: reklamationLead.leadId,
        leadName: reklamationLead.leadData.contact_name || reklamationLead.leadData.email_from,
        error: error.message || 'Unknown error',
        source: reklamationLead.source
      });
      failureCount++;
      logger.error(`❌ RECLAMATION ERROR: Failed to create reclamation for lead "${reklamationLead.leadData.contact_name || reklamationLead.leadData.email_from}":`, error.message || error);
    }
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `🔴 RECLAMATION AUTO-CREATION COMPLETED in ${totalTime}ms: ${successCount} reclamations created, ${failureCount} failed`
  );

  // Log summary of created reclamations
  if (successCount > 0) {
    logger.info(`📋 RECLAMATION CREATION DETAILS:`);
    createdReclamations.forEach((reclamation, index) => {
      logger.info(`   ${index + 1}. Lead "${reclamation.leadName}" → Reclamation ID: ${reclamation.reclamationId} (${reclamation.source})`);
    });
  }

  // Log errors if any
  if (errors.length > 0) {
    logger.error(`❌ RECLAMATION CREATION ERRORS:`);
    errors.forEach((error, index) => {
      logger.error(`   ${index + 1}. Lead "${error.leadName}" (${error.source}): ${error.error}`);
    });
  }

  return {
    successCount,
    failureCount,
    createdReclamations,
    errors
  };
};

const parseExcelDate = (dateString) => {
  if (!dateString) return new Date();

  try {
    // Handle Excel date format "YYYY-MM-DD HH:MM:SS"
    if (typeof dateString === 'string' && dateString.includes('-')) {
      // Replace any special characters that might cause issues
      dateString = dateString.replace(/[\u200B-\u200D\uFEFF]/g, '');

      // Parse the date string
      const date = new Date(dateString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        logger.error(`Invalid date format: ${dateString}, using current date instead`);
        return new Date();
      }

      return date;
    }

    // Handle Excel numeric date (days since 1900-01-01)
    if (typeof dateString === 'number') {
      // Excel's epoch starts on 1900-01-01, but it has a bug treating 1900 as a leap year
      // So we need to adjust by subtracting 1 for dates after 1900-02-28
      const excelEpoch = new Date(1900, 0, 1);
      let daysSinceEpoch = dateString;

      if (daysSinceEpoch > 59) {
        // Dates after February 28, 1900
        daysSinceEpoch -= 1; // Adjust for Excel's leap year bug
      }

      const milliseconds = daysSinceEpoch * 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + milliseconds);
    }

    // If all else fails, try standard Date parsing
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      logger.error(`Failed to parse date: ${dateString}, using current date instead`);
      return new Date();
    }

    return date;
  } catch (error) {
    logger.error(`Error parsing date: ${dateString}`, { error });
    return new Date();
  }
};

const importLeadsFromExcel = async (file, user, source_id, lead_price = 0) => {
  const startTime = Date.now();
  let importRecord = null;
  let rows = []; // Declare rows variable outside try block to make it accessible in catch

  try {
    // Use centralized storage configuration
    const importsDir = storageConfig.getPath('imports');
    // Directory creation is handled by storageConfig

    // Generate a checksum-based filename to avoid duplicates of identical files
    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `import-${checksum}${fileExtension}`;

    // FIXED: Use cloud storage upload instead of local filesystem copy
    let uploadResult;
    let storedFilePath;

    try {
      // Upload file using hybrid storage (local + cloud)
      uploadResult = await storageConfig.uploadFile(
        fileBuffer,
        storedFilename,
        'imports',
        {
          originalFilename: file.originalname,
          uploader: user._id || user.id,
          contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          source: 'lead_excel_import',
          uploadedAt: new Date().toISOString()
        }
      );

      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.errors?.join(', ') || 'Unknown error'}`);
      }

      // For backward compatibility, set storedFilePath for local access if needed
      storedFilePath = storageConfig.getFilePath(storedFilename, 'imports');

      logger.info(`✅ Lead import file uploaded successfully`, {
        filename: storedFilename,
        originalName: file.originalname,
        size: fileBuffer.length,
        cloudSuccess: uploadResult.storage?.cloud || false,
        localSuccess: uploadResult.storage?.local || false,
        webPath: uploadResult.webPath,
        storage: uploadResult.storage?.cloud ? 'CLOUD' : 'LOCAL'
      });
    } catch (uploadError) {
      logger.error('❌ Failed to upload lead import file to storage', {
        filename: storedFilename,
        originalName: file.originalname,
        error: uploadError.message,
        cloudEnabled: storageConfig.isCloudEnabled()
      });
      throw uploadError;
    }

    // Get file stats
    const fileStats = fs.statSync(file.path); // Use original temp file for stats

    // Read the Excel file
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Create import history record
    importRecord = new ImportHistory({
      user_id: user._id || user.id,
      user_name: user.name || user.login || user.email || 'Unknown',
      user_email: user.email || user.login || 'unknown@example.com',
      original_filename: file.originalname,
      stored_filename: storedFilename,
      file_size: fileStats.size,
      source_id: source_id || null,
      lead_price: lead_price,
      total_rows: rows.length,
      success_count: 0,
      failure_count: 0,
      status: 'processing',
      original_file_path: storedFilePath,
    });

    await importRecord.save();
    logger.info(
      `Created import record ${importRecord._id} for ${rows.length} leads from user ${user.email}`
    );

    logger.info(`Processing ${rows.length} leads from Excel file with lead price: ${lead_price}`);

    // Helper function to safely convert values to strings
    const safeToString = (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return value.toString().trim();
    };

    // Helper function to parse revenue values (handles "30k", "1.5M", etc.)
    const parseRevenue = (value) => {
      if (!value) return 0;

      // Convert to string and normalize
      let strValue = value.toString().toLowerCase().trim();

      // If it's already a number, return it
      if (!isNaN(parseFloat(strValue)) && isFinite(strValue)) {
        return parseFloat(strValue);
      }

      // Remove currency symbols and spaces
      strValue = strValue.replace(/[$€£¥₹,\s]/g, '');

      // Handle common suffixes
      let multiplier = 1;
      let numericPart = strValue;

      if (strValue.includes('k')) {
        multiplier = 1000;
        numericPart = strValue.replace('k', '');
      } else if (strValue.includes('m')) {
        multiplier = 1000000;
        numericPart = strValue.replace('m', '');
      } else if (strValue.includes('b')) {
        multiplier = 1000000000;
        numericPart = strValue.replace('b', '');
      }

      // Parse the numeric part
      const parsed = parseFloat(numericPart);

      if (isNaN(parsed)) {
        logger.warn(`Could not parse revenue value: "${value}", defaulting to 0`);
        return 0;
      }

      return parsed * multiplier;
    };

    // Helper function for more robust field validation
    const validateField = {
      contact_name: (value) => {
        if (!value) return false;
        const stringValue = value.toString().trim();
        return stringValue.length > 0 && stringValue.length <= 255;
      },
      email_from: (value) => {
        if (!value) return false;
        const stringValue = value.toString().trim();
        return /^\S+@\S+\.\S+$/.test(stringValue) && stringValue.length <= 255;
      },
      phone: (value) => {
        if (!value) return false;
        // Convert to string and remove all non-digits for validation
        const phoneString = value.toString().replace(/\D/g, '');
        return phoneString.length >= 5 && phoneString.length <= 20;
      }
    };

    // Define required fields for validation with enhanced validators
    const requiredFields = [
      {
        excelField: ['Contact Name', 'Name', 'contact_name'],
        modelField: 'contact_name',
        validator: validateField.contact_name,
      },
      {
        excelField: ['Email', 'email_from'],
        modelField: 'email_from',
        validator: validateField.email_from,
      },
      {
        excelField: ['Phone', 'Phone Number', 'phone'],
        modelField: 'phone',
        validator: validateField.phone,
      },
    ];


    // Helper function to safely convert string to ObjectId (returns null if invalid)
    const safeToObjectId = (value) => {
      if (!value) return null;
      const stringValue = value.toString().trim();
      if (!stringValue) return null;
      // Check if it's a valid ObjectId format (24 hex characters)
      if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
        return new mongoose.Types.ObjectId(stringValue);
      }
      return null;
    };

    // Helper function to find User by name (searches in info.name field, case-insensitive)
    const findUserByLogin = async (name) => {
      logger.info(`🔍 [findUserByLogin] FUNCTION CALLED with name: "${name}" (type: ${typeof name})`);
      
      if (!name) {
        logger.info(`🔍 [findUserByLogin] Early return: name is falsy`);
        return null;
      }
      const nameString = name.toString().trim();
      if (!nameString) {
        logger.info(`🔍 [findUserByLogin] Early return: nameString is empty after trim`);
        return null;
      }

      logger.info(`🔍 [findUserByLogin] Finding user by name: "${nameString}"`);

      // First check if it's already an ObjectId
      const objectId = safeToObjectId(nameString);
      if (objectId) {
        const user = await User.findById(objectId).lean();
        if (user) {
          logger.info(`✅ Found user by ObjectId: ${user._id} (name: "${user.info?.name || user.login}")`);
          return user._id;
        }
      }

      // Search User table by info.name (case-insensitive)
      // Also try login field as fallback for backward compatibility
      const user = await User.findOne({
        $or: [
          { 'info.name': { $regex: new RegExp(`^${nameString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { login: { $regex: new RegExp(`^${nameString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ],
        active: true
      }).lean();

      if (user) {
        logger.info(`✅ Found user by name: ${user._id} (info.name: "${user.info?.name || 'N/A'}", login: "${user.login || 'N/A'}")`);
        return user._id;
      } else {
        logger.warn(`❌ User not found with name: "${nameString}"`);
      }

      return null;
    };

    // Helper function to normalize team names for matching (handles spaces, dashes, case)
    const normalizeNameForMatching = (name) => {
      if (!name) return '';
      // Convert to lowercase, trim, and normalize whitespace/dashes
      return name.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')  // Normalize " - " or " -" or "- " to just "-"
        .replace(/\s+/g, '');  // Remove all spaces (so "Core - Live" becomes "core-live")
    };

    // Helper function to find Team by name (case-insensitive, whitespace-normalized)
    const findTeamByName = async (name) => {
      try {
        logger.info(`🔍 [findTeamByName] ===== FUNCTION CALLED =====`);
        logger.info(`🔍 [findTeamByName] Input name: "${name}" (type: ${typeof name})`);
        logger.info(`🔍 [findTeamByName] Input name value: ${JSON.stringify(name)}`);
        
        if (!name) {
          logger.info(`🔍 [findTeamByName] ❌ Early return: name is falsy`);
          return null;
        }
        
        logger.info(`🔍 [findTeamByName] ✅ Name is truthy, proceeding...`);
        
        const nameString = name.toString().trim();
        logger.info(`🔍 [findTeamByName] After toString().trim(): "${nameString}" (length: ${nameString.length})`);
        
        if (!nameString) {
          logger.info(`🔍 [findTeamByName] ❌ Early return: nameString is empty after trim`);
          return null;
        }
        
        logger.info(`🔍 [findTeamByName] ✅ nameString is not empty, normalizing...`);
        
        const normalizedName = normalizeNameForMatching(nameString);
        logger.info(`🔍 [findTeamByName] Normalized name: "${normalizedName}" (length: ${normalizedName.length})`);
        
        if (!normalizedName) {
          logger.info(`🔍 [findTeamByName] ❌ Early return: normalizedName is empty`);
          return null;
        }

        logger.info(`🔍 [findTeamByName] ✅ Normalized name exists, searching for team...`);
        logger.info(`🔍 [findTeamByName] Finding team by name: "${nameString}" (normalized: "${normalizedName}")`);

        // First check if it's already an ObjectId
        logger.info(`🔍 [findTeamByName] Checking if input is ObjectId...`);
        const objectId = safeToObjectId(nameString);
        if (objectId) {
          logger.info(`🔍 [findTeamByName] Input is ObjectId, searching by ID...`);
          const team = await Team.findById(objectId).lean();
          if (team) {
            logger.info(`✅ [findTeamByName] Found team by ObjectId: ${team._id} (name: "${team.name}")`);
            return team._id;
          } else {
            logger.info(`🔍 [findTeamByName] No team found with ObjectId: ${objectId}`);
          }
        } else {
          logger.info(`🔍 [findTeamByName] Input is not an ObjectId, searching by name...`);
        }

        // Search by name using normalized matching (handles spaces, dashes, case)
        logger.info(`🔍 [findTeamByName] Fetching all active teams from database...`);
        const allTeams = await Team.find({ active: true }).lean();
        logger.info(`🔍 [findTeamByName] Found ${allTeams.length} active teams in database`);
        logger.info(`🔍 [findTeamByName] Searching through teams for match...`);
        
        const team = allTeams.find(t => {
          const dbName = normalizeNameForMatching(t.name);
          const matches = dbName === normalizedName;
          if (matches) {
            logger.info(`🔍 [findTeamByName] ✅ MATCH FOUND! DB name: "${t.name}" (normalized: "${dbName}") matches input: "${nameString}" (normalized: "${normalizedName}")`);
          }
          return matches;
        });

        if (team) {
          logger.info(`✅ [findTeamByName] SUCCESS: Found team by name: ${team._id} (name: "${team.name}")`);
          return team._id;
        } else {
          logger.warn(`❌ [findTeamByName] Team not found with name: "${nameString}" (normalized: "${normalizedName}")`);
          // Log first few team names for debugging
          if (allTeams.length > 0) {
            logger.info(`🔍 [findTeamByName] Available team names (first 10):`);
            allTeams.slice(0, 10).forEach((t, idx) => {
              logger.info(`   ${idx + 1}. "${t.name}" (normalized: "${normalizeNameForMatching(t.name)}")`);
            });
          } else {
            logger.warn(`🔍 [findTeamByName] No active teams found in database!`);
          }
        }

        logger.info(`🔍 [findTeamByName] ===== RETURNING NULL =====`);
        return null;
      } catch (error) {
        logger.error(`❌ [findTeamByName] ERROR in function:`, error);
        logger.error(`❌ [findTeamByName] Error stack:`, error.stack);
        return null;
      }
    };

    // Map Excel columns to lead fields with validation
    const leadsData = [];
    const invalidRows = [];

    logger.info(`\n🚀 STARTING ROW PROCESSING WITH LOOKUPS: ${rows.length} rows to process`);
    logger.info(`📋 This will extract and lookup: Previous Agent, Previous Project, Source Agent, Source Project`);

    // Helper function to normalize column names for fuzzy matching
    const normalizeColumnName = (name) => {
      if (!name) return '';
      return name.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')  // Normalize " - " to "-"
        .replace(/\s+/g, '');  // Remove all spaces
    };

    // Helper function to find column value with fuzzy matching
    const findColumnValueFuzzy = (sanitizedRow, possibleNames) => {
      // First try exact match (case-sensitive)
      for (const name of possibleNames) {
        if (sanitizedRow[name] !== undefined) {
          return sanitizedRow[name];
        }
      }
      
      // Then try case-insensitive match
      const rowKeys = Object.keys(sanitizedRow);
      for (const name of possibleNames) {
        const normalizedName = normalizeColumnName(name);
        for (const key of rowKeys) {
          if (normalizeColumnName(key) === normalizedName) {
            return sanitizedRow[key];
          }
        }
      }
      
      return undefined;
    };

    // Convert to for...of loop to handle async operations
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      
      // Log progress every 5000 rows
      if (index > 0 && index % 5000 === 0) {
        logger.info(`📊 Progress: Processing row ${index} of ${rows.length} (${Math.round((index / rows.length) * 100)}%)`);
      }
      
      // Sanitize column names by trimming whitespace and creating a lookup map
      const sanitizedRow = {};
      Object.keys(row).forEach((key) => {
        const sanitizedKey = key.trim();
        sanitizedRow[sanitizedKey] = row[key];
      });

      // DEBUG: Log all column names for first row to see what we're working with
      if (index === 0) {
        logger.info(`\n🔍 DEBUG: All Excel column names (first row):`);
        Object.keys(sanitizedRow).forEach((key) => {
          logger.info(`   "${key}" = "${sanitizedRow[key] || '(empty)'}"`);
        });
      }

      // Map Excel columns to lead model fields using sanitized keys
      const leadData = {
        contact_name: safeToString(sanitizedRow['Contact Name'] || sanitizedRow['Name'] || sanitizedRow['contact_name']),
        email_from: safeToString(sanitizedRow['Email'] || sanitizedRow['email_from']),
        phone: safeToString(sanitizedRow['Phone'] || sanitizedRow['Phone Number'] || sanitizedRow['phone']),
        expected_revenue: parseRevenue(sanitizedRow['Expected Revenue'] || sanitizedRow['expected_revenue']),
        lead_date: sanitizedRow['Lead Date'] || sanitizedRow['lead_date']
          ? parseExcelDate(sanitizedRow['Lead Date'] || sanitizedRow['lead_date'])
          : new Date(),
        // Store Partner ID in lead_source_no field
        lead_source_no: safeToString(sanitizedRow['Partner ID'] || sanitizedRow['Lead Source Number'] || sanitizedRow['lead_source_no']),
        // Apply source_id from parameter if provided, otherwise use from Excel (if available)
        source_id: source_id || sanitizedRow['Source'] || sanitizedRow['Source ID'] || sanitizedRow['source_id'] || null,
        // NEW: Add agent and project fields for auto-assignment
        // Support multiple column name variations: "Agent", "Salesperson / Agent", "salesperson_agent", etc.
        salesperson_agent: safeToString(
          sanitizedRow['Agent'] || 
          sanitizedRow['Salesperson / Agent'] || 
          sanitizedRow['Salesperson'] ||
          sanitizedRow['salesperson_agent'] ||
          sanitizedRow['agent'] ||
          ''
        ),
        project: safeToString(
          sanitizedRow['Project'] || 
          sanitizedRow['project'] ||
          sanitizedRow['Team'] ||
          sanitizedRow['team'] ||
          ''
        ),
        // NEW: Add stage and status fields for auto-assignment
        stage_name: safeToString(sanitizedRow['Stage Name'] || sanitizedRow['Stage'] || sanitizedRow['stage_name']),
        status_name: safeToString(sanitizedRow['Status'] || sanitizedRow['Status Name'] || sanitizedRow['status_name']),
        // Set use_status to pending for all imported leads
        use_status: 'pending',
        // Set leadPrice from parameter instead of fetching from source
        leadPrice: lead_price,
        // Add any other fields you need to map
      };

      // Extract Previous Agent, Previous Project, Source Agent, and Source Project from Excel
      // Use fuzzy matching to handle column name variations (case, whitespace, etc.)
      const previousAgentRaw = findColumnValueFuzzy(sanitizedRow, ['Previous Agent', 'PreviousAgent', 'previous_agent', 'Previous agent']);
      const previousProjectRaw = findColumnValueFuzzy(sanitizedRow, ['Previous Project', 'PreviousProject', 'previous_project', 'Previous project']);
      const sourceAgentRaw = findColumnValueFuzzy(sanitizedRow, ['Source Agent', 'SourceAgent', 'source_agent', 'Source agent']);
      const sourceProjectRaw = findColumnValueFuzzy(sanitizedRow, ['Source Project', 'SourceProject', 'source_project', 'Source project']);
      
      const previousAgentName = previousAgentRaw !== undefined ? safeToString(previousAgentRaw) : '';
      const previousProjectName = previousProjectRaw !== undefined ? safeToString(previousProjectRaw) : '';
      const sourceAgentName = sourceAgentRaw !== undefined ? safeToString(sourceAgentRaw) : '';
      const sourceProjectName = sourceProjectRaw !== undefined ? safeToString(sourceProjectRaw) : '';
      
      // Only log extraction details for first 5 rows to avoid performance issues with large files
      const shouldLogDetails = index < 5;
      
      if (shouldLogDetails) {
        logger.info(`\n🔍 ===== EXTRACTION FOR ROW ${index + 1} =====`);
        logger.info(`🔍 Row ${index + 1} EXTRACTION RESULTS:`);
        logger.info(`   Previous Agent: "${previousAgentName || 'NOT FOUND'}" ${previousAgentRaw !== undefined ? '(found)' : '(column not found)'}`);
        logger.info(`   Previous Project: "${previousProjectName || 'NOT FOUND'}" ${previousProjectRaw !== undefined ? '(found)' : '(column not found)'}`);
        logger.info(`   Source Agent: "${sourceAgentName || 'NOT FOUND'}" ${sourceAgentRaw !== undefined ? '(found)' : '(column not found)'}`);
        logger.info(`   Source Project: "${sourceProjectName || 'NOT FOUND'}" ${sourceProjectRaw !== undefined ? '(found)' : '(column not found)'}`);
        
        // If source fields are not found, log available column names for debugging
        if (sourceAgentRaw === undefined || sourceProjectRaw === undefined) {
          logger.warn(`⚠️ Row ${index + 1}: Source fields not found. Available columns: ${Object.keys(sanitizedRow).join(', ')}`);
        }
      }
      
      // DEBUG: Log what we found for first row with detailed info
      if (index === 0) {
        logger.info(`\n🔍 DEBUG: Direct extraction for row ${index + 1}:`);
        logger.info(`   sanitizedRow['Previous Agent'] = "${sanitizedRow['Previous Agent'] || 'UNDEFINED'}"`);
        logger.info(`   sanitizedRow['Previous Project'] = "${sanitizedRow['Previous Project'] || 'UNDEFINED'}"`);
        logger.info(`   sanitizedRow['Source Agent'] = "${sanitizedRow['Source Agent'] || 'UNDEFINED'}"`);
        logger.info(`   sanitizedRow['Source Project'] = "${sanitizedRow['Source Project'] || 'UNDEFINED'}"`);
      }

      // Store extracted names temporarily in leadData for later lookup (after all phases)
      // We'll do the actual lookups after all phases are complete, before database insertion
      // CRITICAL: These fields MUST be stored so Phase 6 can find them
      if (previousAgentName) {
        leadData._previousAgentName = previousAgentName;
        if (shouldLogDetails) logger.info(`   ✅ Stored _previousAgentName: "${previousAgentName}"`);
      }
      if (previousProjectName) {
        leadData._previousProjectName = previousProjectName;
        if (shouldLogDetails) logger.info(`   ✅ Stored _previousProjectName: "${previousProjectName}"`);
      }
      if (sourceAgentName) {
        leadData._sourceAgentName = sourceAgentName;
        if (shouldLogDetails) logger.info(`   ✅ Stored _sourceAgentName: "${sourceAgentName}"`);
      }
      if (sourceProjectName) {
        leadData._sourceProjectName = sourceProjectName;
        if (shouldLogDetails) logger.info(`   ✅ Stored _sourceProjectName: "${sourceProjectName}"`);
      }
      
      if (shouldLogDetails) {
        logger.info(`🔍 ===== END EXTRACTION FOR ROW ${index + 1} =====\n`);
      }

      // Log extracted values for first few rows
      if (index < 3) {
        logger.info(`\n📥 Row ${index + 1} EXTRACTED VALUES (STORED FOR LATER LOOKUP):`);
        logger.info(`   Previous Agent: ${previousAgentName ? `✅ FOUND: "${previousAgentName}"` : '❌ NOT FOUND'}`);
        logger.info(`   Previous Project: ${previousProjectName ? `✅ FOUND: "${previousProjectName}"` : '❌ NOT FOUND'}`);
        logger.info(`   Source Agent: ${sourceAgentName ? `✅ FOUND: "${sourceAgentName}"` : '❌ NOT FOUND'}`);
        logger.info(`   Source Project: ${sourceProjectName ? `✅ FOUND: "${sourceProjectName}"` : '❌ NOT FOUND'}`);
      }

      // DEBUG: Log field mapping for troubleshooting
      if (index < 3) { // Log first 3 rows for debugging
        logger.debug(`Row ${index + 1} field mapping:`, {
          original_keys: Object.keys(row),
          sanitized_keys: Object.keys(sanitizedRow),
          mapping_results: {
            contact_name: {
              'Contact Name': sanitizedRow['Contact Name'],
              'Name': sanitizedRow['Name'],
              'contact_name': sanitizedRow['contact_name'],
              final: leadData.contact_name
            },
            email_from: {
              'Email': sanitizedRow['Email'],
              'email_from': sanitizedRow['email_from'],
              final: leadData.email_from
            },
            phone: {
              'Phone': sanitizedRow['Phone'],
              'Phone Number': sanitizedRow['Phone Number'],
              'phone': sanitizedRow['phone'],
              final: leadData.phone
            },
            lead_source_no: {
              'Partner ID': sanitizedRow['Partner ID'],
              'Lead Source Number': sanitizedRow['Lead Source Number'],
              'lead_source_no': sanitizedRow['lead_source_no'],
              final: leadData.lead_source_no
            },
            expected_revenue: {
              'Expected Revenue': sanitizedRow['Expected Revenue'],
              'expected_revenue': sanitizedRow['expected_revenue'],
              raw_value: sanitizedRow['Expected Revenue'] || sanitizedRow['expected_revenue'],
              parsed_value: leadData.expected_revenue
            }
          }
        });
      }

      // Validate required fields using custom validators
      const missingFields = [];
      requiredFields.forEach((field) => {
        // Get the value from the mapped lead data
        const mappedFieldValue = leadData[field.modelField];

        // Use the custom validator function to check if the value is valid
        const isValid = field.validator ? field.validator(mappedFieldValue) : false;

        if (!isValid) {
          missingFields.push(field.modelField);
          // Log the invalid value for debugging
          logger.info(`Invalid value for ${field.modelField}: '${mappedFieldValue}'`);
        }
      });

      // Debug logging
      if (missingFields.length > 0) {
        logger.info(`Row validation failed: ${JSON.stringify(missingFields)}`, {
          rowData: row,
          leadData: leadData,
        });
      }

      // If any required fields are missing, add to invalid rows
      if (missingFields.length > 0) {
        invalidRows.push({
          data: row,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      } else {
        leadsData.push(leadData);
      }
    }

    logger.info(
      `✅ Validated ${rows.length} rows: ${leadsData.length} valid, ${invalidRows.length} invalid`
    );
    
    // Count how many leads have names stored for lookup
    const leadsWithPreviousAgentName = leadsData.filter(l => l._previousAgentName).length;
    const leadsWithPreviousProjectName = leadsData.filter(l => l._previousProjectName).length;
    const leadsWithSourceAgentName = leadsData.filter(l => l._sourceAgentName).length;
    const leadsWithSourceProjectName = leadsData.filter(l => l._sourceProjectName).length;
    
    logger.info(`📊 EXTRACTED NAMES SUMMARY (will lookup after all phases):`);
    logger.info(`   Previous Agent names extracted: ${leadsWithPreviousAgentName}`);
    logger.info(`   Previous Project names extracted: ${leadsWithPreviousProjectName}`);
    logger.info(`   Source Agent names extracted: ${leadsWithSourceAgentName}`);
    logger.info(`   Source Project names extracted: ${leadsWithSourceProjectName}`);

    // PHASE 2: Integrated Enhancement and Duplicate Check
    logger.info('Phase 2: Integrated enhancement and duplicate detection...');
    const enhancementResults = await checkDatabaseEnhancement(leadsData);

    // PHASE 3: Stage and Status Assignment Check (only on remaining leads)
    logger.info('Phase 3: Checking for stage and status assignment opportunities...');
    const stageStatusResults = await checkStageAndStatusAssignment(enhancementResults.remainingLeads);

    // PHASE 4: Agent Auto-Assignment Check
    logger.info('Phase 4: Checking for agent auto-assignment opportunities...');
    const autoAssignmentResults = await checkAgentAutoAssignment(stageStatusResults.remainingLeads);

    // PHASE 5: Final duplicate check for remaining leads (in-file duplicates)
    logger.info('Phase 5: Final duplicate check for remaining leads...');
    const duplicateCheckResults = await checkImportDuplicates(autoAssignmentResults.remainingLeads);

    // Log the results of all phases
    logger.info(
      `🎯 PHASE RESULTS: ${enhancementResults.enhancedLeads.length} enhanced, ${enhancementResults.duplicateLeads.length} duplicates from enhancement, ${enhancementResults.failedLeads.length} rejected, ${stageStatusResults.stageAssignedLeads.length} stage/status assigned, ${autoAssignmentResults.autoAssignedLeads.length} auto-assigned, ${duplicateCheckResults.validLeads.length} final valid leads, ${duplicateCheckResults.failedLeads.length} final failures`
    );

    // Initialize result object with enhanced structure
    let result = {
      success: [],
      failed: [],
      enhanced: [],
      autoAssigned: [],
      stageAssigned: [],
      reclamationCreated: [],
      reclamationErrors: []
    };

    // Add enhanced leads to results
    if (enhancementResults.enhancedLeads.length > 0) {
      result.enhanced = enhancementResults.enhancedLeads;
    }

    // Add stage-assigned leads to results
    if (stageStatusResults.stageAssignedLeads.length > 0) {
      result.stageAssigned = stageStatusResults.stageAssignedLeads;
    }

    // Combine all leads that should be created (including duplicates from enhancement phase)
    // CRITICAL: Preserve temporary fields (_previousAgentName, _previousProjectName, _sourceAgentName, _sourceProjectName)
    // when mapping leads from phase results
    const leadsToCreate = [
      ...enhancementResults.duplicateLeads.map(item => {
        // Preserve all fields including temporary ones
        const lead = { ...item.lead };
        // Ensure temporary fields are preserved if they exist in the original lead
        if (item.originalLead) {
          if (item.originalLead._previousAgentName) lead._previousAgentName = item.originalLead._previousAgentName;
          if (item.originalLead._previousProjectName) lead._previousProjectName = item.originalLead._previousProjectName;
          if (item.originalLead._sourceAgentName) lead._sourceAgentName = item.originalLead._sourceAgentName;
          if (item.originalLead._sourceProjectName) lead._sourceProjectName = item.originalLead._sourceProjectName;
        }
        return lead;
      }), // Duplicates from enhancement phase
      ...stageStatusResults.stageAssignedLeads.map(item => {
        const lead = { ...item.lead };
        // Preserve temporary fields if they exist
        return lead;
      }),
      ...autoAssignmentResults.autoAssignedLeads.map(item => {
        const lead = { ...item.lead };
        // Preserve temporary fields if they exist
        return lead;
      }),
      ...duplicateCheckResults.validLeads.map(lead => {
        // Ensure we're working with a copy that preserves all fields
        return { ...lead };
      })
    ];

    // ====================================================================
    // PHASE 6: Lookup and assign Previous/Source Agent and Project IDs
    // ====================================================================
    // CRITICAL: This MUST execute BEFORE database insertion (createLeads)
    // This phase looks up users/teams by name and assigns their IDs
    // ====================================================================
    logger.info(`\n`);
    logger.info(`🔍 ========================================`);
    logger.info(`🔍 PHASE 6: LOOKUP AND ASSIGN PREVIOUS/SOURCE AGENT AND PROJECT IDs`);
    logger.info(`🔍 ========================================`);
    logger.info(`🔍 This phase MUST execute before database insertion`);
    logger.info(`🔍 Total leads to process: ${leadsToCreate.length}`);
    logger.info(`🔍 Starting Phase 6 NOW...`);
    
    // First, check if we have any temporary fields in the leads
    logger.info(`\n🔍 Checking for temporary lookup fields in ${leadsToCreate.length} leads...`);
    const leadsWithTempFields = leadsToCreate.filter(l => 
      l._previousAgentName || l._previousProjectName || l._sourceAgentName || l._sourceProjectName
    );
    logger.info(`📋 Found ${leadsWithTempFields.length} leads with temporary lookup fields out of ${leadsToCreate.length} total leads`);
    
    // Only log details for first 5 leads to avoid performance issues
    if (leadsToCreate.length > 0) {
      logger.info(`\n🔍 SAMPLE CHECK OF FIRST 5 LEADS:`);
      leadsToCreate.slice(0, 5).forEach((lead, idx) => {
        logger.info(`   Lead ${idx + 1} (${lead.contact_name || lead.email_from || 'unknown'}):`);
        logger.info(`      _previousAgentName: "${lead._previousAgentName || 'UNDEFINED'}"`);
        logger.info(`      _previousProjectName: "${lead._previousProjectName || 'UNDEFINED'}"`);
        logger.info(`      _sourceAgentName: "${lead._sourceAgentName || 'UNDEFINED'}"`);
        logger.info(`      _sourceProjectName: "${lead._sourceProjectName || 'UNDEFINED'}"`);
      });
    }
    
    if (leadsWithTempFields.length > 0) {
      // Only log first 5 leads with temp fields
      logger.info(`\n✅ Sample leads WITH temporary fields (first 5 of ${leadsWithTempFields.length}):`);
      leadsWithTempFields.slice(0, 5).forEach((lead, idx) => {
        logger.info(`   Lead ${idx + 1} temp fields: _previousAgentName="${lead._previousAgentName || 'none'}", _previousProjectName="${lead._previousProjectName || 'none'}", _sourceAgentName="${lead._sourceAgentName || 'none'}", _sourceProjectName="${lead._sourceProjectName || 'none'}"`);
      });
    } else {
      logger.warn(`\n⚠️ WARNING: No leads found with temporary lookup fields!`);
      logger.warn(`⚠️ This means the fields were either not extracted or lost during intermediate phases.`);
    }
    
    for (let i = 0; i < leadsToCreate.length; i++) {
      const lead = leadsToCreate[i];
      let prevUserId = null, prevTeamId = null, sourceUserId = null, sourceTeamId = null;
      
      // Log progress every 5000 leads in Phase 6
      if (i > 0 && i % 5000 === 0) {
        logger.info(`📊 Phase 6 Progress: Processing lead ${i} of ${leadsToCreate.length} (${Math.round((i / leadsToCreate.length) * 100)}%)`);
      }
      
      // Log what we're about to lookup for first few leads only
      if (i < 5) {
        logger.info(`\n🔍 Lead ${i + 1} BEFORE LOOKUP:`);
        logger.info(`   _previousAgentName: "${lead._previousAgentName || 'undefined'}"`);
        logger.info(`   _previousProjectName: "${lead._previousProjectName || 'undefined'}"`);
        logger.info(`   _sourceAgentName: "${lead._sourceAgentName || 'undefined'}"`);
        logger.info(`   _sourceProjectName: "${lead._sourceProjectName || 'undefined'}"`);
      }
      
      // Perform lookups if names are stored
      try {
        // Check if we should call the functions
        const shouldLookupPrevAgent = !!lead._previousAgentName;
        const shouldLookupPrevProject = !!lead._previousProjectName;
        const shouldLookupSourceAgent = !!lead._sourceAgentName;
        const shouldLookupSourceProject = !!lead._sourceProjectName;
        
        if (i < 3) {
          logger.info(`   Will lookup: prevAgent=${shouldLookupPrevAgent}, prevProject=${shouldLookupPrevProject}, sourceAgent=${shouldLookupSourceAgent}, sourceProject=${shouldLookupSourceProject}`);
        }
        
        // Only log lookup details for first 5 leads to avoid performance issues
        const shouldLogLookupDetails = i < 5;
        
        // Log the exact values we're about to pass to the functions
        if (shouldLogLookupDetails) {
          if (shouldLookupPrevAgent) {
            logger.info(`🔍 [Lead ${i + 1}] About to call findUserByLogin with value: "${lead._previousAgentName}"`);
          }
          if (shouldLookupPrevProject) {
            logger.info(`🔍 [Lead ${i + 1}] About to call findTeamByName with value: "${lead._previousProjectName}"`);
          }
          if (shouldLookupSourceAgent) {
            logger.info(`🔍 [Lead ${i + 1}] About to call findUserByLogin with value: "${lead._sourceAgentName}"`);
          }
          if (shouldLookupSourceProject) {
            logger.info(`🔍 [Lead ${i + 1}] About to call findTeamByName with value: "${lead._sourceProjectName}"`);
          }
        }
        
        const lookupResults = await Promise.all([
          shouldLookupPrevAgent ? (async () => {
            const loginValue = lead._previousAgentName;
            try {
              const result = await findUserByLogin(loginValue);
              if (shouldLogLookupDetails) logger.info(`🔍 [Lead ${i + 1}] findUserByLogin returned: ${result ? result.toString() : 'null'}`);
              return result;
            } catch (err) {
              logger.error(`🔍 [Lead ${i + 1}] Error in findUserByLogin:`, err);
              return null;
            }
          })().catch(err => { 
            logger.error(`Error finding previous agent "${lead._previousAgentName}":`, err); 
            return null; 
          }) : Promise.resolve(null),
          shouldLookupPrevProject ? (async () => {
            const nameValue = lead._previousProjectName;
            try {
              const result = await findTeamByName(nameValue);
              if (shouldLogLookupDetails) logger.info(`🔍 [Lead ${i + 1}] findTeamByName returned: ${result ? result.toString() : 'null'}`);
              return result;
            } catch (err) {
              logger.error(`🔍 [Lead ${i + 1}] ERROR in findTeamByName:`, err);
              return null;
            }
          })().catch(err => { 
            logger.error(`Error finding previous project "${lead._previousProjectName}":`, err); 
            return null; 
          }) : Promise.resolve(null),
          shouldLookupSourceAgent ? (async () => {
            const loginValue = lead._sourceAgentName;
            try {
              const result = await findUserByLogin(loginValue);
              if (shouldLogLookupDetails) logger.info(`🔍 [Lead ${i + 1}] findUserByLogin returned: ${result ? result.toString() : 'null'}`);
              return result;
            } catch (err) {
              logger.error(`🔍 [Lead ${i + 1}] Error in findUserByLogin:`, err);
              return null;
            }
          })().catch(err => { 
            logger.error(`Error finding source agent "${lead._sourceAgentName}":`, err); 
            return null; 
          }) : Promise.resolve(null),
          shouldLookupSourceProject ? (async () => {
            const nameValue = lead._sourceProjectName;
            try {
              const result = await findTeamByName(nameValue);
              if (shouldLogLookupDetails) logger.info(`🔍 [Lead ${i + 1}] findTeamByName returned: ${result ? result.toString() : 'null'}`);
              return result;
            } catch (err) {
              logger.error(`🔍 [Lead ${i + 1}] ERROR in findTeamByName:`, err);
              return null;
            }
          })().catch(err => { 
            logger.error(`Error finding source project "${lead._sourceProjectName}":`, err); 
            return null; 
          }) : Promise.resolve(null),
        ]);
        
        prevUserId = lookupResults[0];
        prevTeamId = lookupResults[1];
        sourceUserId = lookupResults[2];
        sourceTeamId = lookupResults[3];
        
        if (i < 3) {
          logger.info(`   Lookup results: prevUserId=${prevUserId ? prevUserId.toString() : 'null'}, prevTeamId=${prevTeamId ? prevTeamId.toString() : 'null'}, sourceUserId=${sourceUserId ? sourceUserId.toString() : 'null'}, sourceTeamId=${sourceTeamId ? sourceTeamId.toString() : 'null'}`);
        }
      } catch (error) {
        logger.error(`Error during lookup for lead ${i + 1}:`, error);
      }

      // Store temporary field values for logging before deletion
      const previousAgentName = lead._previousAgentName;
      const previousProjectName = lead._previousProjectName;
      const sourceAgentName = lead._sourceAgentName;
      const sourceProjectName = lead._sourceProjectName;

      // Assign the ObjectIds to lead (explicitly set when value provided or found)
      // CRITICAL: Always set the fields, even if null, so they're not undefined
      if (prevUserId) {
        lead.prev_user_id = prevUserId;
      } else if (previousAgentName) {
        // Name was provided but not found - set to null explicitly
        lead.prev_user_id = null;
      }

      if (prevTeamId) {
        lead.prev_team_id = prevTeamId;
      } else if (previousProjectName) {
        lead.prev_team_id = null;
      }

      if (sourceUserId) {
        lead.source_agent = sourceUserId;
      } else if (sourceAgentName) {
        lead.source_agent = null;
      }

      if (sourceTeamId) {
        lead.source_project = sourceTeamId;
      } else if (sourceProjectName) {
        lead.source_project = null;
      }

      // Log lookup results for first few leads only (before deleting temp fields)
      if (i < 5) {
        logger.info(`\n🔍 Lead ${i + 1} (${lead.contact_name || lead.email_from}) LOOKUP RESULTS:`);
        logger.info(`   Previous Agent: ${previousAgentName ? (prevUserId ? `✅ FOUND (${prevUserId})` : `❌ NOT FOUND`) : '⏭️  SKIPPED (empty)'}`);
        logger.info(`   Previous Project: ${previousProjectName ? (prevTeamId ? `✅ FOUND (${prevTeamId})` : `❌ NOT FOUND`) : '⏭️  SKIPPED (empty)'}`);
        logger.info(`   Source Agent: ${sourceAgentName ? (sourceUserId ? `✅ FOUND (${sourceUserId})` : `❌ NOT FOUND`) : '⏭️  SKIPPED (empty)'}`);
        logger.info(`   Source Project: ${sourceProjectName ? (sourceTeamId ? `✅ FOUND (${sourceTeamId})` : `❌ NOT FOUND`) : '⏭️  SKIPPED (empty)'}`);
      }

      // Remove temporary fields (they start with _)
      delete lead._previousAgentName;
      delete lead._previousProjectName;
      delete lead._sourceAgentName;
      delete lead._sourceProjectName;
    }

    // Summary of field population after lookups
    const leadsWithPrevUserId = leadsToCreate.filter(l => l.prev_user_id).length;
    const leadsWithPrevTeamId = leadsToCreate.filter(l => l.prev_team_id).length;
    const leadsWithSourceUserId = leadsToCreate.filter(l => l.source_agent).length;
    const leadsWithSourceTeamId = leadsToCreate.filter(l => l.source_project).length;
    const leadsWithPrevUserIdNull = leadsToCreate.filter(l => l.prev_user_id === null).length;
    const leadsWithPrevTeamIdNull = leadsToCreate.filter(l => l.prev_team_id === null).length;
    const leadsWithSourceUserIdNull = leadsToCreate.filter(l => l.source_agent === null).length;
    const leadsWithSourceTeamIdNull = leadsToCreate.filter(l => l.source_project === null).length;

    logger.info(`\n📊 FIELD POPULATION SUMMARY (after lookups):`);
    logger.info(`   prev_user_id: ${leadsWithPrevUserId} found, ${leadsWithPrevUserIdNull} not found (null), ${leadsToCreate.length - leadsWithPrevUserId - leadsWithPrevUserIdNull} not set`);
    logger.info(`   prev_team_id: ${leadsWithPrevTeamId} found, ${leadsWithPrevTeamIdNull} not found (null), ${leadsToCreate.length - leadsWithPrevTeamId - leadsWithPrevTeamIdNull} not set`);
    logger.info(`   source_agent: ${leadsWithSourceUserId} found, ${leadsWithSourceUserIdNull} not found (null), ${leadsToCreate.length - leadsWithSourceUserId - leadsWithSourceUserIdNull} not set`);
    logger.info(`   source_project: ${leadsWithSourceTeamId} found, ${leadsWithSourceTeamIdNull} not found (null), ${leadsToCreate.length - leadsWithSourceTeamId - leadsWithSourceTeamIdNull} not set`);

    // Log first few leads to verify fields are present before creation
    if (leadsToCreate.length > 0) {
      logger.info(`\n🔍 VERIFYING FIELDS BEFORE CREATION (first 3 leads):`);
      leadsToCreate.slice(0, 3).forEach((lead, idx) => {
        logger.info(`\n   Lead ${idx + 1} (${lead.contact_name || lead.email_from}):`);
        logger.info(`      prev_user_id: ${lead.prev_user_id ? lead.prev_user_id.toString() : (lead.prev_user_id === null ? 'null' : 'undefined')}`);
        logger.info(`      prev_team_id: ${lead.prev_team_id ? lead.prev_team_id.toString() : (lead.prev_team_id === null ? 'null' : 'undefined')}`);
        logger.info(`      source_agent: ${lead.source_agent ? lead.source_agent.toString() : (lead.source_agent === null ? 'null' : 'undefined')}`);
        logger.info(`      source_project: ${lead.source_project ? lead.source_project.toString() : (lead.source_project === null ? 'null' : 'undefined')}`);
      });
    }

    // CRITICAL: Phase 6 must complete before this point
    logger.info(`\n✅ Phase 6 completed. Proceeding to database insertion...`);
    logger.info(`📊 Final lead count before insertion: ${leadsToCreate.length}`);
    
    // Only call createLeads if we have valid leads
    if (leadsToCreate.length > 0) {
      try {
        logger.info(`\n💾 Starting database insertion with createLeads()...`);
        const createResult = await createLeads(leadsToCreate, user);

        // Map the createLeads result structure to expected format
        result.success = createResult.created || [];
        result.failed = [...(result.failed || []), ...(createResult.failed || [])];

        // Track which leads were auto-assigned
        result.autoAssigned = autoAssignmentResults.autoAssignedLeads;

        // Track which leads were stage-assigned
        result.stageAssigned = stageStatusResults.stageAssignedLeads;

        // PHASE 5: Create assignment records for auto-assigned leads
        if (autoAssignmentResults.autoAssignedLeads.length > 0) {
          await createAssignmentRecords(result.success, autoAssignmentResults.autoAssignedLeads, user);
        }

        // PHASE 6: Create reclamation records for leads with Reklamation stage
        const reclamationResults = await createReclamationRecordsForReklamationLeads(
          result.success,
          stageStatusResults.stageAssignedLeads,
          autoAssignmentResults.autoAssignedLeads,
          user
        );

        // Add reclamation results to the response
        result.reclamationCreated = reclamationResults.createdReclamations;
        result.reclamationErrors = reclamationResults.errors;
      } catch (error) {
        logger.error('Error creating leads after duplicate check', { error });
        // Ensure result has the expected structure
        result = {
          success: [],
          failed: [],
          enhanced: [],
          autoAssigned: [],
          stageAssigned: [],
          reclamationCreated: [],
          reclamationErrors: []
        };
      }
    } else {
      // Even if no new leads are created, we still need to ensure the result structure exists
      // and check if any enhanced leads need reclamation creation
      // This handles the case where all leads were enhanced but some might have reclamation stage
      result.autoAssigned = autoAssignmentResults.autoAssignedLeads;
      result.stageAssigned = stageStatusResults.stageAssignedLeads;

      // Since we have no created leads, we cannot create reclamations for them
      // Enhanced leads are already in the database and their reclamation would be handled separately
      result.reclamationCreated = [];
      result.reclamationErrors = [];
    }

    // Add failures from enhancement phase
    if (enhancementResults.failedLeads.length > 0) {
      // Ensure result.failed exists
      result.failed = result.failed || [];

      enhancementResults.failedLeads.forEach((failedLead) => {
        result.failed.push({
          data: failedLead,
          error: failedLead.error || 'Enhancement phase failure',
        });
      });
    }

    // Add duplicate failures to the failed results
    if (duplicateCheckResults.failedLeads.length > 0) {
      // Ensure result.failed exists
      result.failed = result.failed || [];

      duplicateCheckResults.failedLeads.forEach((failedLead) => {
        result.failed.push({
          data: failedLead,
          error: failedLead.error || 'Duplicate lead',
        });
      });
    }

    // Combine pre-validation failures with creation failures and duplicate failures
    const allFailedRows = [...invalidRows];

    // Make sure result has the expected structure
    if (!result) {
      result = {
        success: [],
        failed: [],
        enhanced: [],
        autoAssigned: [],
        stageAssigned: [],
        reclamationCreated: [],
        reclamationErrors: []
      };
    }

    // Add any failures from the lead creation process
    if (result.failed && result.failed.length > 0) {
      allFailedRows.push(...result.failed);
    }

    // If we have no successful imports but we had valid leads before duplicate checking,
    // make sure we include a helpful message
    if ((!result.success || result.success.length === 0) && leadsData.length > 0) {
      logger.info(`All ${leadsData.length} leads were duplicates or failed validation`);
    }

    // If there are any failed leads, create an Excel file with the failed rows
    if (allFailedRows.length > 0) {
      // Process failed rows to ensure consistent structure
      const failedRows = allFailedRows.map((fail) => {
        // Start with a clean object
        const cleanRow = {};

        // Extract the original data
        const originalData = fail.data || {};

        // Define the columns we want to include in a specific order
        const columnOrder = [
          'Contact Name',
          'Email',
          'Phone',
          'Partner ID',
          'Lead Date',
          'Expected Revenue',
          'Source',
          'Error', // Add error as the last column
        ];

        // Map the data to our clean structure with consistent column names
        cleanRow['Contact Name'] = originalData.contact_name || originalData['Contact Name'] || '';
        cleanRow['Email'] = originalData.email_from || originalData['Email'] || '';
        cleanRow['Phone'] =
          originalData.phone || originalData['Phone'] || originalData['Phone Number'] || '';
        cleanRow['Partner ID'] =
          originalData.lead_source_no ||
          originalData['Partner ID'] ||
          originalData['Lead Source Number'] ||
          '';
        cleanRow['Lead Date'] = originalData.lead_date
          ? originalData.lead_date instanceof Date
            ? originalData.lead_date.toISOString().split('T')[0]
            : originalData.lead_date
          : originalData['Lead Date'] || '';
        cleanRow['Expected Revenue'] =
          originalData.expected_revenue || originalData['Expected Revenue'] || 0;
        cleanRow['Source'] =
          originalData.source_id || originalData['Source'] || originalData['Source ID'] || '';

        // Add the error message
        cleanRow['Error'] = fail.error || 'Unknown error';

        return cleanRow;
      });

      // Create a new workbook for failed rows
      const failedWorkbook = xlsx.utils.book_new();

      // Define the column order we want in the Excel file
      const columnOrder = [
        'Contact Name',
        'Email',
        'Phone',
        'Partner ID',
        'Lead Date',
        'Expected Revenue',
        'Source',
        'Error',
      ];

      // Create the worksheet with our clean data and specified column order
      const failedWorksheet = xlsx.utils.json_to_sheet(failedRows, {
        header: columnOrder,
      });

      // Set column widths for better readability
      const wscols = [
        { wch: 25 }, // Contact Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Partner ID
        { wch: 12 }, // Lead Date
        { wch: 15 }, // Expected Revenue
        { wch: 20 }, // Source
        { wch: 50 }, // Error - wider for detailed error messages
      ];
      failedWorksheet['!cols'] = wscols;

      // Add the worksheet to the workbook
      xlsx.utils.book_append_sheet(failedWorkbook, failedWorksheet, 'Failed Leads');

      // Create a checksum-based filename to avoid duplication of identical error files
      const failedRowsString = JSON.stringify(failedRows);
      const checksum = crypto.createHash('md5').update(failedRowsString).digest('hex');
      const failedFilename = `failed-leads-${checksum}.xlsx`;

      // FIXED: Use cloud storage upload for error files instead of local filesystem
      try {
        // Create temporary buffer from workbook
        const workbookBuffer = xlsx.write(failedWorkbook, { type: 'buffer', bookType: 'xlsx' });

        // Upload error file using hybrid storage (local + cloud)
        const errorUploadResult = await storageConfig.uploadFile(
          workbookBuffer,
          failedFilename,
          'documents',
          {
            originalFilename: failedFilename,
            uploader: user._id || user.id,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            source: 'lead_import_errors',
            uploadedAt: new Date().toISOString()
          }
        );

        if (!errorUploadResult.success) {
          throw new Error(`Error file upload failed: ${errorUploadResult.errors?.join(', ') || 'Unknown error'}`);
        }

        logger.info(`✅ Failed leads file uploaded successfully`, {
          filename: failedFilename,
          size: workbookBuffer.length,
          cloudSuccess: errorUploadResult.storage?.cloud || false,
          localSuccess: errorUploadResult.storage?.local || false,
          webPath: errorUploadResult.webPath,
          storage: errorUploadResult.storage?.cloud ? 'CLOUD' : 'LOCAL'
        });

        // Add the download link to the result and update import record
        result.downloadLink = `/leads/download/${failedFilename}`;

        // Update import record with error file information
        if (importRecord) {
          const failedFilePath = storageConfig.getFilePath(failedFilename, 'documents');
          importRecord.error_file_path = failedFilePath;
          importRecord.error_filename = failedFilename;
        }
      } catch (errorUploadError) {
        logger.error('❌ Failed to upload error file to storage', {
          filename: failedFilename,
          error: errorUploadError.message,
          cloudEnabled: storageConfig.isCloudEnabled()
        });
        // Continue without error file if upload fails
        logger.warn('⚠️ Continuing import without error file due to upload failure');
      }
    }

    // Update import record with final results and revert tracking data
    if (importRecord) {
      const processingTime = Date.now() - startTime;

      // Build revert tracking data
      const revertData = {
        created_lead_ids: (result.success || []).map(lead => lead._id),
        created_assignment_ids: [],
        created_transaction_ids: (result.success || []).map(lead => lead.transaction_id).filter(Boolean),
        created_reclamation_ids: (result.reclamationCreated || []).map(rec => rec.reclamationId),
        created_activity_ids: [], // Activity IDs are not easily tracked, but they can be found by timestamp and creator
        assigned_voip_extensions: (result.success || [])
          .filter(lead => lead.voip_extension)
          .map(lead => ({
            extension: lead.voip_extension,
            lead_id: lead._id
          })),
        freepbx_records: [], // Will be populated if FreePBX integration is enabled
        source_updates: [],
        enhanced_leads: (result.enhanced || []).map(enhanced => ({
          lead_id: enhanced.existingLeadId,
          original_values: {}, // Original values would need to be captured during enhancement
          updated_fields: enhanced.enhancedFields
        })),
        created_stages: [], // Track newly created stages during import
        created_statuses: [] // Track newly created statuses during import
      };

      // Add assignment IDs from auto-assigned leads
      if (result.autoAssigned && result.autoAssigned.length > 0) {
        for (const autoAssignment of result.autoAssigned) {
          const leadId = (result.success || []).find(lead =>
            lead.contact_name === autoAssignment.lead.contact_name &&
            lead.email_from === autoAssignment.lead.email_from &&
            lead.phone === autoAssignment.lead.phone
          )?._id;

          if (leadId) {
            const assignment = await AssignLeads.findOne({
              lead_id: leadId,
              project_id: autoAssignment.projectId,
              agent_id: autoAssignment.agentId,
              status: 'active'
            });

            if (assignment) {
              revertData.created_assignment_ids.push(assignment._id);
            }
          }
        }
      }

      // Add source update tracking
      if (result.success && result.success.length > 0) {
        const sourceCountMap = {};
        result.success.forEach(lead => {
          if (lead.source_id) {
            const sourceId = lead.source_id.toString();
            sourceCountMap[sourceId] = (sourceCountMap[sourceId] || 0) + 1;
          }
        });

        revertData.source_updates = Object.entries(sourceCountMap).map(([sourceId, count]) => ({
          source_id: sourceId,
          lead_count_increment: count
        }));
      }

      importRecord.success_count = result.success.length;
      importRecord.failure_count = allFailedRows.length;
      importRecord.status = 'completed';
      importRecord.processing_time_ms = processingTime;
      importRecord.completed_at = new Date();
      importRecord.duplicate_status_summary = {
        new: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 0).length,
        oldDuplicate: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 1)
          .length,
        duplicate: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 2)
          .length,
      };
      // Add new enhancement and auto-assignment tracking
      importRecord.enhanced_count = result.enhanced.length;
      importRecord.duplicates_from_enhancement_count = enhancementResults.duplicateLeads.length;
      importRecord.auto_assigned_count = result.autoAssigned.length;
      importRecord.stage_assigned_count = result.stageAssigned.length;
      importRecord.reclamation_created_count = result.reclamationCreated.length;
      importRecord.reclamation_errors_count = result.reclamationErrors.length;

      // Save revert tracking data
      importRecord.revert_data = revertData;

      await importRecord.save();
      logger.info(`Updated import record ${importRecord._id} with final results and revert data: ${result.success.length} created, ${result.enhanced.length} enhanced, ${enhancementResults.duplicateLeads.length} duplicates from enhancement, ${result.autoAssigned.length} auto-assigned, ${result.reclamationCreated.length} reclamations created`);
    }

    // Clean up the temporary uploaded file if it exists
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.debug(`Successfully deleted temporary uploaded file: ${file.path}`);
      } catch (err) {
        logger.error('Error deleting temporary uploaded Excel file', { error: err });
      }
    }

    // FreePBX reload is now handled automatically by the batch creation method in createLeads
    // No need for manual reload here

    // Return the result with summary and import record ID
    return {
      message: `Import completed. ${result.success.length} leads created successfully, ${result.enhanced.length} leads enhanced, ${enhancementResults.duplicateLeads.length} duplicates detected in enhancement, ${result.stageAssigned.length} leads stage-assigned, ${result.autoAssigned.length} leads auto-assigned, ${result.reclamationCreated.length} reclamations created, ${allFailedRows.length} leads failed.`,
      successCount: result.success.length,
      enhancedCount: result.enhanced.length,
      duplicateFromEnhancementCount: enhancementResults.duplicateLeads.length,
      stageAssignedCount: result.stageAssigned.length,
      autoAssignedCount: result.autoAssigned.length,
      reclamationCreatedCount: result.reclamationCreated.length,
      reclamationErrorsCount: result.reclamationErrors.length,
      failureCount: allFailedRows.length,
      downloadLink: result.downloadLink || null,
      importId: importRecord ? importRecord._id : null,
      enhancedLeads: result.enhanced,
      duplicateLeadsFromEnhancement: enhancementResults.duplicateLeads,
      stageAssignedLeads: result.stageAssigned,
      autoAssignedLeads: result.autoAssigned,
      reclamationCreated: result.reclamationCreated,
      reclamationErrors: result.reclamationErrors,
      duplicateStatusSummary: {
        new: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 0).length,
        oldDuplicate: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 1).length +
          enhancementResults.duplicateLeads.filter(item => item.duplicateStatus === 1).length,
        duplicate: (result.success || []).filter((lead) => (lead.duplicate_status || 0) === 2).length +
          enhancementResults.duplicateLeads.filter(item => item.duplicateStatus === 2).length,
      },
    };
  } catch (error) {
    logger.error('Error importing leads from Excel', { error });

    // Create error file with the exception details if we have rows to process
    let downloadLink = null;
    if (rows && rows.length > 0) {
      try {
        // Create a failed file with all rows marked as failed due to the exception
        const failedRows = rows.map((row, index) => {
          const cleanRow = {};

          // Map the original row data
          cleanRow['Contact Name'] = row['Contact Name'] || row['Name'] || '';
          cleanRow['Email'] = row['Email'] || '';
          cleanRow['Phone'] = row['Phone'] || row['Phone Number'] || '';
          cleanRow['Partner ID'] = row['Partner ID'] || row['Lead Source Number'] || '';
          cleanRow['Lead Date'] = row['Lead Date'] || '';
          cleanRow['Expected Revenue'] = row['Expected Revenue'] || '';
          cleanRow['Source'] = row['Source'] || row['Source ID'] || '';
          cleanRow['Error'] = `Import failed: ${error.message}`;

          return cleanRow;
        });

        // Create the error workbook
        const failedWorkbook = xlsx.utils.book_new();
        const columnOrder = [
          'Contact Name',
          'Email',
          'Phone',
          'Partner ID',
          'Lead Date',
          'Expected Revenue',
          'Source',
          'Error'
        ];

        const failedWorksheet = xlsx.utils.json_to_sheet(failedRows, {
          header: columnOrder,
        });

        // Set column widths
        const wscols = [
          { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
          { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 50 }
        ];
        failedWorksheet['!cols'] = wscols;

        xlsx.utils.book_append_sheet(failedWorkbook, failedWorksheet, 'Failed Leads');

        // Create filename
        const failedRowsString = JSON.stringify(failedRows);
        const checksum = crypto.createHash('md5').update(failedRowsString).digest('hex');
        const failedFilename = `failed-leads-${checksum}.xlsx`;

        // Upload error file to cloud storage
        const workbookBuffer = xlsx.write(failedWorkbook, { type: 'buffer', bookType: 'xlsx' });

        const errorUploadResult = await storageConfig.uploadFile(
          workbookBuffer,
          failedFilename,
          'documents',
          {
            originalFilename: failedFilename,
            uploader: user._id || user.id,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            source: 'lead_import_errors',
            uploadedAt: new Date().toISOString()
          }
        );

        if (errorUploadResult.success) {
          downloadLink = `/leads/download/${failedFilename}`;

          if (importRecord) {
            const failedFilePath = storageConfig.getFilePath(failedFilename, 'documents');
            importRecord.error_file_path = failedFilePath;
            importRecord.error_filename = failedFilename;
          }

          logger.info(`✅ Exception error file uploaded successfully: ${failedFilename}`);
        }
      } catch (fileError) {
        logger.error('❌ Failed to create error file during exception handling:', fileError);
      }
    }

    if (importRecord) {
      importRecord.status = 'failed';
      importRecord.error_message = error.message;
      importRecord.failure_count = rows ? rows.length : 0;
      await importRecord.save();
    }

    // Include download link in the error if available
    const enhancedError = new Error(error.message);
    enhancedError.downloadLink = downloadLink;
    enhancedError.importId = importRecord ? importRecord._id : null;
    throw enhancedError;
  }
};

/**
 * Get import history for a user (paginated)
 * @param {Object} user - User object
 * @param {Object} query - Query parameters (page, limit, status)
 * @returns {Object} - Paginated import history
 */
const getImportHistory = async (user, query = {}) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter based on user role
    const filter = {};

    // Debug logging
    logger.info(`📋 getImportHistory called`, { 
      userRole: user.role, 
      userId: user._id || user.id,
      isAdmin: user.role === 'Admin'
    });

    // If not admin, only show user's own imports
    if (user.role !== 'Admin') {
      filter.user_id = user._id || user.id;
      logger.info(`📋 Filtering imports for non-admin user`, { filter });
    } else {
      logger.info(`📋 Admin user - showing ALL imports`);
    }

    // Add status filter if provided
    if (query.status && ['processing', 'completed', 'failed'].includes(query.status)) {
      filter.status = query.status;
    }

    // Add date range filter if provided
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) {
        filter.createdAt.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        filter.createdAt.$lte = new Date(query.dateTo);
      }
    }

    // Get total count for pagination
    const total = await ImportHistory.countDocuments(filter);

    // Get paginated results
    const imports = await ImportHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform results using the model's toResponse method
    const transformedImports = imports.map((importDoc) => {
      const importInstance = new ImportHistory(importDoc);
      return importInstance.toResponse();
    });

    return {
      imports: transformedImports,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching import history', { error });
    throw error;
  }
};

/**
 * Check if MongoDB supports transactions by actually trying to start one
 * @returns {Promise<boolean>} - True if transactions are supported
 */
const supportsTransactions = async () => {
  let testSession = null;
  try {
    // Try to start a session - this might fail on standalone MongoDB
    testSession = await mongoose.startSession();
    
    // Try to start a transaction - this will definitely fail on standalone
    await testSession.startTransaction();
    
    // If we get here, transactions work - abort the test transaction
    await testSession.abortTransaction();
    await testSession.endSession();
    logger.info('✅ MongoDB transaction support: Enabled (replica set or sharded cluster)');
    return true;
  } catch (error) {
    // Clean up session if it was created
    if (testSession) {
      try { await testSession.endSession(); } catch (_) {}
    }
    
    // Check if error is about replica set/standalone MongoDB
    const isStandaloneError = error.message && (
      error.message.includes('replica set') || 
      error.message.includes('mongos') ||
      error.message.includes('Transaction numbers')
    );
    
    if (isStandaloneError) {
      logger.warn('⚠️ Transactions not supported (standalone MongoDB). Continuing without them.');
    } else {
      logger.warn('⚠️ Could not verify transaction support, assuming standalone MongoDB:', error.message);
    }
    return false;
  }
};

/**
 * Revert a lead import - Undoes all operations performed during the import
 * @param {string} importId - Import ID to revert
 * @param {Object} user - User performing the revert
 * @param {string} reason - Reason for revert
 * @returns {Object} - Revert results
 */
const revertLeadImport = async (importId, user, reason = '') => {
  const startTime = Date.now();
  logger.info(`🔄 Starting revert process for import ${importId} by user ${user.email}`);

  try {
    // Get import record with revert data
    const importRecord = await ImportHistory.findById(importId);
    if (!importRecord) {
      throw new Error('Import record not found');
    }

    // Check if revert is allowed
    const revertCheck = importRecord.canRevert();
    if (!revertCheck.canRevert) {
      throw new Error(revertCheck.reason);
    }

    // Additional safety check: Verify no leads have been modified post-import
    // Pass user info to allow admin bypass in certain cases
    const safetyCheck = await checkLeadSafetyForRevert(importRecord, user);
    if (!safetyCheck || !safetyCheck.safe) {
      throw new Error(safetyCheck?.reason || 'Safety check failed');
    }

    const revertResults = {
      leads_deleted: 0,
      assignments_deleted: 0,
      transactions_deleted: 0,
      reclamations_deleted: 0,
      activities_deleted: 0,
      voip_extensions_freed: 0,
      freepbx_records_deleted: 0,
      source_counts_reverted: 0,
      enhanced_leads_reverted: 0,
      errors: []
    };

    const revertData = importRecord.revert_data;
    if (!revertData) {
      throw new Error('No revert data found for this import');
    }

    // PHASE 1: Delete FreePBX Records (do this first to free up extensions)
    // Use batch deletion with single transaction for efficiency
    if (revertData.created_lead_ids && revertData.created_lead_ids.length > 0) {
      logger.info(`🔄 Batch deleting FreePBX records for ${revertData.created_lead_ids.length} leads...`);
      
      try {
        // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
        const leadIdStrings = revertData.created_lead_ids.map(id => {
          const normalizedId = id?.$oid || id?._id || id;
          return normalizedId.toString();
        });
        
        // Batch delete all FreePBX entries in a single transaction
        const deleteResults = await freepbxService.batchDeleteLeadExtensionsByLeadIds(leadIdStrings);
        
        revertResults.freepbx_records_deleted = deleteResults.deleted;
        
        if (deleteResults.deleted > 0) {
          logger.info(`✅ Successfully deleted ${deleteResults.deleted} FreePBX entries in batch`);
        }
        
        if (deleteResults.errors && deleteResults.errors.length > 0) {
          deleteResults.errors.forEach(error => {
            revertResults.errors.push(`FreePBX deletion error: ${error}`);
          });
        }
      } catch (error) {
        logger.error(`❌ Failed to batch delete FreePBX entries:`, error);
        revertResults.errors.push(`Failed to batch delete FreePBX entries: ${error.message}`);
      }
    }

    // PHASE 2: Delete Reclamations
    if (revertData.created_reclamation_ids && revertData.created_reclamation_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_reclamation_ids.length} reclamation records...`);

      try {
        // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
        const reclamationIds = revertData.created_reclamation_ids.map(id => 
          id?.$oid || id?._id || id
        );
        const reclamationResult = await Reclamation.deleteMany({
          _id: { $in: reclamationIds }
        });
        revertResults.reclamations_deleted = reclamationResult.deletedCount;
        logger.info(`✅ Deleted ${reclamationResult.deletedCount} reclamation records`);
      } catch (error) {
        logger.error(`❌ Failed to delete reclamations:`, error);
        revertResults.errors.push(`Failed to delete reclamations: ${error.message}`);
      }
    }

    // PHASE 3: Delete Assignment Records  
    if (revertData.created_assignment_ids && revertData.created_assignment_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_assignment_ids.length} assignment records...`);

      try {
        // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
        const assignmentIds = revertData.created_assignment_ids.map(id => 
          id?.$oid || id?._id || id
        );
        const assignmentResult = await AssignLeads.deleteMany({
          _id: { $in: assignmentIds }
        });
        revertResults.assignments_deleted = assignmentResult.deletedCount;
        logger.info(`✅ Deleted ${assignmentResult.deletedCount} assignment records`);
      } catch (error) {
        logger.error(`❌ Failed to delete assignments:`, error);
        revertResults.errors.push(`Failed to delete assignments: ${error.message}`);
      }
    }

    // PHASE 4: Delete Transaction Records
    if (revertData.created_transaction_ids && revertData.created_transaction_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_transaction_ids.length} transaction records...`);

      try {
        // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
        const transactionIds = revertData.created_transaction_ids.map(id => 
          id?.$oid || id?._id || id
        );
        const transactionResult = await Transaction.deleteMany({
          _id: { $in: transactionIds }
        });
        revertResults.transactions_deleted = transactionResult.deletedCount;
        logger.info(`✅ Deleted ${transactionResult.deletedCount} transaction records`);
      } catch (error) {
        logger.error(`❌ Failed to delete transactions:`, error);
        revertResults.errors.push(`Failed to delete transactions: ${error.message}`);
      }
    }

    // PHASE 5: Revert Enhanced Leads
    if (revertData.enhanced_leads && revertData.enhanced_leads.length > 0) {
      logger.info(`🔄 Reverting ${revertData.enhanced_leads.length} enhanced leads...`);

      for (const enhancedLead of revertData.enhanced_leads) {
        try {
          // Revert enhanced fields by unsetting them (since original values weren't stored)
          const unsetFields = {};
          enhancedLead.updated_fields.forEach(field => {
            unsetFields[field] = '';
          });

          const leadId = enhancedLead.lead_id?.$oid || enhancedLead.lead_id?._id || enhancedLead.lead_id;
          await Lead.findByIdAndUpdate(leadId, {
            $unset: unsetFields
          });

          revertResults.enhanced_leads_reverted++;
          logger.info(`✅ Reverted enhanced lead ${enhancedLead.lead_id}`);
        } catch (error) {
          logger.error(`❌ Failed to revert enhanced lead ${enhancedLead.lead_id}:`, error);
          revertResults.errors.push(`Failed to revert enhanced lead ${enhancedLead.lead_id}: ${error.message}`);
        }
      }
    }

    // PHASE 6: Delete Activity Records (Optional - keep for audit trail)
    // Activities are generally kept for audit purposes, but can be deleted if needed
    if (revertData.created_activity_ids && revertData.created_activity_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_activity_ids.length} activity records...`);

      try {
        // Normalize lead IDs and handle incomplete imports
        const leadIds = revertData.created_lead_ids.map(id => id?.$oid || id?._id || id);
        const activityQuery = {
          creator: user._id,
          subject_id: { $in: leadIds }
        };
        
        // Only add time range if completed_at exists
        if (importRecord.completed_at) {
          activityQuery.createdAt = {
            $gte: new Date(importRecord.createdAt.getTime() - 60000), // 1 minute before import
            $lte: new Date(importRecord.completed_at.getTime() + 60000) // 1 minute after import
          };
        } else {
          // For incomplete imports, use a wider time range from creation
          activityQuery.createdAt = {
            $gte: new Date(importRecord.createdAt.getTime() - 60000),
            $lte: new Date(importRecord.createdAt.getTime() + 3600000) // Up to 1 hour after import started
          };
        }
        
        const activityResult = await Activity.deleteMany(activityQuery);
        revertResults.activities_deleted = activityResult.deletedCount;
        logger.info(`✅ Deleted ${activityResult.deletedCount} activity records`);
      } catch (error) {
        logger.error(`❌ Failed to delete activities:`, error);
        revertResults.errors.push(`Failed to delete activities: ${error.message}`);
      }
    }

    // PHASE 7: Revert Source Statistics
    if (revertData.source_updates && revertData.source_updates.length > 0) {
      logger.info(`🔄 Reverting source statistics for ${revertData.source_updates.length} sources...`);

      for (const sourceUpdate of revertData.source_updates) {
        try {
        const sourceId = sourceUpdate.source_id?.$oid || sourceUpdate.source_id?._id || sourceUpdate.source_id;
        await Source.findByIdAndUpdate(sourceId, {
          $inc: { lead_count: -sourceUpdate.lead_count_increment }
        });
          revertResults.source_counts_reverted++;
          logger.info(`✅ Reverted source count for ${sourceUpdate.source_id} (-${sourceUpdate.lead_count_increment})`);
        } catch (error) {
          logger.error(`❌ Failed to revert source count for ${sourceUpdate.source_id}:`, error);
          revertResults.errors.push(`Failed to revert source count for ${sourceUpdate.source_id}: ${error.message}`);
        }
      }
    }

    // PHASE 8: Delete Lead Records (do this last)
    if (revertData.created_lead_ids && revertData.created_lead_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_lead_ids.length} lead records...`);

      try {
        // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
        const leadIds = revertData.created_lead_ids.map(id => 
          id?.$oid || id?._id || id
        );
        const leadResult = await Lead.deleteMany({
          _id: { $in: leadIds }
        });
        revertResults.leads_deleted = leadResult.deletedCount;
        logger.info(`✅ Deleted ${leadResult.deletedCount} lead records`);
      } catch (error) {
        logger.error(`❌ Failed to delete leads:`, error);
        revertResults.errors.push(`Failed to delete leads: ${error.message}`);
      }
    }

    // PHASE 9: Free up VOIP Extensions
    if (revertData.assigned_voip_extensions && revertData.assigned_voip_extensions.length > 0) {
      logger.info(`🔄 Freeing up ${revertData.assigned_voip_extensions.length} VOIP extensions...`);

      // Extensions are automatically freed when leads are deleted, so just count them
      revertResults.voip_extensions_freed = revertData.assigned_voip_extensions.length;
      logger.info(`✅ Freed up ${revertResults.voip_extensions_freed} VOIP extensions`);
    }

    // Update import record with revert information
    importRecord.is_reverted = true;
    importRecord.reverted_at = new Date();
    importRecord.reverted_by = user._id;
    importRecord.revert_reason = reason;
    importRecord.revert_summary = revertResults;

    await importRecord.save();

    const totalTime = Date.now() - startTime;
    logger.info(`🎉 Revert completed in ${totalTime}ms for import ${importId}:`, revertResults);

    // Emit event for activity logging
    eventEmitter.emit(EVENT_TYPES.LEAD.BULK_DELETED, {
      importId: importId,
      revertResults: revertResults,
      user: user,
      reason: reason
    });

    return {
      success: true,
      message: `Import ${importId} has been successfully reverted`,
      importId: importId,
      revert_summary: revertResults,
      processing_time_ms: totalTime
    };

  } catch (error) {
    logger.error(`❌ Error reverting import ${importId}:`, error);
    throw error;
  }
};

/**
 * Check if leads from an import are safe to revert (haven't been modified post-import)
 * @param {Object} importRecord - Import record
 * @returns {Object} - Safety check result
 */
const checkLeadSafetyForRevert = async (importRecord, user = null) => {
  try {
    if (!importRecord.revert_data || !importRecord.revert_data.created_lead_ids) {
      return { safe: true };
    }

    // Normalize IDs - handle both ObjectId and {$oid: "..."} formats
    const leadIds = importRecord.revert_data.created_lead_ids.map(id => 
      id?.$oid || id?._id || id
    );

    // Admins can always revert regardless of lead modifications
    const isAdmin = user && user.role === 'Admin';

    // Only check modifications for non-admin users
    if (!isAdmin && importRecord.completed_at) {
      // Check if any leads have been modified after the import completed
      const modifiedLeads = await Lead.find({
        _id: { $in: leadIds },
        updatedAt: { $gt: importRecord.completed_at }
      }).select('_id contact_name').limit(5);

      if (modifiedLeads.length > 0) {
        const leadNames = modifiedLeads.map(lead => lead.contact_name || `Lead #${lead._id}`).join(', ');
        return {
          safe: false,
          reason: `Cannot revert: ${modifiedLeads.length} leads have been modified after import. Examples: ${leadNames}`
        };
      }
    } else if (isAdmin && importRecord.completed_at) {
      // For admins, just log if there are modifications but don't block
      const modifiedLeads = await Lead.find({
        _id: { $in: leadIds },
        updatedAt: { $gt: importRecord.completed_at }
      }).select('_id contact_name').limit(5);

      if (modifiedLeads.length > 0) {
        logger.warn(`Admin ${user.email} reverting import with ${modifiedLeads.length} modified leads. Admin override enabled.`, {
          importId: importRecord._id,
          modifiedLeadsCount: modifiedLeads.length
        });
      }
    }

    // Check if any leads have offers (only block if there are offers - this is critical)
    const leadsWithOffers = await Offer.find({
      lead_id: { $in: leadIds }
    }).select('lead_id').limit(5);

    if (leadsWithOffers.length > 0) {
      return {
        safe: false,
        reason: `Cannot revert: ${leadsWithOffers.length} leads have offers created. These leads are actively being worked on.`
      };
    }

    // All checks passed - safe to revert
    return { safe: true };

  } catch (error) {
    logger.error('Error checking lead safety for revert:', error);
    return {
      safe: false,
      reason: `Safety check failed: ${error.message}`
    };
  }
};

/**
 * Optimized lead import function for large bulk imports
 * Uses pre-loaded reference data, batch operations, and progress tracking
 * Designed to handle 100,000+ leads efficiently
 * 
 * @param {Object} file - Uploaded file object
 * @param {Object} user - User performing the import
 * @param {string} source_id - Source ID for leads
 * @param {number} lead_price - Lead price
 * @param {string} importId - Import history record ID
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Import results
 */
const importLeadsFromExcelOptimized = async (file, user, source_id, lead_price = 0, importId, progressCallback) => {
  const startTime = Date.now();
  const isBulkMode = true; // This function is always for bulk imports
  
  try {
    logger.info(`🚀 Starting OPTIMIZED import for ${file.originalname}`);
    
    // PHASE 1: Pre-load all reference data
    const referenceData = await preloadReferenceData(progressCallback);
    
    // PHASE 2: Read and parse Excel file
    if (progressCallback) {
      progressCallback({
        phase: 'validating',
        description: 'Reading Excel file...',
        percentage: 5
      });
    }
    
    // Use centralized storage configuration
    const importsDir = storageConfig.getPath('imports');
    
    // Generate checksum-based filename
    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `import-${checksum}${fileExtension}`;
    
    // Upload file
    const uploadResult = await storageConfig.uploadFile(
      fileBuffer,
      storedFilename,
      'imports',
      {
        originalFilename: file.originalname,
        uploader: user._id || user.id,
        contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        source: 'lead_excel_import',
        uploadedAt: new Date().toISOString()
      }
    );
    
    if (!uploadResult.success) {
      throw new Error(`File upload failed: ${uploadResult.errors?.join(', ') || 'Unknown error'}`);
    }
    
    const storedFilePath = storageConfig.getFilePath(storedFilename, 'imports');
    
    // Read the Excel file
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);
    
    if (rows.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    logger.info(`📊 Parsed ${rows.length} rows from Excel file`);
    
    // Update import record with row count
    await ImportHistory.findByIdAndUpdate(importId, {
      total_rows: rows.length,
      stored_filename: storedFilename,
      original_file_path: storedFilePath
    });
    
    if (progressCallback) {
      progressCallback({
        phase: 'validating',
        description: `Validating ${rows.length} rows...`,
        percentage: 10,
        processedCount: 0
      });
    }
    
    // PHASE 3: Parse and validate rows (same logic as original, but optimized)
    const leadsData = [];
    const invalidRows = [];
    
    // Helper functions
    const safeToString = (value) => {
      if (value === null || value === undefined || value === '') return '';
      return value.toString().trim();
    };
    
    const parseRevenue = (value) => {
      if (!value) return 0;
      let strValue = value.toString().toLowerCase().trim();
      if (!isNaN(parseFloat(strValue)) && isFinite(strValue)) return parseFloat(strValue);
      strValue = strValue.replace(/[$€£¥₹,\s]/g, '');
      let multiplier = 1;
      let numericPart = strValue;
      if (strValue.includes('k')) { multiplier = 1000; numericPart = strValue.replace('k', ''); }
      else if (strValue.includes('m')) { multiplier = 1000000; numericPart = strValue.replace('m', ''); }
      const parsed = parseFloat(numericPart);
      return isNaN(parsed) ? 0 : parsed * multiplier;
    };
    
    // Process rows
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      
      // Log progress every 10000 rows
      if (index > 0 && index % 10000 === 0) {
        logger.info(`📊 Validated ${index}/${rows.length} rows...`);
        if (progressCallback) {
          progressCallback({
            phase: 'validating',
            description: `Validating rows ${index}/${rows.length}...`,
            percentage: 10 + (index / rows.length) * 10,
            processedCount: index
          });
        }
      }
      
      // Sanitize column names
      const sanitizedRow = {};
      Object.keys(row).forEach(key => {
        sanitizedRow[key.trim()] = row[key];
      });
      
      const leadData = {
        contact_name: safeToString(sanitizedRow['Contact Name'] || sanitizedRow['Name'] || sanitizedRow['contact_name']),
        email_from: safeToString(sanitizedRow['Email'] || sanitizedRow['email_from']),
        phone: safeToString(sanitizedRow['Phone'] || sanitizedRow['Phone Number'] || sanitizedRow['phone']),
        expected_revenue: parseRevenue(sanitizedRow['Expected Revenue'] || sanitizedRow['expected_revenue']),
        lead_date: sanitizedRow['Lead Date'] || sanitizedRow['lead_date'] ? parseExcelDate(sanitizedRow['Lead Date'] || sanitizedRow['lead_date']) : new Date(),
        lead_source_no: safeToString(sanitizedRow['Partner ID'] || sanitizedRow['Lead Source Number'] || sanitizedRow['lead_source_no']),
        source_id: source_id || sanitizedRow['Source'] || sanitizedRow['Source ID'] || null,
        salesperson_agent: safeToString(sanitizedRow['Agent'] || sanitizedRow['Salesperson / Agent'] || sanitizedRow['Salesperson'] || ''),
        project: safeToString(sanitizedRow['Project'] || sanitizedRow['Team'] || ''),
        stage_name: safeToString(sanitizedRow['Stage Name'] || sanitizedRow['Stage'] || sanitizedRow['stage_name']),
        status_name: safeToString(sanitizedRow['Status'] || sanitizedRow['Status Name'] || sanitizedRow['status_name']),
        use_status: 'pending',
        leadPrice: lead_price,
        // Store names for later lookup (using pre-loaded reference data)
        _previousAgentName: safeToString(sanitizedRow['Previous Agent'] || ''),
        _previousProjectName: safeToString(sanitizedRow['Previous Project'] || ''),
        _sourceAgentName: safeToString(sanitizedRow['Source Agent'] || ''),
        _sourceProjectName: safeToString(sanitizedRow['Source Project'] || '')
      };
      
      // Basic validation
      const hasEmail = leadData.email_from && /^\S+@\S+\.\S+$/.test(leadData.email_from);
      const hasPhone = leadData.phone && leadData.phone.replace(/\D/g, '').length >= 5;
      
      if (!hasEmail && !hasPhone) {
        invalidRows.push({
          data: row,
          error: 'Missing required contact information (email or phone required)'
        });
        continue;
      }
      
      leadsData.push(leadData);
    }
    
    logger.info(`✅ Validation complete: ${leadsData.length} valid, ${invalidRows.length} invalid`);
    
    if (progressCallback) {
      progressCallback({
        phase: 'enhancement_check',
        description: 'Checking for existing leads...',
        percentage: 25
      });
    }
    
    // PHASE 4: Enhancement and duplicate check (using existing functions)
    const enhancementResults = await checkDatabaseEnhancement(leadsData);
    
    if (progressCallback) {
      progressCallback({
        phase: 'stage_assignment',
        description: 'Assigning stages and statuses...',
        percentage: 35
      });
    }
    
    // PHASE 5: Stage and status assignment
    const stageStatusResults = await checkStageAndStatusAssignment(enhancementResults.remainingLeads);
    
    if (progressCallback) {
      progressCallback({
        phase: 'agent_assignment',
        description: 'Auto-assigning agents...',
        percentage: 45
      });
    }
    
    // PHASE 6: Agent auto-assignment
    const autoAssignmentResults = await checkAgentAutoAssignment(stageStatusResults.remainingLeads);
    
    if (progressCallback) {
      progressCallback({
        phase: 'duplicate_check',
        description: 'Final duplicate check...',
        percentage: 55
      });
    }
    
    // PHASE 7: Final duplicate check
    const duplicateCheckResults = await checkImportDuplicates(autoAssignmentResults.remainingLeads);
    
    if (progressCallback) {
      progressCallback({
        phase: 'lookup_resolution',
        description: 'Resolving agent and project references...',
        percentage: 65
      });
    }
    
    // PHASE 8: Combine all leads and resolve lookups using pre-loaded data (OPTIMIZED)
    const leadsToCreate = [
      ...enhancementResults.duplicateLeads.map(item => ({ ...item.lead })),
      ...stageStatusResults.stageAssignedLeads.map(item => ({ ...item.lead })),
      ...autoAssignmentResults.autoAssignedLeads.map(item => ({ ...item.lead })),
      ...duplicateCheckResults.validLeads.map(lead => ({ ...lead }))
    ];
    
    // Use in-memory lookups instead of per-lead database queries (MAJOR OPTIMIZATION)
    for (let i = 0; i < leadsToCreate.length; i++) {
      const lead = leadsToCreate[i];
      
      // O(1) lookups using pre-loaded Maps
      if (lead._previousAgentName) {
        lead.prev_user_id = lookupUserByName(lead._previousAgentName, referenceData);
      }
      if (lead._previousProjectName) {
        const team = lookupTeamByName(lead._previousProjectName, referenceData);
        lead.prev_team_id = team?._id || null;
      }
      if (lead._sourceAgentName) {
        lead.source_agent = lookupUserByName(lead._sourceAgentName, referenceData);
      }
      if (lead._sourceProjectName) {
        const team = lookupTeamByName(lead._sourceProjectName, referenceData);
        lead.source_project = team?._id || null;
      }
      
      // Clean up temporary fields
      delete lead._previousAgentName;
      delete lead._previousProjectName;
      delete lead._sourceAgentName;
      delete lead._sourceProjectName;
      
      // Progress update every 10000 leads
      if (i > 0 && i % 10000 === 0 && progressCallback) {
        progressCallback({
          phase: 'lookup_resolution',
          description: `Resolving references ${i}/${leadsToCreate.length}...`,
          percentage: 65 + (i / leadsToCreate.length) * 10,
          processedCount: i
        });
      }
    }
    
    logger.info(`🔗 Resolved references for ${leadsToCreate.length} leads using in-memory lookups`);
    
    // PHASE 9: Batch create leads using optimized function
    let result = {
      success: [],
      failed: [],
      enhanced: enhancementResults.enhancedLeads,
      autoAssigned: autoAssignmentResults.autoAssignedLeads,
      stageAssigned: stageStatusResults.stageAssignedLeads,
      reclamationCreated: [],
      reclamationErrors: []
    };
    
    if (leadsToCreate.length > 0) {
      if (progressCallback) {
        progressCallback({
          phase: 'database_insertion',
          description: `Creating ${leadsToCreate.length} leads...`,
          percentage: 75
        });
      }
      
      const { createLeadsBatch } = require('./crud');
      const createResult = await createLeadsBatch(leadsToCreate, user, referenceData, progressCallback);
      
      result.success = createResult.created || [];
      result.failed = [...(result.failed || []), ...(createResult.failed || [])];
      
      // Create assignment records for auto-assigned leads
      if (autoAssignmentResults.autoAssignedLeads.length > 0) {
        await createAssignmentRecords(result.success, autoAssignmentResults.autoAssignedLeads, user);
      }
      
      // Create reclamation records for Reklamation stage leads
      const reclamationResults = await createReclamationRecordsForReklamationLeads(
        result.success,
        stageStatusResults.stageAssignedLeads,
        autoAssignmentResults.autoAssignedLeads,
        user
      );
      
      result.reclamationCreated = reclamationResults.createdReclamations;
      result.reclamationErrors = reclamationResults.errors;
    }
    
    // Add failures from enhancement phase
    if (enhancementResults.failedLeads.length > 0) {
      result.failed = result.failed || [];
      enhancementResults.failedLeads.forEach(failedLead => {
        result.failed.push({ data: failedLead, error: failedLead.error || 'Enhancement phase failure' });
      });
    }
    
    // Add duplicate failures
    if (duplicateCheckResults.failedLeads.length > 0) {
      result.failed = result.failed || [];
      duplicateCheckResults.failedLeads.forEach(failedLead => {
        result.failed.push({ data: failedLead, error: failedLead.error || 'Duplicate lead' });
      });
    }
    
    // Combine with invalid rows
    const allFailedRows = [...invalidRows, ...(result.failed || [])];
    
    // Create error file if needed
    let downloadLink = null;
    if (allFailedRows.length > 0) {
      // Simplified error file creation
      const failedRows = allFailedRows.map(fail => ({
        'Contact Name': fail.data?.contact_name || fail.data?.['Contact Name'] || '',
        'Email': fail.data?.email_from || fail.data?.['Email'] || '',
        'Phone': fail.data?.phone || fail.data?.['Phone'] || '',
        'Error': fail.error || 'Unknown error'
      }));
      
      const failedWorkbook = xlsx.utils.book_new();
      const failedWorksheet = xlsx.utils.json_to_sheet(failedRows);
      xlsx.utils.book_append_sheet(failedWorkbook, failedWorksheet, 'Failed Leads');
      
      const failedFilename = `failed-leads-${checksum}.xlsx`;
      const workbookBuffer = xlsx.write(failedWorkbook, { type: 'buffer', bookType: 'xlsx' });
      
      try {
        await storageConfig.uploadFile(workbookBuffer, failedFilename, 'documents', {
          source: 'lead_import_errors'
        });
        downloadLink = `/leads/download/${failedFilename}`;
      } catch (err) {
        logger.error('Failed to upload error file:', err.message);
      }
    }
    
    // Update import record
    const processingTime = Date.now() - startTime;
    
    await ImportHistory.findByIdAndUpdate(importId, {
      success_count: result.success.length,
      failure_count: allFailedRows.length,
      status: 'completed',
      processing_time_ms: processingTime,
      completed_at: new Date(),
      enhanced_count: result.enhanced.length,
      auto_assigned_count: result.autoAssigned.length,
      stage_assigned_count: result.stageAssigned.length,
      reclamation_created_count: result.reclamationCreated.length,
      duplicate_status_summary: {
        new: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 0).length,
        oldDuplicate: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 1).length,
        duplicate: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 2).length,
      },
      'progress.current_phase': 'completed',
      'progress.phase_description': 'Import completed successfully',
      'progress.percentage': 100,
      'revert_data.created_lead_ids': result.success.map(l => l._id)
    });
    
    // Clean up temp file
    if (file && file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (err) {}
    }
    
    if (progressCallback) {
      progressCallback({
        phase: 'completed',
        description: `Import completed: ${result.success.length} leads created`,
        percentage: 100,
        processedCount: result.success.length
      });
    }
    
    logger.info(`🎉 OPTIMIZED import completed in ${processingTime}ms: ${result.success.length} created, ${allFailedRows.length} failed`);
    
    // Calculate duplicate status summary
    const duplicateStatusSummary = {
      new: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 0).length,
      oldDuplicate: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 2).length,
      duplicate: (result.success || []).filter(lead => (lead.duplicate_status || 0) === 1).length,
    };
    
    return {
      message: `Import completed. ${result.success.length} leads created successfully.`,
      successCount: result.success.length,
      enhancedCount: result.enhanced.length,
      stageAssignedCount: result.stageAssigned.length,
      autoAssignedCount: result.autoAssigned.length,
      reclamationCreatedCount: result.reclamationCreated.length,
      failureCount: allFailedRows.length,
      downloadLink,
      importId,
      duplicateStatusSummary
    };
    
  } catch (error) {
    logger.error('Optimized import failed:', error);
    
    // Update import record with failure
    await ImportHistory.findByIdAndUpdate(importId, {
      status: 'failed',
      error_message: error.message,
      'progress.current_phase': 'failed',
      'progress.phase_description': `Error: ${error.message}`
    });
    
    throw error;
  }
};

module.exports = {
  importLeadsFromExcel,
  importLeadsFromExcelOptimized,
  getImportHistory,
  revertLeadImport,
  preloadReferenceData,
  lookupUserByName,
  lookupTeamByName
};
