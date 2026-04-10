const closedLeadGroupingService = require('../services/closedLeadGrouping/ClosedLeadGroupingService');

const getGroupingOptions = async (req, res) => {
  try {
    const options = closedLeadGroupingService.getGroupingOptions(req.user);
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getGroupingSummary = async (req, res) => {
  try {
    const summary = closedLeadGroupingService.getGroupingSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSortingOptions = async (req, res) => {
  try {
    const options = closedLeadGroupingService.getSortingOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const groupClosedLeads = async (req, res) => {
  try {
    const { field } = req.params;
    const {
      page = 1, limit = 50, sortBy = 'count', sortOrder = 'desc',
      search, includeLeads, leadsPage, leadsLimit, ...filterParams
    } = req.query;

    const filters = [];
    for (const [key, value] of Object.entries(filterParams)) {
      if (value) filters.push({ field: key, operator: '=', value });
    }

    const result = await closedLeadGroupingService.groupClosedLeads(field, req.user, {
      page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder, search,
      filters, includeLeads: includeLeads === 'true',
      leadsPage: parseInt(leadsPage || 1), leadsLimit: parseInt(leadsLimit || 20),
    });

    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getGroupDetails = async (req, res) => {
  try {
    const { field, groupId } = req.params;
    const { page = 1, limit = 20, sortBy = 'closed_at', sortOrder = 'desc', search, ...filterParams } = req.query;

    const filters = [];
    for (const [key, value] of Object.entries(filterParams)) {
      if (value) filters.push({ field: key, operator: '=', value });
    }

    const result = await closedLeadGroupingService.getGroupDetails(field, groupId, req.user, {
      page: parseInt(page), limit: parseInt(limit), sortBy, sortOrder, search, filters,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const groupClosedLeadsMultilevel = async (req, res) => {
  try {
    const pathParts = req.params[0];
    if (!pathParts) return res.status(400).json({ success: false, message: 'No grouping fields provided' });

    const fields = pathParts.split('/').filter(Boolean);
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No grouping fields provided' });

    const { sortBy = 'count', sortOrder = 'desc', search, ...filterParams } = req.query;
    const filters = [];
    for (const [key, value] of Object.entries(filterParams)) {
      if (value) filters.push({ field: key, operator: '=', value });
    }

    const result = await closedLeadGroupingService.groupClosedLeadsMultilevel(fields, req.user, {
      sortBy, sortOrder, search, filters,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('Maximum') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  getGroupingOptions,
  getGroupingSummary,
  getSortingOptions,
  groupClosedLeads,
  getGroupDetails,
  groupClosedLeadsMultilevel,
};
