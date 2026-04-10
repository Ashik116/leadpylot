/**
 * Models Index
 * Exports all models for the Configuration service
 */

const { Settings, SETTINGS_TYPES } = require('./Settings');
const Project = require('./Project');
const Bank = require('./Bank');
const Assignment = require('./Assignment');
const Source = require('./Source');
const User = require('./User'); // Required for Source.provider_id population
const PdfTemplate = require('./PdfTemplate'); // Required for Project.pdf_templates population
const ColumnPreference = require('./ColumnPreference');
const Document = require('./Document'); // Required for Bank.logo population (stub model)
const DefaultGroupingFields = require('./DefaultGroupingFields');
const ClosedLead = require('./ClosedLead');
const ClosedActivity = require('./ClosedActivity');
const ClosedTodo = require('./ClosedTodo');
const ClosedAssignLeads = require('./ClosedAssignLeads');
const ClosedOffer = require('./ClosedOffer');
const ClosedTermine = require('./ClosedTermine');
const LeadForm = require('./LeadForm');
const AllowedSite = require('./AllowedSite');
const SavedFilter = require('./SavedFilter');

// Alias Project as Team for backward compatibility with main backend
const Team = Project;

module.exports = {
  Settings,
  SETTINGS_TYPES,
  Project,
  Team, // Alias for Project (backward compatibility)
  Bank,
  Assignment,
  Source,
  User, // Export User model for reference population
  PdfTemplate, // Export PdfTemplate model for reference population
  ColumnPreference,
  Document, // Export Document stub model for logo population
  DefaultGroupingFields,
  ClosedLead,
  ClosedActivity,
  ClosedTodo,
  ClosedAssignLeads,
  ClosedOffer,
  ClosedTermine,
  LeadForm,
  AllowedSite,
  SavedFilter,
};


