/**
 * Form Import Controller
 * Handles importing leads from WordPress form submissions to the main Lead schema
 */

const { asyncHandler } = require('../utils/errorHandler');
const formImportService = require('../services/leadService/formImportService');
const logger = require('../utils/logger');

/**
 * Import form leads to pending leads
 * Accepts single lead object or array of leads
 * POST /leads/import-from-forms
 */
const importFormLeads = asyncHandler(async (req, res) => {
  const { user } = req;
  const body = req.body;

  if (!body) {
    return res.status(400).json({
      message: 'Request body is required. Provide a single lead object or array of leads.',
    });
  }

  const formLeads = Array.isArray(body) ? body : [body];

  if (formLeads.length === 0) {
    return res.status(400).json({
      message: 'No leads to import. Provide a single lead object or array of leads.',
    });
  }

  logger.info(`Form import: processing ${formLeads.length} lead(s)`, {
    userId: user._id || user.id,
  });

  const result = await formImportService.importFormLeads(formLeads, user);

  const totalRejected = result.rejected.length;
  const totalCreated = result.created.length;
  const totalUpdated = result.updated.length;

  return res.status(200).json({
    message: result.message,
    data: {
      created: result.created,
      updated: result.updated,
      rejected: result.rejected,
    },
    summary: {
      created: totalCreated,
      updated: totalUpdated,
      rejected: totalRejected,
      total: totalCreated + totalUpdated + totalRejected,
    },
  });
});

module.exports = {
  importFormLeads,
};
