/**
 * Routes Index
 * Centralizes all routes for the Configuration service
 */

const express = require('express');
const router = express.Router();

// Import routes
const settingsRoutes = require('./settings');
const banksRoutes = require('./banks');
const projectsRoutes = require('./projects');
const assignmentsRoutes = require('./assignments');
const sourcesRoutes = require('./sources');
const columnsRoutes = require('./columns');
const defaultGroupingFieldsRoutes = require('./defaultGroupingFields');
const closedLeadsRoutes = require('./closedLeads');
const leadFormsRoutes = require('./leadForms');
const allowedSitesRoutes = require('./allowedSites');
const savedFiltersRoutes = require('./savedFilters');

// Mount routes
router.use('/', settingsRoutes);
router.use('/banks', banksRoutes);
router.use('/sources', sourcesRoutes);
router.use('/projects', projectsRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/column-preference', columnsRoutes);
router.use('/default-grouping-fields', defaultGroupingFieldsRoutes);
router.use('/closed-leads', closedLeadsRoutes);
router.use('/lead-forms', leadFormsRoutes);
router.use('/allowed-sites', allowedSitesRoutes);
router.use('/saved-filters', savedFiltersRoutes);

module.exports = router;


