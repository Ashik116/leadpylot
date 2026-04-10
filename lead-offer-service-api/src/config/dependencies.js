/**
 * Offer Service Dependencies
 * Centralized imports for all offer service modules
 */

// External dependencies
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// MongoDB models
const {
  Offer,
  Document,
  AssignLeads,
  Lead,
  Bank,
  Opening,
  Confirmation,
  PaymentVoucher,
  Netto1,
  Netto2,
  Lost,
  Settings,
  Team,
  PdfTemplate,
  GeneratedPdf,
} = require('../models');

// Services
const { updateLeadStageAndStatus } = require('../utils/leadServiceUtils');

const { eventEmitter, EVENT_TYPES } = require('../services/events');

// Helpers and utilities
const {
  NotFoundError,
  AuthorizationError,
  DatabaseError,
} = require('../utils/errorHandler');
const logger = require('../utils/logger');
const DocumentUploadHelper = require('../helpers/documentUploadHelper');
const processFileGroup = require('../helpers/processFileGroup');
const storageConfig = require('../config/storageConfig');

module.exports = {
  // External
  mongoose,
  crypto,
  fs,
  path,

  // Models
  Offer,
  Document,
  AssignLeads,
  Lead,
  Bank,
  Opening,
  Confirmation,
  PaymentVoucher,
  Netto1,
  Netto2,
  Lost,
  Settings,
  Team,
  PdfTemplate,
  GeneratedPdf,

  // Services
  updateLeadStageAndStatus,
  eventEmitter,
  EVENT_TYPES,

  // Helpers
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  logger,
  DocumentUploadHelper,
  processFileGroup,
  storageConfig,
};
