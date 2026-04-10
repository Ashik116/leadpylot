/**
 * Offer Service Excel Import
 * Functions for importing offers from Excel files
 */

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { Offer, Lead, Bank, Team, User, AssignLeads, OfferImportHistory } = require('../../models/index');
const Settings = require('../../models/Settings');
const { createOfferForImport } = require('./importHelper');
const storageConfig = require('../../config/storageConfig');

/**
 * Validate offer data from Excel row
 * @param {Object} row - Excel row data
 * @returns {Array} - Array of validation errors
 */
const validateOfferData = (row) => {
  const errors = [];

  // Required field validation
  if (!row['Partner ID'] || row['Partner ID'].toString().trim() === '') {
    errors.push('Partner ID is required');
  }

  if (!row['Invenstment Volume'] || isNaN(parseFloat(row['Invenstment Volume'].toString().replace(/,/g, '')))) {
    errors.push('Investment Volume must be a valid number');
  } else if (parseFloat(row['Invenstment Volume'].toString().replace(/,/g, '')) <= 0) {
    errors.push('Investment Volume must be greater than 0');
  }

  if (!row['Interest Rate'] || isNaN(parseFloat(row['Interest Rate']))) {
    errors.push('Interest Rate must be a valid number');
  } else if (parseFloat(row['Interest Rate']) < 0 || parseFloat(row['Interest Rate']) > 100) {
    errors.push('Interest Rate must be between 0 and 100');
  }

  if (!row['Bonus Amount'] || isNaN(parseFloat(row['Bonus Amount']))) {
    errors.push('Bonus Amount must be a valid number');
  } else if (parseFloat(row['Bonus Amount']) < 0) {
    errors.push('Bonus Amount must be greater than or equal to 0');
  }

  if (!row['Payment Terms'] || !row['Payment Terms'].toString().trim()) {
    errors.push('Payment Terms is required');
  }

  return errors;
};

/**
 * Find lead by Partner ID
 * @param {string} partnerId - Partner ID to search for
 * @returns {Object|null} - Lead object or null if not found
 */
const matchLeadByPartnerId = async (partnerId) => {
  const lead = await Lead.findOne({
    lead_source_no: partnerId.toString().trim(),
    active: true
  }).lean();

  return lead;
};

/**
 * Lookup bonus amount setting by amount value
 * @param {number} amount - Bonus amount to find
 * @returns {string|null} - Settings ObjectId or null if not found
 */
const lookupBonusAmount = async (amount) => {
  const setting = await Settings.findOne({
    type: 'bonus_amount',
    'info.amount': parseInt(amount)
  }).lean();

  return setting?._id || null;
};

/**
 * Lookup payment terms setting by payment terms string
 * @param {string} paymentTerms - Payment terms string (e.g., "12 Months")
 * @returns {string|null} - Settings ObjectId or null if not found
 */
const lookupPaymentTerms = async (paymentTerms) => {
  if (!paymentTerms) return null;
  
  // Extract number from payment terms (e.g., "12 Months" -> 12)
  const monthsMatch = paymentTerms.toString().match(/(\d+)/);
  if (!monthsMatch) {
    return null;
  }
  
  const months = parseInt(monthsMatch[1]);
  
  const setting = await Settings.findOne({
    type: 'payment_terms',
    'info.info.months': months
  }).lean();

  return setting?._id || null;
};

/**
 * Lookup bank by name
 * @param {string} bankName - Bank name to search for
 * @returns {string|null} - Bank ObjectId or null if not found
 */
const lookupBankByName = async (bankName) => {
  if (!bankName || bankName.toString().trim() === '') {
    return null;
  }

  const bank = await Bank.findOne({
    name: { $regex: new RegExp(bankName.toString().trim(), 'i') }
  }).lean();

  return bank?._id || null;
};

/**
 * Lookup project by name
 * @param {string} projectName - Project name to search for
 * @returns {string|null} - Project ObjectId or null if not found
 */
const lookupProjectByName = async (projectName) => {
  if (!projectName || projectName.toString().trim() === '') {
    return null;
  }

  const project = await Team.findOne({
    name: { $regex: new RegExp(projectName.toString().trim(), 'i') }
  }).lean();

  return project?._id || null;
};

/**
 * Lookup agent by name or email
 * @param {string} agentName - Agent name or email to search for
 * @returns {string|null} - User ObjectId or null if not found
 */
const lookupAgentByName = async (agentName) => {
  if (!agentName || agentName.toString().trim() === '') {
    return null;
  }

  const agent = await User.findOne({
    $or: [
      { 'info.name': { $regex: new RegExp(agentName.toString().trim(), 'i') } },
      { name: { $regex: new RegExp(agentName.toString().trim(), 'i') } },
      { login: { $regex: new RegExp(agentName.toString().trim(), 'i') } }
    ],
    role: { $in: ['agent', 'Agent'] }
  }).lean();

  return agent?._id || null;
};

/**
 * Check if lead already has an offer
 * @param {string} leadId - Lead ObjectId
 * @returns {boolean} - True if lead already has an offer
 */
const checkLeadHasOffer = async (leadId) => {
  const existingOffer = await Offer.findOne({ lead_id: leadId }).lean();
  return !!existingOffer;
};

/**
 * Process a single offer row from Excel
 * @param {Object} row - Excel row data
 * @param {Object} user - User performing the import
 * @param {Function} hasPermissionFn - Permission checking function
 * @param {Object} permissions - Permission constants
 * @returns {Object} - Processed offer data
 */
const processOfferRow = async (row, user, hasPermissionFn, permissions) => {
  // 1. Find lead by Partner ID
  const lead = await matchLeadByPartnerId(row['Partner ID']);
  if (!lead) {
    throw new Error(`Lead not found for Partner ID: ${row['Partner ID']}`);
  }

  // 2. Check if lead already has an offer
  const hasOffer = await checkLeadHasOffer(lead._id);
  if (hasOffer) {
    throw new Error(`Lead already has an offer: ${lead.contact_name}`);
  }

  // 3. Lookup settings
  const bonusAmountId = await lookupBonusAmount(row['Bonus Amount']);
  if (!bonusAmountId) {
    throw new Error(`Bonus amount not found: ${row['Bonus Amount']}`);
  }

  const paymentTermsId = await lookupPaymentTerms(row['Payment Terms']);
  if (!paymentTermsId) {
    throw new Error(`Payment terms not found: ${row['Payment Terms']}`);
  }

  // 4. Lookup bank (optional)
  let bankId = null;
  if (row['Bank']) {
    bankId = await lookupBankByName(row['Bank']);
    if (!bankId) {
      throw new Error(`Bank not found: ${row['Bank']}`);
    }
  }

  // 5. Determine project_id and agent_id
  let projectId, agentId;

  if (row['Project'] && row['Salesperson / Agent']) {
    // Use provided project and agent
    projectId = await lookupProjectByName(row['Project']);
    if (!projectId) {
      throw new Error(`Project not found: ${row['Project']}`);
    }

    agentId = await lookupAgentByName(row['Salesperson / Agent']);
    if (!agentId) {
      throw new Error(`Agent not found: ${row['Salesperson / Agent']}`);
    }
  } else {
    // Use lead's current assignment
    const assignment = await AssignLeads.findOne({
      lead_id: lead._id,
      status: 'active'
    });

    if (!assignment) {
      throw new Error(`No active assignment found for lead: ${lead.contact_name}`);
    }

    projectId = assignment.project_id;
    agentId = assignment.agent_id;
  }

  // 6. Verify agent assignment to project
  // Check if agent exists in the project's agents array
  const project = await Team.findById(projectId).lean();
  if (!project) {
    throw new Error(`Project not found: ${row['Project']}`);
  }

  const agentInProject = project.agents?.find(agent => 
    agent.active && 
    (
      (agent.user && agent.user.toString() === agentId.toString()) ||
      (agent.user_id && agent.user_id.toString() === agentId.toString())
    )
  );

  if (!agentInProject) {
    throw new Error(`Agent not assigned to project for lead: ${lead.contact_name}`);
  }

  // 7. Build offer data
  const offerData = {
    lead_id: lead._id,
    project_id: projectId,
    agent_id: agentId,
    created_by: user._id, // Track who created the offer
    investment_volume: parseFloat(row['Invenstment Volume'].toString().replace(/,/g, '')),
    interest_rate: parseFloat(row['Interest Rate']),
    bonus_amount: bonusAmountId,
    payment_terms: paymentTermsId,
    bank_id: bankId,
    status: 'pending', // Default status for imports
    nametitle: row['Contact Name'] || null,
    // Map investment/offer type from Excel columns
    offerType: row['Investment Type'] || row['Offer Type'] || row['Type'] || row['Invest Type'] || row['Offers/Invest Type'] || null
  };

  // DEBUG: Log Excel column extraction for offerType
  logger.info(`📋 EXCEL DEBUG: Processing offerType mapping for Partner ID ${row['Partner ID']}`, {
    'row["Investment Type"]': row['Investment Type'],
    'row["Offer Type"]': row['Offer Type'], 
    'row["Type"]': row['Type'],
    'row["Invest Type"]': row['Invest Type'],
    'row["Offers/Invest Type"]': row['Offers/Invest Type'],
    'final offerType': offerData.offerType,
    'available columns': Object.keys(row)
  });

  return offerData;
};

/**
 * Create offers from processed data
 * @param {Array} validOffers - Array of processed offer data
 * @param {Object} user - User performing the import
 * @param {Function} hasPermissionFn - Permission checking function
 * @param {Object} permissions - Permission constants
 * @returns {Object} - Creation results
 */
const createOffersFromImport = async (validOffers, user, hasPermissionFn, permissions) => {
  const results = { created: [], failed: [] };

  for (const offerData of validOffers) {
    try {
      // Use existing createOffer function
      const offer = await createOfferForImport(
        offerData,
        user,
        hasPermissionFn,
        permissions
      );

      results.created.push(offer);
      logger.info(`Successfully created offer for lead: ${offer.lead_id?.contact_name || 'Unknown'}`);
    } catch (error) {
      logger.error(`Failed to create offer for lead ${offerData.lead_id}:`, error);
      results.failed.push({
        data: offerData,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Enhanced database check for updating existing offers with missing data
 * @param {Array} validOffers - Array of processed offer data objects
 * @returns {Object} - Object with enhancedOffers array and remainingOffers array
 */
const checkOfferDatabaseEnhancement = async (validOffers) => {
  const startTime = Date.now();
  logger.info(`Starting offer database enhancement check for ${validOffers.length} offers`);

  const results = {
    enhancedOffers: [],
    remainingOffers: [],
  };

  // Process each offer for potential enhancement
  for (const offerData of validOffers) {
    try {
      // Find existing offer for this lead
      const existingOffer = await Offer.findOne({ lead_id: offerData.lead_id }).lean();
      
      if (!existingOffer) {
        // No existing offer, add to remaining offers for normal processing
        results.remainingOffers.push(offerData);
        continue;
      }

      logger.info(`🔍 ENHANCEMENT DEBUG: Found existing offer for lead ${offerData.lead_id}`, {
        existingOfferId: existingOffer._id,
        existingOfferType: existingOffer.offerType,
        newOfferType: offerData.offerType,
        willEnhanceOfferType: !existingOffer.offerType && offerData.offerType
      });

      // Check for missing fields that can be enhanced
      const fieldsToUpdate = {};
      
      if (!existingOffer.nametitle && offerData.nametitle) {
        fieldsToUpdate.nametitle = offerData.nametitle;
      }
      if (!existingOffer.reference_no && offerData.reference_no) {
        fieldsToUpdate.reference_no = offerData.reference_no;
      }
      if (!existingOffer.bank_id && offerData.bank_id) {
        fieldsToUpdate.bank_id = offerData.bank_id;
      }
      if (!existingOffer.bankerRate && offerData.bankerRate) {
        fieldsToUpdate.bankerRate = offerData.bankerRate;
      }
      if (!existingOffer.agentRate && offerData.agentRate) {
        fieldsToUpdate.agentRate = offerData.agentRate;
      }
      if (!existingOffer.offerType && offerData.offerType) {
        fieldsToUpdate.offerType = offerData.offerType;
        logger.info(`✅ ENHANCEMENT DEBUG: Will enhance offerType from "${existingOffer.offerType}" to "${offerData.offerType}"`);
      } else {
        logger.info(`⚠️ ENHANCEMENT DEBUG: NOT enhancing offerType`, {
          reason: existingOffer.offerType ? 'existing offer already has offerType' : 'new offer data has no offerType',
          existingOfferType: existingOffer.offerType,
          newOfferType: offerData.offerType
        });
      }

      // Update core fields if they're different (investment_volume, interest_rate, etc.)
      if (existingOffer.investment_volume !== offerData.investment_volume) {
        fieldsToUpdate.investment_volume = offerData.investment_volume;
      }
      if (existingOffer.interest_rate !== offerData.interest_rate) {
        fieldsToUpdate.interest_rate = offerData.interest_rate;
      }
      if (existingOffer.bonus_amount.toString() !== offerData.bonus_amount.toString()) {
        fieldsToUpdate.bonus_amount = offerData.bonus_amount;
      }
      if (existingOffer.payment_terms.toString() !== offerData.payment_terms.toString()) {
        fieldsToUpdate.payment_terms = offerData.payment_terms;
      }

      // If we have fields to update, enhance the existing offer
      if (Object.keys(fieldsToUpdate).length > 0) {
        await Offer.findByIdAndUpdate(existingOffer._id, {
          $set: {
            ...fieldsToUpdate,
            updated_at: new Date(),
          }
        });

        results.enhancedOffers.push({
          existingOfferId: existingOffer._id,
          enhancedFields: Object.keys(fieldsToUpdate),
          originalOfferData: offerData,
          leadId: offerData.lead_id,
          message: `Enhanced existing offer with: ${Object.keys(fieldsToUpdate).join(', ')}`,
        });

        logger.info(`Enhanced existing offer ${existingOffer._id} for lead ${offerData.lead_id} with fields: ${Object.keys(fieldsToUpdate).join(', ')}`);
      } else {
        // No enhancement needed, but offer already exists - this could be treated as a skip or warning
        logger.info(`Offer already exists for lead ${offerData.lead_id} with no enhancement needed - skipping`);
      }

    } catch (error) {
      logger.error(`Error during offer enhancement check for lead ${offerData.lead_id}:`, error);
      // On error, add to remaining offers for normal processing
      results.remainingOffers.push(offerData);
    }
  }

  const totalTime = Date.now() - startTime;
  logger.info(
    `Offer database enhancement completed in ${totalTime}ms: ${results.enhancedOffers.length} enhanced, ${results.remainingOffers.length} remaining`
  );

  return results;
};

/**
 * Main function to import offers from Excel file
 * @param {Object} file - Uploaded file object
 * @param {Object} user - User performing the import
 * @param {Function} hasPermissionFn - Permission checking function
 * @param {Object} permissions - Permission constants
 * @returns {Object} - Import results
 */
const importOffersFromExcel = async (file, user, hasPermissionFn, permissions) => {
  const startTime = Date.now();
  let importRecord = null;

  try {
    // Use centralized storage configuration
    const importsDir = storageConfig.getPath('offerImports');
    // Directory creation is handled by storageConfig

    // Generate a checksum-based filename to avoid duplicates
    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `offer-import-${checksum}${fileExtension}`;

    // FIXED: Use cloud storage upload instead of local filesystem copy
    let uploadResult;
    let storedFilePath;
    
    try {
      // Upload file using hybrid storage (local + cloud)
      uploadResult = await storageConfig.uploadFile(
        fileBuffer, 
        storedFilename, 
        'offerImports',
        {
          originalFilename: file.originalname,
          uploader: user._id || user.id,
          contentType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          source: 'offer_excel_import',
          uploadedAt: new Date().toISOString()
        }
      );

      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.errors?.join(', ') || 'Unknown error'}`);
      }

      // For backward compatibility, set storedFilePath for local access if needed
      storedFilePath = storageConfig.getFilePath(storedFilename, 'offerImports');
      
      logger.info(`✅ Offer import file uploaded successfully`, {
        filename: storedFilename,
        originalName: file.originalname,
        size: fileBuffer.length,
        cloudSuccess: uploadResult.storage?.cloud || false,
        localSuccess: uploadResult.storage?.local || false,
        webPath: uploadResult.webPath,
        storage: uploadResult.storage?.cloud ? 'CLOUD' : 'LOCAL'
      });
    } catch (uploadError) {
      logger.error('❌ Failed to upload offer import file to storage', {
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
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Create import history record
    importRecord = new OfferImportHistory({
      user_id: user._id || user.id,
      user_name: user.name || user.login || user.email || 'Unknown',
      user_email: user.email || user.login || 'unknown@example.com',
      original_filename: file.originalname,
      stored_filename: storedFilename,
      file_size: fileStats.size,
      total_rows: rows.length,
      success_count: 0,
      failure_count: 0,
      status: 'processing',
      original_file_path: storedFilePath,
    });

    await importRecord.save();
    logger.info(
      `Created offer import record ${importRecord._id} for ${rows.length} offers from user ${user.email}`
    );

    logger.info(`Processing ${rows.length} offers from Excel file`);

    // Process each row
    const validOffers = [];
    const invalidRows = [];

    for (const [index, row] of rows.entries()) {
      try {
        // Validate the row
        const errors = validateOfferData(row);
        if (errors.length > 0) {
          invalidRows.push({
            row: index + 2,
            data: row,
            errors: errors
          });
          continue;
        }

        // Process the row
        const offerData = await processOfferRow(row, user, hasPermissionFn, permissions);
        validOffers.push(offerData);
      } catch (error) {
        invalidRows.push({
          row: index + 2,
          data: row,
          error: error.message
        });
      }
    }

    logger.info(
      `Validated ${rows.length} rows: ${validOffers.length} valid, ${invalidRows.length} invalid`
    );

    // ENHANCEMENT PHASE: Check for database enhancement opportunities
    logger.info('Enhancement Phase: Checking for offer enhancement opportunities...');
    const enhancementResults = await checkOfferDatabaseEnhancement(validOffers);

    // Create offers (only for remaining offers after enhancement)
    let createResults = { created: [], failed: [] };
    if (enhancementResults.remainingOffers.length > 0) {
      createResults = await createOffersFromImport(enhancementResults.remainingOffers, user, hasPermissionFn, permissions);
    }

    // Combine all failures
    const allFailedRows = [...invalidRows, ...createResults.failed];

    // Create error file if there are failures
    let downloadLink = null;
    if (allFailedRows.length > 0) {
      // Process failed rows to ensure consistent structure
      const failedRows = allFailedRows.map((fail) => {
        const cleanRow = {};
        const originalData = fail.data || {};

        // Define the columns we want to include
        const columnOrder = [
          'Partner ID',
          'Invenstment Volume',
          'Interest Rate',
          'Bonus Amount',
          'Payment Terms',
          'Bank',
          'Contact Name',
          'Investment Type',
          'Project',
          'Salesperson / Agent',
          'Error'
        ];

        // Map the data to our clean structure
        cleanRow['Partner ID'] = originalData['Partner ID'] || '';
        cleanRow['Invenstment Volume'] = originalData['Invenstment Volume'] || '';
        cleanRow['Interest Rate'] = originalData['Interest Rate'] || '';
        cleanRow['Bonus Amount'] = originalData['Bonus Amount'] || '';
        cleanRow['Payment Terms'] = originalData['Payment Terms'] || '';
        cleanRow['Bank'] = originalData['Bank'] || '';
        cleanRow['Contact Name'] = originalData['Contact Name'] || '';
        cleanRow['Investment Type'] = originalData['Investment Type'] || originalData['Offer Type'] || originalData['Type'] || originalData['Invest Type'] || originalData['Offers/Invest Type'] || '';
        cleanRow['Project'] = originalData['Project'] || '';
        cleanRow['Salesperson / Agent'] = originalData['Salesperson / Agent'] || '';

        // Add the error message
        if (fail.errors && Array.isArray(fail.errors)) {
          cleanRow['Error'] = fail.errors.join('; ');
        } else {
          cleanRow['Error'] = fail.error || 'Unknown error';
        }

        return cleanRow;
      });

      // Create a new workbook for failed rows
      const failedWorkbook = xlsx.utils.book_new();

      // Define the column order
      const columnOrder = [
        'Partner ID',
        'Invenstment Volume',
        'Interest Rate',
        'Bonus Amount',
        'Payment Terms',
        'Bank',
        'Contact Name',
        'Project',
        'Salesperson / Agent',
        'Error'
      ];

      // Create the worksheet
      const failedWorksheet = xlsx.utils.json_to_sheet(failedRows, {
        header: columnOrder,
      });

      // Set column widths
      const wscols = [
        { wch: 15 }, // Partner ID
        { wch: 18 }, // Investment Volume
        { wch: 15 }, // Interest Rate
        { wch: 12 }, // Bonus Amount
        { wch: 15 }, // Payment Terms
        { wch: 20 }, // Bank
        { wch: 25 }, // Contact Name
        { wch: 18 }, // Investment Type
        { wch: 20 }, // Project
        { wch: 20 }, // Salesperson / Agent
        { wch: 50 }, // Error
      ];
      failedWorksheet['!cols'] = wscols;

      // Add the worksheet to the workbook
      xlsx.utils.book_append_sheet(failedWorkbook, failedWorksheet, 'Failed Offers');

      // Create filename
      const failedRowsString = JSON.stringify(failedRows);
      const checksum = crypto.createHash('md5').update(failedRowsString).digest('hex');
      const failedFilename = `failed-offers-${checksum}.xlsx`;

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
            source: 'offer_import_errors',
            uploadedAt: new Date().toISOString()
          }
        );

        if (!errorUploadResult.success) {
          throw new Error(`Error file upload failed: ${errorUploadResult.errors?.join(', ') || 'Unknown error'}`);
        }

        logger.info(`✅ Failed offers file uploaded successfully`, {
          filename: failedFilename,
          size: workbookBuffer.length,
          cloudSuccess: errorUploadResult.storage?.cloud || false,
          localSuccess: errorUploadResult.storage?.local || false,
          webPath: errorUploadResult.webPath,
          storage: errorUploadResult.storage?.cloud ? 'CLOUD' : 'LOCAL'
        });

        // Add the download link to the result
        downloadLink = `/offers/import/download/${failedFilename}`;

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
        created_offer_ids: (createResults.created || []).map(offer => offer._id),
        created_activity_ids: [], // Activity IDs can be found by timestamp and creator
        lead_updates: [], // Will be populated if we track lead updates during creation
        enhanced_offers: (enhancementResults.enhancedOffers || []).map(enhanced => ({
          offer_id: enhanced.existingOfferId,
          original_values: {}, // Original values would need to be captured during enhancement
          updated_fields: enhanced.enhancedFields
        }))
      };

      // Note: For now, we don't track detailed lead updates during offer creation
      // This could be enhanced in the future to capture original values before updates

      importRecord.success_count = createResults.created.length;
      importRecord.failure_count = allFailedRows.length;
      importRecord.enhanced_count = enhancementResults.enhancedOffers.length;
      importRecord.status = 'completed';
      importRecord.processing_time_ms = processingTime;
      importRecord.completed_at = new Date();
      
      // Save revert tracking data
      importRecord.revert_data = revertData;

      await importRecord.save();
      logger.info(`Updated offer import record ${importRecord._id} with final results and revert data: ${createResults.created.length} created, ${enhancementResults.enhancedOffers.length} enhanced, ${allFailedRows.length} failed`);
    }

    // Clean up the temporary uploaded file
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.debug(`Successfully deleted temporary uploaded file: ${file.path}`);
      } catch (err) {
        logger.error('Error deleting temporary uploaded Excel file', { error: err });
      }
    }

    // Return the result
    return {
      message: `Import completed. ${createResults.created.length} offers created successfully, ${enhancementResults.enhancedOffers.length} offers enhanced, ${allFailedRows.length} offers failed.`,
      successCount: createResults.created.length,
      enhancedCount: enhancementResults.enhancedOffers.length,
      failureCount: allFailedRows.length,
      downloadLink: downloadLink,
      importId: importRecord ? importRecord._id : null,
      enhancedOffers: enhancementResults.enhancedOffers,
    };

  } catch (error) {
    logger.error('Error importing offers from Excel', { error });
    
    // Initialize enhancement results for error case
    const enhancementResults = { enhancedOffers: [] };
    
    // Create error file with the exception details if we have rows to process
    let downloadLink = null;
    if (rows && rows.length > 0) {
      try {
        // Create a failed file with all rows marked as failed due to the exception
        const failedRows = rows.map((row, index) => {
          const cleanRow = {};
          
          // Map the original row data
          cleanRow['Partner ID'] = row['Partner ID'] || '';
          cleanRow['Invenstment Volume'] = row['Invenstment Volume'] || '';
          cleanRow['Interest Rate'] = row['Interest Rate'] || '';
          cleanRow['Bonus Amount'] = row['Bonus Amount'] || '';
          cleanRow['Payment Terms'] = row['Payment Terms'] || '';
          cleanRow['Bank'] = row['Bank'] || '';
          cleanRow['Contact Name'] = row['Contact Name'] || '';
          cleanRow['Investment Type'] = row['Investment Type'] || row['Offer Type'] || row['Type'] || row['Invest Type'] || row['Offers/Invest Type'] || '';
          cleanRow['Project'] = row['Project'] || '';
          cleanRow['Salesperson / Agent'] = row['Salesperson / Agent'] || '';
          cleanRow['Error'] = `Import failed: ${error.message}`;
          
          return cleanRow;
        });

        // Create the error workbook
        const failedWorkbook = xlsx.utils.book_new();
        const columnOrder = [
          'Partner ID',
          'Invenstment Volume',
          'Interest Rate',
          'Bonus Amount',
          'Payment Terms',
          'Bank',
          'Contact Name',
          'Investment Type',
          'Project',
          'Salesperson / Agent',
          'Error'
        ];

        const failedWorksheet = xlsx.utils.json_to_sheet(failedRows, {
          header: columnOrder,
        });

        // Set column widths
        const wscols = [
          { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
          { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 50 }
        ];
        failedWorksheet['!cols'] = wscols;

        xlsx.utils.book_append_sheet(failedWorkbook, failedWorksheet, 'Failed Offers');

        // Create filename
        const failedRowsString = JSON.stringify(failedRows);
        const checksum = crypto.createHash('md5').update(failedRowsString).digest('hex');
        const failedFilename = `failed-offers-${checksum}.xlsx`;

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
            source: 'offer_import_errors',
            uploadedAt: new Date().toISOString()
          }
        );

        if (errorUploadResult.success) {
          downloadLink = `/offers/import/download/${failedFilename}`;
          
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
      importRecord.enhanced_count = 0;
      await importRecord.save();
    }
    
    // Include download link in the error if available
    const enhancedError = new Error(error.message);
    enhancedError.downloadLink = downloadLink;
    enhancedError.importId = importRecord ? importRecord._id : null;
    enhancedError.enhancedCount = 0;
    enhancedError.enhancedOffers = [];
    throw enhancedError;
  }
};

/**
 * Get offer import history for a user (paginated)
 * @param {Object} user - User object
 * @param {Object} query - Query parameters (page, limit, status)
 * @returns {Object} - Paginated import history
 */
const getOfferImportHistory = async (user, query = {}) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter based on user role
    const filter = {};

    // If not admin, only show user's own imports
    if (user.role !== 'admin') {
      filter.user_id = user._id || user.id;
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
    const total = await OfferImportHistory.countDocuments(filter);

    // Get paginated results
    const imports = await OfferImportHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform results using the model's toResponse method
    const transformedImports = imports.map((importDoc) => {
      const importInstance = new OfferImportHistory(importDoc);
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
    logger.error('Error fetching offer import history', { error });
    throw error;
  }
};

/**
 * Revert an offer import - Undoes all operations performed during the import
 * @param {string} importId - Import ID to revert
 * @param {Object} user - User performing the revert
 * @param {string} reason - Reason for revert
 * @returns {Object} - Revert results
 */
const revertOfferImport = async (importId, user, reason = '') => {
  const startTime = Date.now();
  logger.info(`🔄 Starting offer import revert process for import ${importId} by user ${user.email}`);

  try {
    // Get import record with revert data
    const importRecord = await OfferImportHistory.findById(importId);
    if (!importRecord) {
      throw new Error('Import record not found');
    }

    // Check if revert is allowed
    const revertCheck = importRecord.canRevert();
    if (!revertCheck.canRevert) {
      throw new Error(revertCheck.reason);
    }

    // Additional safety check: Verify no offers have been modified post-import
    const safetyCheck = await checkOfferSafetyForRevert(importRecord);
    if (!safetyCheck.safe) {
      throw new Error(safetyCheck.reason);
    }

    const revertResults = {
      offers_deleted: 0,
      offers_enhanced_reverted: 0,
      activities_deleted: 0,
      lead_updates_reverted: 0,
      errors: []
    };

    const revertData = importRecord.revert_data;
    if (!revertData) {
      throw new Error('No revert data found for this import');
    }

    // Import required models
    const { Offer, Activity, Lead } = require('../../models');

    // PHASE 1: Delete Activity Records (Optional - keep for audit trail)
    if (revertData.created_activity_ids && revertData.created_activity_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_activity_ids.length} activity records...`);
      
      try {
        const activityResult = await Activity.deleteMany({
          _id: { $in: revertData.created_activity_ids }
        });
        revertResults.activities_deleted = activityResult.deletedCount;
        logger.info(`✅ Deleted ${activityResult.deletedCount} activity records`);
      } catch (error) {
        logger.error(`❌ Failed to delete activities:`, error);
        revertResults.errors.push(`Failed to delete activities: ${error.message}`);
      }
    } else {
      // Find activities by creator and timestamp range if specific IDs are not tracked
      try {
        const activityResult = await Activity.deleteMany({
          creator: user._id,
          createdAt: {
            $gte: new Date(importRecord.createdAt.getTime() - 60000), // 1 minute before import
            $lte: new Date(importRecord.completed_at.getTime() + 60000) // 1 minute after import
          },
          subject_type: 'Offer',
          action: 'create'
        });
        revertResults.activities_deleted = activityResult.deletedCount;
        logger.info(`✅ Deleted ${activityResult.deletedCount} activity records by timestamp`);
      } catch (error) {
        logger.error(`❌ Failed to delete activities by timestamp:`, error);
        revertResults.errors.push(`Failed to delete activities: ${error.message}`);
      }
    }

    // PHASE 2: Revert Enhanced Offers
    if (revertData.enhanced_offers && revertData.enhanced_offers.length > 0) {
      logger.info(`🔄 Reverting ${revertData.enhanced_offers.length} enhanced offers...`);
      
      for (const enhancedOffer of revertData.enhanced_offers) {
        try {
          // For now, we'll just log that we would revert these offers
          // In a more sophisticated implementation, we could store original values and restore them
          // Since we don't store original values in the current implementation, 
          // enhanced offers cannot be fully reverted automatically
          logger.warn(`⚠️ Enhanced offer ${enhancedOffer.offer_id} cannot be automatically reverted - original values not stored`);
          revertResults.offers_enhanced_reverted++;
        } catch (error) {
          logger.error(`❌ Failed to process enhanced offer revert for ${enhancedOffer.offer_id}:`, error);
          revertResults.errors.push(`Failed to process enhanced offer revert for ${enhancedOffer.offer_id}: ${error.message}`);
        }
      }
    }

    // PHASE 3: Revert Lead Updates (if tracked)
    if (revertData.lead_updates && revertData.lead_updates.length > 0) {
      logger.info(`🔄 Reverting ${revertData.lead_updates.length} lead updates...`);
      
      for (const leadUpdate of revertData.lead_updates) {
        try {
          const updateFields = {};
          
          // Revert nametitle if it was updated
          if (leadUpdate.field_updates.nametitle?.was_updated) {
            updateFields.nametitle = leadUpdate.field_updates.nametitle.original_value;
          }
          
          // Revert stage/status if it was updated
          if (leadUpdate.field_updates.stage_status?.was_updated) {
            updateFields.stage_id = leadUpdate.field_updates.stage_status.original_stage_id;
            updateFields.status_id = leadUpdate.field_updates.stage_status.original_status_id;
            updateFields.stage = leadUpdate.field_updates.stage_status.original_stage_name;
            updateFields.status = leadUpdate.field_updates.stage_status.original_status_name;
          }
          
          if (Object.keys(updateFields).length > 0) {
            await Lead.findByIdAndUpdate(leadUpdate.lead_id, updateFields);
            revertResults.lead_updates_reverted++;
            logger.info(`✅ Reverted lead updates for ${leadUpdate.lead_id}`);
          }
        } catch (error) {
          logger.error(`❌ Failed to revert lead updates for ${leadUpdate.lead_id}:`, error);
          revertResults.errors.push(`Failed to revert lead updates for ${leadUpdate.lead_id}: ${error.message}`);
        }
      }
    }

    // PHASE 4: Delete Offer Records (do this last)
    if (revertData.created_offer_ids && revertData.created_offer_ids.length > 0) {
      logger.info(`🔄 Deleting ${revertData.created_offer_ids.length} offer records...`);
      
      try {
        const offerResult = await Offer.deleteMany({
          _id: { $in: revertData.created_offer_ids }
        });
        revertResults.offers_deleted = offerResult.deletedCount;
        logger.info(`✅ Deleted ${offerResult.deletedCount} offer records`);
      } catch (error) {
        logger.error(`❌ Failed to delete offers:`, error);
        revertResults.errors.push(`Failed to delete offers: ${error.message}`);
      }
    }

    // Update import record with revert information
    importRecord.is_reverted = true;
    importRecord.reverted_at = new Date();
    importRecord.reverted_by = user._id;
    importRecord.revert_reason = reason;
    importRecord.revert_summary = revertResults;

    await importRecord.save();

    const totalTime = Date.now() - startTime;
    logger.info(`🎉 Offer import revert completed in ${totalTime}ms for import ${importId}:`, revertResults);

    // Emit event for activity logging
    const { eventEmitter, EVENT_TYPES } = require('../events');
    eventEmitter.emit(EVENT_TYPES.OFFER.BULK_DELETED, {
      importId: importId,
      revertResults: revertResults,
      user: user,
      reason: reason
    });

    return {
      success: true,
      message: `Offer import ${importId} has been successfully reverted`,
      importId: importId,
      revert_summary: revertResults,
      processing_time_ms: totalTime
    };

  } catch (error) {
    logger.error(`❌ Error reverting offer import ${importId}:`, error);
    throw error;
  }
};

/**
 * Check if offers from an import are safe to revert (haven't been modified post-import)
 * @param {Object} importRecord - Import record
 * @returns {Object} - Safety check result
 */
const checkOfferSafetyForRevert = async (importRecord) => {
  try {
    const { Offer } = require('../../models');
    
    if (!importRecord.revert_data || !importRecord.revert_data.created_offer_ids) {
      return { safe: true };
    }

    const offerIds = importRecord.revert_data.created_offer_ids;

    // Check if any offers have been modified after the import completed
    const modifiedOffers = await Offer.find({
      _id: { $in: offerIds },
      updatedAt: { $gt: importRecord.completed_at }
    }).select('_id title').limit(5);

    if (modifiedOffers.length > 0) {
      const offerTitles = modifiedOffers.map(offer => offer.title || `Offer #${offer._id}`).join(', ');
      return {
        safe: false,
        reason: `Cannot revert: ${modifiedOffers.length} offers have been modified after import. Examples: ${offerTitles}`
      };
    }

    // Check if any offers have documents/attachments (files array is not empty)
    const offersWithDocuments = await Offer.find({
      _id: { $in: offerIds },
      $expr: { $gt: [{ $size: { $ifNull: ["$files", []] } }, 0] }
    }).select('_id title').limit(5);

    if (offersWithDocuments.length > 0) {
      const offerTitles = offersWithDocuments.map(offer => offer.title || `Offer #${offer._id}`).join(', ');
      return {
        safe: false,
        reason: `Cannot revert: ${offersWithDocuments.length} offers have documents attached. These offers are actively being worked on. Examples: ${offerTitles}`
      };
    }

    return { safe: true };

  } catch (error) {
    logger.error('Error checking offer safety for revert:', error);
    return {
      safe: false,
      reason: `Safety check failed: ${error.message}`
    };
  }
};

module.exports = {
  importOffersFromExcel,
  getOfferImportHistory,
  revertOfferImport,
  // Export individual functions for testing
  matchLeadByPartnerId,
  lookupBonusAmount,
  lookupPaymentTerms,
  lookupBankByName,
  lookupProjectByName,
  lookupAgentByName,
  checkLeadHasOffer,
  checkOfferDatabaseEnhancement,
}; 