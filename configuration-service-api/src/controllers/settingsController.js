/**
 * Settings Controller
 * Handles HTTP requests for settings operations
 */

const settingsService = require('../services/settingsService');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const path = require('path');
const storageConfig = require('../config/storage');
// const { hasPermission } = require('../middleware/roles/rolePermissions');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { Settings } = require('../models/Settings');
const Project = require('../models/Project');
const fs = require('fs');

/**
 * Normalize email template content: convert friendly placeholder names to actual data paths.
 * Applied on both create and update so stored content always uses correct paths.
 *
 * Supported placeholder conversions:
 * - {{project.name}} or {{project_name}} → {{project[0].name}} (project is an array on lead)
 * - {{contact_name}} → {{contact_name}} (no change, direct property on lead)
 * - All other placeholders remain unchanged
 *
 * @param {string} templateContent - Raw template content
 * @returns {string} Normalized content
 */
function normalizeEmailTemplateContent(templateContent) {
  if (templateContent == null || typeof templateContent !== 'string') return templateContent;

  const original = templateContent;
  const normalized = String(templateContent)
    // Convert project.name and project_name to project[0].name (project is an array)
    .replace(/\{\{\s*project\.name\s*\}\}/gi, '{{project[0].name}}')
    .replace(/\{\{\s*project_name\s*\}\}/gi, '{{project[0].name}}');
    // contact_name and other direct lead properties remain unchanged (no array access needed)
    // No replacement needed for: contact_name, email_from, phone, lead_source_no, etc.

  // Log if normalization made changes
  if (original !== normalized) {
    console.log('[normalizeEmailTemplateContent] Content normalized:', {
      original: original.substring(0, 100),
      normalized: normalized.substring(0, 100),
    });
  }

  return normalized;
}

/**
 * Get all settings by type (with pagination)
 * GET /api/config/settings/:type
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
const getSettingsByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const result = await settingsService.getSetttingsByTypeWithPagination(type, req.query);

  // Monolith returns { data: [...], meta: {...} } directly
  res.status(200).json(result);
});

/**
 * Get settings by type with pagination
 * GET /api/config/settings/:type/paginated
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
const getSettingsByTypeWithPagination = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const result = await settingsService.getSetttingsByTypeWithPagination(type, req.query);

  // Monolith returns { data: [...], meta: {...} } directly
  res.status(200).json(result);
});

/**
 * Get specific setting by ID
 * GET /api/config/settings/:type/:id
 * Matches monolith: Returns setting object directly
 */
const getSettingById = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  let setting;
  if (type === "email_templates") {
    setting = await settingsService.getEmailTemplateById(id);
    return res.status(200).json({
      success: true,
      template: setting,
      message: 'Email template retrieved successfully',
    });
  }
  else {
    setting = await settingsService.getSettingById(type, id);
  }
  // Monolith returns setting object directly (no wrapper)
  res.status(200).json(setting);

});

/**
 * Create or update setting
 * POST /api/config/settings/:type
 * PUT /api/config/settings/:type/:id
 * Matches monolith: Returns setting object directly
 */
const createOrUpdateSetting = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const setting = await settingsService.updateOrCreateSetting(type, req.body, id || null, req.user);

  // Monolith returns setting object directly (no wrapper)
  // 201 for create, 200 for update
  res.status(id ? 200 : 201).json(setting);
});


/**
 * Sync bidirectional relationship between email template and projects.
 * Ensures both sides (Settings.projects and Project.email_templates) stay in sync.
 */
async function syncTemplateProjects(templateId, newProjectIds, oldProjectIds = []) {
  const newSet = new Set((newProjectIds || []).map(String));
  const oldSet = new Set((oldProjectIds || []).map(String));

  const toAdd = [...newSet].filter(id => !oldSet.has(id));
  const toRemove = [...oldSet].filter(id => !newSet.has(id));

  if (toAdd.length > 0) {
    await Project.updateMany(
      { _id: { $in: toAdd } },
      { $addToSet: { email_templates: templateId } }
    );
  }

  if (toRemove.length > 0) {
    await Project.updateMany(
      { _id: { $in: toRemove } },
      { $pull: { email_templates: templateId } }
    );
  }
}

/**
 * Create a new email template
 */
async function createEmailTemplate(req, res) {
  try {
    const { name, subject, include_signature, category_id, signature_file_id, how_many_offers, gender_type } = req.body;
    const template_content = req.body.template_content ?? req.body.templateContent;
    let project_ids = req.body.project_ids;
    const { user } = req;
    const signatureFile = req.file;

    if (typeof project_ids === 'string') {
      try { project_ids = JSON.parse(project_ids); } catch { project_ids = project_ids.split(',').map(s => s.trim()).filter(Boolean); }
    }

    if (!name) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }

    if (!template_content) {
      return res.status(400).json({ success: false, error: 'Template content is required' });
    }

    if (!(await hasPermission(user.role, PERMISSIONS.SETTINGS_UPDATE))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to create email templates.',
      });
    }

    const existingTemplate = await Settings.findOne({ type: 'email_templates', name: name.trim() });
    if (existingTemplate) {
      return res.status(409).json({ success: false, error: 'A template with this name already exists' });
    }

    const rawContent = typeof template_content === 'string' ? template_content.trim() : String(template_content || '');
    const parsedHowMany = parseInt(how_many_offers, 10);
    const howManyOffers = !isNaN(parsedHowMany) && parsedHowMany >= 1 ? parsedHowMany : 1;
    const templateData = {
      type: 'email_templates',
      name: name.trim(),
      gender_type: gender_type || null,
      projects: Array.isArray(project_ids) ? project_ids : [],
      info: {
        template_content: normalizeEmailTemplateContent(rawContent),
        subject: subject != null ? String(subject).trim() : '',
        include_signature: include_signature === 'true' || include_signature === true,
        signature_file_id: signature_file_id || null,
        category_id: category_id || null,
        how_many_offers: howManyOffers,
        created_by: user._id,
        created_at: new Date(),
      },
    };

    if (signatureFile) {
      const signaturePath = 'storage/signatures/' + path.basename(signatureFile.path);
      templateData.info.signature_path = signaturePath;
    }

    const newTemplate = new Settings(templateData);
    await newTemplate.save();

    // Bidirectional sync: add this template to all selected projects
    if (Array.isArray(project_ids) && project_ids.length > 0) {
      await syncTemplateProjects(newTemplate._id, project_ids, []);
    }

    logger.info('Email template created successfully', {
      template_id: newTemplate._id,
      template_name: name,
      created_by: user._id,
      gender_type: gender_type || null,
      project_count: (project_ids || []).length,
    });

    res.status(201).json({
      success: true,
      template: {
        _id: newTemplate._id,
        name: newTemplate.name,
        template_content: newTemplate.info.template_content,
        subject: newTemplate.info.subject ?? '',
        include_signature: newTemplate.info.include_signature,
        has_signature_file: !!newTemplate.info.signature_file_id || !!newTemplate.info.signature_path,
        signature_file_id: newTemplate.info.signature_file_id || null,
        category_id: newTemplate.info.category_id || null,
        gender_type: newTemplate.gender_type || null,
        projects: newTemplate.projects || [],
        how_many_offers: newTemplate.info.how_many_offers ?? 1,
        created_at: newTemplate.createdAt,
      },
      message: 'Email template created successfully',
    });
  } catch (error) {
    logger.error('Error creating email template', {
      error: error.message,
      user_id: req.user?._id,
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Signature file size too large. Maximum 500KB allowed.' });
    }
    if (error.message.includes('Only JPEG and PNG')) {
      return res.status(400).json({ success: false, error: 'Only JPEG and PNG images are allowed for email signatures' });
    }

    res.status(500).json({ success: false, error: 'Internal server error while creating template' });
  }
}


/**
 * Delete setting
 * DELETE /api/config/settings/:type/:id
 * Matches monolith: Returns { message: "..." }
 */
const deleteSetting = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  await settingsService.deleteSetting(type, id, req.user);

  // Monolith returns { message: "..." }
  res.status(200).json({
    message: `${type} setting deleted successfully`
  });
});

/**
 * Bulk delete settings
 * DELETE /api/config/settings/:type/bulk
 * Matches monolith: Returns { message, deletedCount, deletedIds }
 */
const bulkDeleteSettings = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({
      error: 'ids array is required'
    });
  }

  let result;

  if (type === "email-templates") {
    result = await settingsService.bulkDeleteEmailTemplates(ids, req.user);
    return res.status(200).json(result);
  }
  else {
    result = await settingsService.bulkDeleteSettings(type, ids, req.user);
    return res.status(200).json(result);
  }

});

/**
 * Get all stages with their statuses
 * GET /api/config/stages
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
const getAllStages = asyncHandler(async (req, res) => {
  const result = await settingsService.getSetttingsByTypeWithPagination('stage', req.query);

  // Monolith returns { data: [...], meta: {...} }
  res.status(200).json(result);
});


/**
 * Update email template by ID
 */
async function updateEmailTemplate(req, res) {
  try {
    const { id } = req.params;
    const { name, subject, include_signature, category_id, signature_file_id, how_many_offers, gender_type } = req.body;
    const template_content = req.body.template_content ?? req.body.templateContent;
    let project_ids = req.body.project_ids;
    const { user } = req;
    const signatureFile = req.file;

    if (typeof project_ids === 'string') {
      try { project_ids = JSON.parse(project_ids); } catch { project_ids = project_ids.split(',').map(s => s.trim()).filter(Boolean); }
    }

    if (!(await hasPermission(user.role, PERMISSIONS.SETTINGS_UPDATE))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to update email templates.',
      });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID format' });
    }

    const template = await Settings.findOne({ _id: id, type: 'email_templates' });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Email template not found' });
    }

    if (name && name.trim() !== template.name) {
      const existingTemplate = await Settings.findOne({
        type: 'email_templates',
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingTemplate) {
        return res.status(409).json({ success: false, error: 'A template with this name already exists' });
      }
    }

    if (name && name.trim()) {
      template.name = name.trim();
    }
    if (template_content !== undefined && template_content !== null) {
      const rawContent = typeof template_content === 'string' ? template_content.trim() : String(template_content);
      template.info.template_content = normalizeEmailTemplateContent(rawContent);
      template.markModified('info');
    }
    if (subject !== undefined) {
      template.info.subject = subject != null ? String(subject).trim() : '';
      template.markModified('info');
    }
    if (include_signature !== undefined) {
      template.info.include_signature = include_signature === 'true' || include_signature === true;
      template.markModified('info');
    }
    if (category_id !== undefined) {
      template.info.category_id = category_id || null;
      template.markModified('info');
    }
    if (signature_file_id !== undefined) {
      template.info.signature_file_id = signature_file_id || null;
      template.markModified('info');
    }

    // Update gender_type
    if (gender_type !== undefined) {
      template.gender_type = gender_type || null;
    }

    // Update projects (bidirectional sync)
    const oldProjectIds = (template.projects || []).map(String);
    if (project_ids !== undefined) {
      const newProjectIds = Array.isArray(project_ids) ? project_ids : [];
      template.projects = newProjectIds;
      await syncTemplateProjects(template._id, newProjectIds, oldProjectIds);
    }

    // Handle how_many_offers (number of offers for template)
    if (how_many_offers !== undefined) {
      const parsed = parseInt(how_many_offers, 10);
      template.info.how_many_offers = !isNaN(parsed) && parsed >= 1 ? parsed : 1;
      template.markModified('info');
    }

    // Handle signature file upload (legacy support)
    if (signatureFile) {
      if (template.info.signature_path) {
        try {
          const relativePath = template.info.signature_path.replace(/^\//, '');
          const oldSignaturePath = storageConfig.getFilePath(relativePath);
          if (fs.existsSync(oldSignaturePath)) {
            fs.unlinkSync(oldSignaturePath);
          }
        } catch (deleteError) {
          logger.warn('Failed to delete old signature file', {
            error: deleteError.message,
            old_path: template.info.signature_path,
          });
        }
      }

      const signaturePath = 'storage/signatures/' + path.basename(signatureFile.path);
      template.info.signature_path = signaturePath;
      template.markModified('info');
    }

    template.info.updated_by = user._id;
    template.info.updated_at = new Date();
    template.markModified('info');

    const savedTemplate = await template.save();

    logger.info('Email template updated successfully', {
      template_id: id,
      template_name: template.name,
      updated_by: user._id,
      gender_type: savedTemplate.gender_type,
      project_count: (savedTemplate.projects || []).length,
    });

    const formattedTemplate = {
      _id: savedTemplate._id,
      name: savedTemplate.name,
      template_content: savedTemplate.info.template_content,
      subject: savedTemplate.info.subject ?? '',
      include_signature: savedTemplate.info.include_signature,
      has_signature_file: !!savedTemplate.info.signature_file_id || !!savedTemplate.info.signature_path,
      signature_file_id: savedTemplate.info.signature_file_id || null,
      category_id: savedTemplate.info.category_id || null,
      gender_type: savedTemplate.gender_type || null,
      projects: savedTemplate.projects || [],
      how_many_offers: savedTemplate.info.how_many_offers ?? 1,
      updated_at: savedTemplate.updatedAt,
    };

    res.status(200).json({
      success: true,
      template: formattedTemplate,
      message: 'Email template updated successfully',
    });
  } catch (error) {
    logger.error('Error updating email template', {
      error: error.message,
      template_id: req.params.id,
      user_id: req.user?._id,
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Signature file size too large. Maximum 500KB allowed.' });
    }
    if (error.message.includes('Only JPEG and PNG')) {
      return res.status(400).json({ success: false, error: 'Only JPEG and PNG images are allowed for email signatures' });
    }

    res.status(500).json({ success: false, error: 'Internal server error while updating template' });
  }
}

module.exports = {
  getSettingsByType,
  getSettingsByTypeWithPagination,
  getSettingById,
  createOrUpdateSetting,
  createEmailTemplate,
  updateEmailTemplate,
  deleteSetting,
  bulkDeleteSettings,
  getAllStages,
};


