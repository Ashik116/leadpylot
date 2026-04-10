const allowedSiteService = require('../services/allowedSiteService');
const logger = require('../utils/logger');

async function getAllSites(req, res, next) {
  try {
    const { page, limit, search, sortBy, sortOrder, showInactive } = req.query;

    const result = await allowedSiteService.getAllSites({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      sortBy,
      sortOrder,
      showInactive,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getSiteById(req, res, next) {
  try {
    const { id } = req.params;
    const site = await allowedSiteService.getSiteById(id);
    res.status(200).json(site);
  } catch (error) {
    next(error);
  }
}

async function createSite(req, res, next) {
  try {
    const site = await allowedSiteService.createSite(req.body);
    res.status(201).json(site);
  } catch (error) {
    next(error);
  }
}

async function updateSite(req, res, next) {
  try {
    const { id } = req.params;
    const site = await allowedSiteService.updateSite(id, req.body);
    res.status(200).json(site);
  } catch (error) {
    next(error);
  }
}

async function deleteSite(req, res, next) {
  try {
    const { ids } = req.body;
    const { id } = req.params;
    const siteIds = ids || id;

    if (!siteIds) {
      return res.status(400).json({ error: 'Site ID(s) required' });
    }

    const result = await allowedSiteService.deleteSite(siteIds);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
};
