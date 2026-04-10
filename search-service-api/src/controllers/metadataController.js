/**
 * Metadata Controller
 * 
 * Provides field metadata for models to enable dynamic filter/group UIs
 * 
 * @module controllers/metadataController
 */

const mongoose = require('mongoose');
const queryEngine = require('../services/queryEngine');
const logger = require('../utils/logger');

/**
 * Model name aliases for URL-friendly access
 * Maps short/friendly names to actual model names
 */
const MODEL_ALIASES = {
  'entries': 'CashflowEntry',
  'cashflowentry': 'CashflowEntry',
  'cashflow-entry': 'CashflowEntry',
  'transactions': 'CashflowTransaction',
  'cashflowtransaction': 'CashflowTransaction',
  'cashflow-transaction': 'CashflowTransaction',
  'closedlead': 'ClosedLead',
  'closed-lead': 'ClosedLead',
  'closed-leads': 'ClosedLead',
  'closedleads': 'ClosedLead',
};

/**
 * Resolve model name from alias or return original
 * @param {string} modelName - Model name or alias
 * @returns {string} - Resolved model name
 */
const resolveModelName = (modelName) => {
  // Check aliases (case-insensitive)
  const lowercaseName = modelName.toLowerCase();
  if (MODEL_ALIASES[lowercaseName]) {
    return MODEL_ALIASES[lowercaseName];
  }
  // Return original if no alias found
  return modelName;
};

/**
 * Get all fields for a model with their metadata
 * 
 * @route GET /api/search/fields/:model
 * @access Private
 */
exports.getFields = async (req, res) => {
  try {
    const { model: rawModel } = req.params;
    const model = resolveModelName(rawModel);
    
    const Model = queryEngine.getModel(model);
    if (!Model) {
      return res.status(404).json({
        success: false,
        message: `Model ${model} not found`,
        availableModels: getAvailableModels()
      });
    }
    
    const fields = extractFieldMetadata(Model, model);
    if (model === 'ClosedLead') {
      applyClosedLeadSourceFieldMetadata(fields);
    }

    // For User model: apply ref overrides and add missing fields
    if (model === 'User') {
      applyUserFieldOverrides(fields);
    }
    
    // Generate related field options
    const relatedFieldOptions = generateRelatedFieldOptions(fields, model);
    
    // Convert related fields to object format for consistency
    const relatedFields = {};
    relatedFieldOptions.forEach(opt => {
      relatedFields[opt.field] = {
        name: opt.field,
        label: opt.label,
        type: opt.type,
        ref: opt.ref,
        parentField: opt.parentField,
        parentLabel: opt.parentLabel,
        isRelatedField: true,
        filterable: opt.filterable,
        groupable: opt.groupable,
        operators: opt.operators,
      };
    });
    
    res.status(200).json({
      success: true,
      model,
      fields,
      relatedFields,
      meta: {
        totalFields: Object.keys(fields).length,
        filterableFields: Object.values(fields).filter(f => f.filterable).length,
        groupableFields: Object.values(fields).filter(f => f.groupable).length,
        relationFields: Object.values(fields).filter(f => f.type === 'reference').length,
        relatedFieldsCount: Object.keys(relatedFields).length,
        relatedGroupableFields: relatedFieldOptions.filter(f => f.groupable).length,
      }
    });
    
  } catch (error) {
    logger.error('Error getting field metadata:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get filter and grouping options for a model
 * Returns structured data for building dynamic UIs
 * 
 * @route GET /api/search/options/:model
 * @access Private
 */
exports.getOptions = async (req, res) => {
  try {
    const { model: rawModel } = req.params;
    const model = resolveModelName(rawModel);
    
    const Model = queryEngine.getModel(model);
    if (!Model) {
      return res.status(404).json({
        success: false,
        message: `Model ${model} not found`,
        availableModels: getAvailableModels()
      });
    }
    
    const fields = extractFieldMetadata(Model, model);
    if (model === 'ClosedLead') {
      applyClosedLeadSourceFieldMetadata(fields);
    }

    // Generate related field options for cross-model grouping/filtering
    const relatedFieldOptions = generateRelatedFieldOptions(fields, model);

    // Attach available values for dropdown fields based on model
    let valueOptions = {};
    if (model === 'Lead') {
      valueOptions = await buildLeadValueOptions(Model);
    } else if (model === 'Offer') {
      valueOptions = await buildOfferValueOptions();
    } else if (model === 'Opening' || model === 'Confirmation' || model === 'PaymentVoucher') {
      valueOptions = await buildOfferValueOptions(); // Same dropdowns as Offer
    } else if (model === 'Todo' || model === 'Appointment') {
      valueOptions = await buildTodoAppointmentValueOptions();
    } else if (model === 'Reclamation') {
      valueOptions = await buildReclamationValueOptions();
    } else if (model === 'CashflowEntry') {
      valueOptions = await buildCashflowEntryValueOptions();
    } else if (model === 'CashflowTransaction') {
      valueOptions = await buildCashflowTransactionValueOptions();
    } else if (model === 'Team') {
      valueOptions = await buildTeamValueOptions();
    } else if (model === 'User') {
      valueOptions = await buildUserValueOptions(Model);
    } else if (model === 'ClosedLead') {
      valueOptions = await buildClosedLeadValueOptions(Model);
    }
    
    // For User model: apply field ref overrides and inject missing fields
    if (model === 'User') {
      applyUserFieldOverrides(fields);
    }
    
    // Fields that are user input (string) - no dropdown values
    const USER_INPUT_NO_VALUES = { Lead: ['contact_name'] };

    // Organize fields by category - Direct fields
    const directFilterOptions = Object.entries(fields)
      .filter(([_, meta]) => meta.filterable)
      .map(([name, meta]) => {
        const option = {
          field: name,
          label: meta.label,
          type: meta.type,
          operators: meta.operators,
          ref: meta.ref || null,
          example: meta.example,
          isRelatedField: false,
        };

        // Attach precomputed values when available (skip user input fields)
        const shouldExcludeValues = USER_INPUT_NO_VALUES[model]?.includes(name);
        if (valueOptions[name] && !shouldExcludeValues) {
          option.values = valueOptions[name];
        }
        // Ensure contact_name is string type, no values
        if (model === 'Lead' && name === 'contact_name') {
          option.type = 'string';
          delete option.values;
        }

        return option;
      });
    
    // Add related field filter options
    const relatedFilterOptions = relatedFieldOptions
      .filter(opt => opt.filterable)
      .map(opt => {
        const option = {
          field: opt.field,
          label: opt.label,
          type: opt.type,
          operators: opt.operators,
          ref: opt.ref,
          parentField: opt.parentField,
          parentLabel: opt.parentLabel,
          isRelatedField: true,
        };
        
        // Check if we have values for the related field (skip user input fields - string type, no dropdown)
        const stringUserInputFields = ['lead_id.contact_name'];
        if (valueOptions[opt.field] && !stringUserInputFields.includes(opt.field)) {
          option.values = valueOptions[opt.field];
        }
        
        return option;
      });
    
    // Ensure Lead ID, Lead Mail, Lead Phone always appear for Offer (user input fields, no dropdown)
    const LEAD_USER_INPUT_FIELDS = [
      { field: 'lead_id._id', label: 'Lead ID', type: 'string', parentField: 'lead_id', parentLabel: 'Lead' },
      { field: 'lead_id.lead_source_no', label: 'Lead Source No', type: 'string', parentField: 'lead_id', parentLabel: 'Lead' },
      { field: 'lead_id.contact_name', label: 'Contact Name', type: 'string', parentField: 'lead_id', parentLabel: 'Lead' },
      { field: 'lead_id.email_from', label: 'Lead Mail', type: 'string', parentField: 'lead_id', parentLabel: 'Lead' },
      { field: 'lead_id.phone', label: 'Lead Phone', type: 'string', parentField: 'lead_id', parentLabel: 'Lead' },
    ];
    if (model === 'Offer') {
      const relatedFilterOptionsSet = new Set(relatedFilterOptions.map(o => o.field));
      LEAD_USER_INPUT_FIELDS.forEach(f => {
        if (!relatedFilterOptionsSet.has(f.field)) {
          relatedFilterOptions.push({
            field: f.field,
            label: f.label,
            type: f.type,
            operators: getOperatorsForType(f.type),
            ref: null,
            parentField: f.parentField,
            parentLabel: f.parentLabel,
            isRelatedField: true,
          });
        }
      });
    }

    // Priority fields for each model (shown at top in order)
    // For groupOptions, we want: Agent, Status, Stage, Project first
    const PRIORITY_FIELDS = {
      Lead: ['user_id', 'status_id', 'stage_id', 'source_id', 'team_id', 'createdAt', 'updatedAt'],
      Offer: ['agent_id', 'lead_id.status_id', 'lead_id.stage_id', 'lead_id._id', 'lead_id.lead_source_no', 'lead_id.contact_name', 'lead_id.email_from', 'lead_id.phone', 'current_stage', 'bank_id', 'project_id', 'createdAt', 'updatedAt'],
      Reclamation: ['agent_id', 'project_id', 'lead_id', 'status', 'reason', 'createdAt', 'updatedAt'],
      Team: ['name', 'agent_id', 'mailserver_id', 'voipserver_id', 'pdf_templates', 'active', 'createdAt', 'updatedAt'],
      User: ['login', 'role', 'email', 'info.project_id', 'primary_office', 'mail_servers', 'active', 'createdAt', 'updatedAt'],
      ClosedLead: ['closed_project_id', 'user_id', 'status', 'stage', 'closeLeadStatus', 'current_status', 'source_id', 'team_id', 'source_agent', 'source_project', 'closed_by_user_id', 'closed_at', 'createdAt'],
    };
    
    // Priority fields specifically for groupOptions (in exact order)
    const GROUP_PRIORITY_FIELDS = {
      Lead: ['user_id', 'status_id', 'stage_id', 'team_id', 'transferred_lead'],
      Offer: ['agent_id', 'lead_id.status_id', 'lead_id.stage_id', 'project_id', 'lead_id._id', 'lead_id.lead_source_no', 'lead_id.contact_name', 'lead_id.email_from', 'lead_id.phone', 'bank_id', 'bank_id.nickName', 'payment_terms'],
      Opening: ['agent_id', 'lead_id.status_id', 'lead_id.stage_id', 'project_id', 'lead_id._id', 'lead_id.lead_source_no', 'lead_id.contact_name', 'lead_id.email_from', 'lead_id.phone', 'offer_id.bank_id', 'offer_id.bank_id.nickName', 'offer_id.payment_terms'],
      Reclamation: ['agent_id', 'project_id', 'status', 'lead_id'],
      Team: ['name', 'agent_id', 'mailserver_id', 'voipserver_id', 'pdf_templates'],
      User: ['login', 'role', 'email', 'info.project_id', 'primary_office', 'mail_servers'],
      ClosedLead: ['closed_project_id', 'user_id', 'status', 'stage', 'closeLeadStatus', 'current_status', 'source_id', 'team_id', 'source_agent', 'source_project', 'closed_by_user_id', 'closed_at'],
    };
    
    const priorityFields = PRIORITY_FIELDS[model] || [];
    const groupPriorityFields = GROUP_PRIORITY_FIELDS[model] || [];
    
    // Helper function to get priority index (lower = higher priority)
    const getPriorityIndex = (field) => {
      const index = priorityFields.indexOf(field);
      return index === -1 ? 999 : index; // Non-priority fields get 999
    };
    
    // Helper function to get group priority index
    const getGroupPriorityIndex = (field) => {
      // Extract base field name (remove granularity suffix for date fields)
      const baseField = field.split(':')[0];
      const index = groupPriorityFields.indexOf(baseField);
      return index === -1 ? 999 : index; // Non-priority fields get 999
    };
    
    // Combine and sort filter options
    const filterOptions = [...directFilterOptions, ...relatedFilterOptions]
      .sort((a, b) => {
        const aPriority = getPriorityIndex(a.field);
        const bPriority = getPriorityIndex(b.field);
        
        // Priority fields come first, in their defined order
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Non-priority: direct fields first, then related fields
        if (a.isRelatedField !== b.isRelatedField) {
          return a.isRelatedField ? 1 : -1;
        }
        return a.label.localeCompare(b.label);
      });
    
    // Direct groupable fields
    const directGroupOptions = [];
    const dateFieldsMap = new Map(); // Map to group date fields by baseField
    
    // Date granularity options
    const DATE_GRANULARITIES = [
      { suffix: 'day', label: 'Day' },
      { suffix: 'week', label: 'Week' },
      { suffix: 'month', label: 'Month' },
      { suffix: 'year', label: 'Year' },
    ];
    
    Object.entries(fields)
      .filter(([_, meta]) => meta.groupable)
      .forEach(([name, meta]) => {
        // For date fields, collect them for grouping
        if (meta.type === 'date') {
          if (!dateFieldsMap.has(name)) {
            dateFieldsMap.set(name, {
              field: name,
              label: meta.label,
              type: 'date',
              granularities: DATE_GRANULARITIES.map(g => ({
                field: `${name}:${g.suffix}`,
                label: `${meta.label} (${g.label})`,
                type: 'date',
                suffix: g.suffix,
                granularity: g.suffix,
                baseField: name,
              })),
              baseField: name,
              ref: null,
              isRelatedField: false,
            });
          }
        } else {
          // Non-date fields remain as-is
          const option = {
            field: name,
            label: meta.label,
            type: meta.type,
            ref: meta.ref || null,
            isRelatedField: false,
          };

          if (valueOptions[name]) {
            option.values = valueOptions[name];
          }

          directGroupOptions.push(option);
        }
      });
    
    // Add related field group options
    const relatedGroupOptions = [];
    const relatedDateFieldsMap = new Map(); // Map to group related date fields
    
    relatedFieldOptions
      .filter(opt => opt.groupable)
      .forEach(opt => {
        // For date fields in related models, collect them for grouping
        if (opt.type === 'date') {
          if (!relatedDateFieldsMap.has(opt.field)) {
            relatedDateFieldsMap.set(opt.field, {
              field: opt.field,
              label: opt.label,
              type: 'date',
              granularities: DATE_GRANULARITIES.map(g => ({
                field: `${opt.field}:${g.suffix}`,
                label: `${opt.label} (${g.label})`,
                type: 'date',
                suffix: g.suffix,
                granularity: g.suffix,
                baseField: opt.field,
                parentField: opt.parentField,
                parentLabel: opt.parentLabel,
              })),
              baseField: opt.field,
              ref: null,
              parentField: opt.parentField,
              parentLabel: opt.parentLabel,
              isRelatedField: true,
            });
          }
        } else {
          // Non-date fields remain as-is
          const option = {
            field: opt.field,
            label: opt.label,
            type: opt.type,
            ref: opt.ref,
            parentField: opt.parentField,
            parentLabel: opt.parentLabel,
            isRelatedField: true,
          };
          
          // Attach precomputed values when available (same as filter options)
          if (valueOptions[opt.field]) {
            option.values = valueOptions[opt.field];
          }
          
          relatedGroupOptions.push(option);
        }
      });

    // Ensure Lead ID, Lead Mail, Lead Phone in groupOptions for Offer (if missing)
    if (model === 'Offer') {
      const relatedGroupFieldsSet = new Set(relatedGroupOptions.map(o => o.field));
      LEAD_USER_INPUT_FIELDS.forEach(f => {
        if (!relatedGroupFieldsSet.has(f.field)) {
          relatedGroupOptions.push({
            field: f.field,
            label: f.label,
            type: f.type,
            ref: null,
            parentField: f.parentField,
            parentLabel: f.parentLabel,
            isRelatedField: true,
          });
        }
      });
    }
    
    // Add special "Lead Transfer" grouping options for Lead model
    // Group it as a date-like field with granularities array
    if (model === 'Lead') {
      dateFieldsMap.set('lead_transfer', {
        field: 'lead_transfer',
        label: 'Lead Transfer',
        type: 'special',
        granularities: DATE_GRANULARITIES.map(g => ({
          field: `lead_transfer:${g.suffix}`,
          label: `Lead Transfer (${g.label})`,
          type: 'special',
          suffix: g.suffix,
          granularity: g.suffix,
          baseField: 'lead_transfer',
          isSpecialGrouping: true,
          description: `Group leads by transfer activity (Agent → Agent on ${g.label})`,
        })),
        baseField: 'lead_transfer',
        ref: null,
        isRelatedField: false,
        isSpecialGrouping: true,
        description: 'Group leads by transfer activity (Agent → Agent)',
      });

      // Transfer Lead: Fresh vs Transferred (virtual field; uses prev_team_id in search)
      directGroupOptions.push({
        field: 'transferred_lead',
        label: 'Transfer Lead',
        type: 'special',
        ref: null,
        isRelatedField: false,
        isSpecialGrouping: true,
        description: 'Group leads into Fresh (both prev_team_id and prev_user_id are null) and Transferred (either has data)',
      });
    }
    
    // Convert date fields maps to arrays and add to group options
    const dateGroupOptions = Array.from(dateFieldsMap.values());
    const relatedDateGroupOptions = Array.from(relatedDateFieldsMap.values());
    
    // Combine all group options
    const allGroupOptions = [
      ...directGroupOptions,
      ...dateGroupOptions,
      ...relatedGroupOptions,
      ...relatedDateGroupOptions
    ];
    
    // Sort group options with priority: Agent, Status, Stage, Project first
    const groupOptions = allGroupOptions.sort((a, b) => {
      // Get base field name (remove granularity suffix if present)
      const aBaseField = a.baseField || a.field.split(':')[0];
      const bBaseField = b.baseField || b.field.split(':')[0];
      
      const aPriority = getGroupPriorityIndex(aBaseField);
      const bPriority = getGroupPriorityIndex(bBaseField);
      
      // Priority fields come first, in their defined order
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Non-priority: direct fields first, then related fields grouped by parent
      if (a.isRelatedField !== b.isRelatedField) {
        return a.isRelatedField ? 1 : -1;
      }
      if (a.isRelatedField && b.isRelatedField) {
        // Group related fields by parent, then by label
        if (a.parentField !== b.parentField) {
          return a.parentField.localeCompare(b.parentField);
        }
      }
      return a.label.localeCompare(b.label);
    });

    // Offer-only response label renames (display only)
    const offerResponseMap = (opts) => opts.map((opt) => {
      if (model !== 'Offer') return opt;
      const o = { ...opt };
      if (opt.field === 'current_stage') {
        o.label = 'Stage';
      } else if (opt.field === 'status') {
        o.label = 'Sent status';
      }
      return o;
    });
    const finalFilterOptions = offerResponseMap(filterOptions);
    const finalGroupOptions = offerResponseMap(groupOptions);

    res.status(200).json({
      success: true,
      model,
      filterOptions: finalFilterOptions,
      groupOptions: finalGroupOptions,
      availableOperators: getAllOperators()
    });
    
  } catch (error) {
    logger.error('Error getting options:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Build value lists for important Lead fields so that the client can render
 * dropdowns similar to the legacy filter options (see test.json).
 *
   * - For "with ID" fields, values are `{ _id, value }`
   * - For fields that don't have a separate ID but are not simple booleans,
   *   values are also `{ _id, value }` where `_id` is the raw value.
   * - For boolean flags, values remain `[true, false]`.
 */
async function buildLeadValueOptions(LeadModel) {
  const valuesByField = {};

  try {
    const Lead = LeadModel;

    // --- WITH ID (or ID-like) ---
    // use_status: string field, but we still expose an _id equal to the value
    const useStatuses = await Lead.distinct('use_status', {
      use_status: { $ne: null, $exists: true },
    });
    valuesByField.use_status = useStatuses
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => ({ _id: v, value: v }));

    // project -> team_id (Team)
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField.team_id = projects.map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // agent -> user_id (User)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      valuesByField.user_id = agents.map((u) => {
        // User model only has 'login' field, not first_name/last_name
        const label = u.login || 'Unknown User';
        return {
          _id: u._id.toString(),
          value: label,
        };
      });
    }

    // source -> source_id (Source)
    if (mongoose.models.Source) {
      const Source = mongoose.models.Source;
      const sources = await Source.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField.source_id = sources.map((s) => ({
        _id: s._id.toString(),
        value: s.name || 'Unknown Source',
      }));
    }

    // reclamation_status: string field, treated like use_status
    const reclamationStatuses = await Lead.distinct('reclamation_status', {
      reclamation_status: { $ne: null, $exists: true },
    });
    valuesByField.reclamation_status = reclamationStatuses
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => ({ _id: v, value: v }));

    // stage/status via Settings (stage documents and nested statuses)
    const Settings = mongoose.models.Settings;
    if (Settings) {
      const stages = await Settings.find({ type: 'stage' })
        .select('_id name info.statuses')
        .lean();

      // stage_id: one row per stage document
      valuesByField.stage_id = stages.map((st) => ({
        _id: st._id.toString(),
        value: st.name || 'Unknown Stage',
      }));

      // status_id: flatten allowed statuses from all stages
      const statusMap = new Map();
      stages.forEach((stageDoc) => {
        const statuses = stageDoc.info && Array.isArray(stageDoc.info.statuses)
          ? stageDoc.info.statuses
          : [];

        statuses.forEach((status) => {
          if (!status || status.allowed === false) return;

          const id =
            (status._id && status._id.toString()) ||
            (status.id && mongoose.Types.ObjectId.isValid(status.id)
              ? status.id
              : null);
          if (!id) return;

          if (!statusMap.has(id)) {
            statusMap.set(id, {
              _id: id,
              value: status.name || 'Unknown Status',
            });
          }
        });
      });

      // Supplement: include status_ids from actual leads that are missing from Settings
      // (e.g. "New" status may exist in leads but not be in any stage's allowed statuses)
      try {
        const leadStatuses = await Lead.aggregate([
          { $match: { status_id: { $exists: true, $ne: null } } },
          { $group: { _id: '$status_id', value: { $first: '$status' } } },
        ]);
        leadStatuses.forEach((item) => {
          const idStr = item._id && item._id.toString ? item._id.toString() : String(item._id);
          if (!statusMap.has(idStr)) {
            statusMap.set(idStr, {
              _id: idStr,
              value: (item.value && String(item.value).trim()) || 'Unknown Status',
            });
          }
        });
      } catch (supplementErr) {
        logger.warn('Could not supplement status_id from Lead documents:', supplementErr.message);
      }

      valuesByField.status_id = Array.from(statusMap.values());
    }

    // --- WITHOUT _id ---
    // duplicate_status: numeric, typically small set like [0,1,2] – expose as {_id, value}
    const duplicateStatuses = await Lead.distinct('duplicate_status');
    valuesByField.duplicate_status = duplicateStatuses
      .filter((v) => v !== null && v !== undefined)
      .map((v) => ({ _id: v, value: v }));

    // Booleans: actual schema fields and computed fields
    // Using {_id, value} format for consistency with other fields
    const booleanFields = [
      'active', 
      'checked', 
      'has_todo', 
      'has_extra_todo', 
      'has_assigned_todo', 
      'is_favourite'
    ];
    booleanFields.forEach((field) => {
      valuesByField[field] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' }
      ];
    });

    // Alias values for related reference fields using the same lists we already built
    // previous project / agent
    if (valuesByField.team_id) {
      valuesByField.prev_team_id = [...valuesByField.team_id];
      // source_project is the actual schema field
      valuesByField.source_project = [...valuesByField.team_id];
    }
    if (valuesByField.user_id) {
      valuesByField.prev_user_id = [...valuesByField.user_id];
      // source_agent is the actual schema field
      valuesByField.source_agent = [...valuesByField.user_id];
      valuesByField.closed_by_user_id = [...valuesByField.user_id];
    }
  } catch (error) {
    logger.error('Error building Lead value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for ClosedLead model fields.
 * Includes all Lead-equivalent options plus closure-specific fields.
 */
async function buildClosedLeadValueOptions(ClosedLeadModel) {
  const valuesByField = {};

  try {
    const ClosedLead = ClosedLeadModel;

    // --- Use Status (string enum) ---
    const useStatuses = await ClosedLead.distinct('use_status', {
      use_status: { $ne: null, $exists: true },
    });
    valuesByField.use_status = useStatuses
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => ({ _id: v, value: v }));

    // --- Close Lead Status (string enum: fresh / revert / assigned) ---
    valuesByField.closeLeadStatus = [
      { _id: 'fresh', value: 'Fresh' },
      { _id: 'revert', value: 'Revert' },
      { _id: 'assigned', value: 'Assigned' },
    ];

    // --- Closure Reason ---
    const closureReasons = await ClosedLead.distinct('closure_reason', {
      closure_reason: { $ne: null, $exists: true },
    });
    valuesByField.closure_reason = closureReasons
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => ({ _id: v, value: v }));

    // --- Project (team_id -> Team) ---
    const TeamOrProject = mongoose.models.Team || mongoose.models.Project;
    if (TeamOrProject) {
      const projects = await TeamOrProject.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
      const projectOptions = projects.map(p => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
      valuesByField.team_id = projectOptions;
      valuesByField.closed_project_id = [...projectOptions];
      valuesByField.prev_team_id = [...projectOptions];
      valuesByField.source_team_id = [...projectOptions];
      valuesByField.reverted_to_project_id = [...projectOptions];
      valuesByField.assigned_project_id = [...projectOptions];
    } else {
      const projects = await fetchFromCollection('teams', { active: { $ne: false } }, { _id: 1, name: 1 }, { name: 1 });
      if (projects.length > 0) {
        const projectOptions = projects.map(p => ({
          _id: (p._id || p.id)?.toString?.() || String(p._id),
          value: p.name || 'Unknown Project',
        }));
        valuesByField.team_id = projectOptions;
        valuesByField.closed_project_id = [...projectOptions];
        valuesByField.prev_team_id = [...projectOptions];
        valuesByField.source_team_id = [...projectOptions];
      }
    }

    // --- Agent (user_id -> User) ---
    let userOptions = [];
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();
      userOptions = agents.map(u => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
    } else {
      const agents = await fetchFromCollection(
        'users',
        { active: { $ne: false }, role: { $in: ['Agent', 'Admin', 'Manager'] } },
        { _id: 1, login: 1 },
        { login: 1 }
      );
      userOptions = agents.map(u => ({
        _id: (u._id || u.id)?.toString?.() || String(u._id),
        value: u.login || 'Unknown User',
      }));
    }
    if (userOptions.length > 0) {
      valuesByField.user_id = userOptions;
      valuesByField.closed_by_user_id = [...userOptions];
      valuesByField.reverted_by_user_id = [...userOptions];
      valuesByField.assigned_by_user_id = [...userOptions];
      valuesByField.assigned_agent_id = [...userOptions];
      valuesByField.prev_user_id = [...userOptions];
      valuesByField.source_user_id = [...userOptions];
      valuesByField.original_closed_by_user_id = [...userOptions];
    }

    // --- Source (source_id -> Source) ---
    if (mongoose.models.Source) {
      const Source = mongoose.models.Source;
      const sources = await Source.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
      valuesByField.source_id = sources.map(s => ({
        _id: s._id.toString(),
        value: s.name || 'Unknown Source',
      }));
    } else {
      const sources = await fetchFromCollection('sources', { active: { $ne: false } }, { _id: 1, name: 1 }, { name: 1 });
      if (sources.length > 0) {
        valuesByField.source_id = sources.map(s => ({
          _id: (s._id || s.id)?.toString?.() || String(s._id),
          value: s.name || 'Unknown Source',
        }));
      }
    }

    // --- Stage / Status from Settings ---
    const Settings = mongoose.models.Settings;
    if (Settings) {
      const stages = await Settings.find({ type: 'stage' })
        .select('_id name info.statuses')
        .lean();

      valuesByField.stage_id = stages.map(st => ({
        _id: st._id.toString(),
        value: st.name || 'Unknown Stage',
      }));

      const statusMap = new Map();
      stages.forEach(stageDoc => {
        const statuses = stageDoc.info && Array.isArray(stageDoc.info.statuses)
          ? stageDoc.info.statuses : [];
        statuses.forEach(status => {
          if (!status || status.allowed === false) return;
          const id = (status._id && status._id.toString()) ||
            (status.id && mongoose.Types.ObjectId.isValid(status.id) ? status.id : null);
          if (!id) return;
          if (!statusMap.has(id)) {
            statusMap.set(id, { _id: id, value: status.name || 'Unknown Status' });
          }
        });
      });
      valuesByField.status_id = Array.from(statusMap.values());
      valuesByField.current_status = Array.from(statusMap.values());
    } else {
      const settings = await fetchFromCollection('settings', { type: 'stage' }, { _id: 1, name: 1, info: 1 }, { name: 1 });
      if (settings.length > 0) {
        valuesByField.stage_id = settings.map(st => ({
          _id: (st._id || st.id)?.toString?.() || String(st._id),
          value: st.name || 'Unknown Stage',
        }));
        const statusMap = new Map();
        settings.forEach(stageDoc => {
          const statuses = stageDoc.info?.statuses || [];
          statuses.forEach(s => {
            if (s && s._id) statusMap.set(s._id.toString(), { _id: s._id.toString(), value: s.name || 'Unknown' });
          });
        });
        if (statusMap.size > 0) {
          valuesByField.status_id = Array.from(statusMap.values());
          valuesByField.current_status = Array.from(statusMap.values());
        }
      }
    }

    // --- Reclamation Status ---
    const reclamationStatuses = await ClosedLead.distinct('reclamation_status', {
      reclamation_status: { $ne: null, $exists: true },
    });
    valuesByField.reclamation_status = reclamationStatuses
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => ({ _id: v, value: v }));

    // --- Duplicate Status ---
    const duplicateStatuses = await ClosedLead.distinct('duplicate_status');
    valuesByField.duplicate_status = duplicateStatuses
      .filter(v => v !== null && v !== undefined)
      .map(v => ({ _id: v, value: v }));

    // --- Boolean fields ---
    const booleanFields = ['active', 'checked', 'is_reverted'];
    booleanFields.forEach(field => {
      valuesByField[field] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' },
      ];
    });

    // Same shape as Lead metadata: Source Project / Source Agent (options mirror source_team_id / source_user_id)
    if (valuesByField.source_team_id) {
      valuesByField.source_project = [...valuesByField.source_team_id];
    }
    if (valuesByField.source_user_id) {
      valuesByField.source_agent = [...valuesByField.source_user_id];
    }

  } catch (error) {
    logger.error('Error building ClosedLead value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for Offer model fields (also used by Opening, Confirmation, PaymentVoucher)
 * Provides dropdown values for project, agent, bank, etc.
 */
async function buildOfferValueOptions() {
  const valuesByField = {};

  try {
    // Project -> project_id (Team model)
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField.project_id = projects.map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // Agent -> agent_id (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      valuesByField.agent_id = agents.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
      
      // Also use for created_by and other user reference fields
      valuesByField.created_by = [...valuesByField.agent_id];
      valuesByField['handover_metadata.original_agent_id'] = [...valuesByField.agent_id];
      valuesByField['pending_transfer.target_agent_id'] = [...valuesByField.agent_id];
      valuesByField['progression.opening.completed_by'] = [...valuesByField.agent_id];
      valuesByField['progression.confirmation.completed_by'] = [...valuesByField.agent_id];
      valuesByField['progression.payment.completed_by'] = [...valuesByField.agent_id];
      valuesByField['progression.netto1.completed_by'] = [...valuesByField.agent_id];
      valuesByField['progression.netto2.completed_by'] = [...valuesByField.agent_id];
      valuesByField['progression.lost.marked_by'] = [...valuesByField.agent_id];
    }

    // Bank -> bank_id (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();

      valuesByField.bank_id = banks.map((b) => ({
        _id: b._id.toString(),
        value: b.nickName || b.name || 'Unknown Bank',
      }));

      // Bank Nick Name: reference type with dropdown (same bank options as bank_id)
      valuesByField['bank_id.nickName'] = [...valuesByField.bank_id];
    }

    // Lead -> lead_id (Lead model) - for filtering offers by lead
    if (mongoose.models.Lead) {
      const Lead = mongoose.models.Lead;
      // Only fetch recent/active leads to avoid huge lists
      const leads = await Lead.find({ active: true })
        .select('_id contact_name lead_source_no')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      valuesByField.lead_id = leads.map((l) => ({
        _id: l._id.toString(),
        value: l.contact_name || l.lead_source_no || 'Unknown Lead',
      }));
    }

    // Payment Terms and Bonus Amount from Settings
    if (mongoose.models.Settings) {
      const Settings = mongoose.models.Settings;
      
      // Payment terms (Month) - reference type, needs options for dropdown
      let paymentTerms = await Settings.find({ type: 'payment_terms' })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      // Fallback: fetch from settings collection if model returns empty
      if (!paymentTerms || paymentTerms.length === 0) {
        paymentTerms = await fetchFromCollection(
          'settings',
          { type: 'payment_terms' },
          { _id: 1, name: 1 },
          { name: 1 }
        );
      }

      valuesByField.payment_terms = (paymentTerms || []).map((pt) => ({
        _id: (pt._id || pt.id)?.toString?.() || String(pt._id),
        value: pt.name || 'Unknown',
      }));

      // Bonus amounts
      const bonusAmounts = await Settings.find({ type: 'bonus_amount' })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField.bonus_amount = bonusAmounts.map((ba) => ({
        _id: ba._id.toString(),
        value: ba.name || 'Unknown',
      }));
    }

    // Current stage options (string enum values - must match Offer model enum)
    valuesByField.current_stage = [
      { _id: 'offer', value: 'Offer' },
      { _id: 'call_1', value: 'Call 1' },
      { _id: 'call_2', value: 'Call 2' },
      { _id: 'call_3', value: 'Call 3' },
      { _id: 'call_4', value: 'Call 4' },
      { _id: 'opening', value: 'Opening' },
      { _id: 'confirmation', value: 'Confirmation' },
      { _id: 'payment', value: 'Payment' },
      { _id: 'netto1', value: 'Netto 1' },
      { _id: 'netto2', value: 'Netto 2' },
      { _id: 'lost', value: 'Lost' },
      { _id: 'out', value: 'Out' },
    ];

    // =====================================================
    // RELATED FIELD VALUES (for cross-model filtering/grouping)
    // These are prefixed with parent field path for clarity
    // =====================================================
    
    // Lead's related fields (for Offer -> Lead lookups)
    if (mongoose.models.Lead) {
      const Lead = mongoose.models.Lead;
      
      // Lead's Status (lead_id.status_id)
      if (mongoose.models.Settings) {
        const Settings = mongoose.models.Settings;
        const stages = await Settings.find({ type: 'stage' })
          .select('_id name info.statuses')
          .lean();

        // Lead's Stage
        valuesByField['lead_id.stage_id'] = stages.map((st) => ({
          _id: st._id.toString(),
          value: st.name || 'Unknown Stage',
        }));

        // Lead's Status (flatten from stages)
        const statusMap = new Map();
        stages.forEach((stageDoc) => {
          const statuses = stageDoc.info && Array.isArray(stageDoc.info.statuses)
            ? stageDoc.info.statuses
            : [];

          statuses.forEach((status) => {
            if (!status || status.allowed === false) return;
            const id =
              (status._id && status._id.toString()) ||
              (status.id && mongoose.Types.ObjectId.isValid(status.id)
                ? status.id
                : null);
            if (!id) return;
            if (!statusMap.has(id)) {
              statusMap.set(id, {
                _id: id,
                value: status.name || 'Unknown Status',
              });
            }
          });
        });

        // Supplement: include status_ids from actual leads missing from Settings
        try {
          const leadStatuses = await Lead.aggregate([
            { $match: { status_id: { $exists: true, $ne: null } } },
            { $group: { _id: '$status_id', value: { $first: '$status' } } },
          ]);
          leadStatuses.forEach((item) => {
            const idStr = item._id && item._id.toString ? item._id.toString() : String(item._id);
            if (!statusMap.has(idStr)) {
              statusMap.set(idStr, {
                _id: idStr,
                value: (item.value && String(item.value).trim()) || 'Unknown Status',
              });
            }
          });
        } catch (supplementErr) {
          logger.warn('Could not supplement lead_id.status_id from Lead documents:', supplementErr.message);
        }

        valuesByField['lead_id.status_id'] = Array.from(statusMap.values());
      }

      // Lead's Agent (lead_id.user_id)
      if (valuesByField.agent_id) {
        valuesByField['lead_id.user_id'] = [...valuesByField.agent_id];
      }

      // Lead's Project (lead_id.team_id)
      if (valuesByField.project_id) {
        valuesByField['lead_id.team_id'] = [...valuesByField.project_id];
      }

      // Lead's Source (lead_id.source_id)
      if (mongoose.models.Source) {
        const Source = mongoose.models.Source;
        const sources = await Source.find({ active: { $ne: false } })
          .select('_id name')
          .sort({ name: 1 })
          .lean();

        valuesByField['lead_id.source_id'] = sources.map((s) => ({
          _id: s._id.toString(),
          value: s.name || 'Unknown Source',
        }));
      }

      // Lead's Usage Status (lead_id.use_status)
      const useStatuses = await Lead.distinct('use_status', {
        use_status: { $ne: null, $exists: true },
      });
      valuesByField['lead_id.use_status'] = useStatuses
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map((v) => ({ _id: v, value: v }));

      // Lead's Duplicate Status (lead_id.duplicate_status)
      const duplicateStatuses = await Lead.distinct('duplicate_status');
      valuesByField['lead_id.duplicate_status'] = duplicateStatuses
        .filter((v) => v !== null && v !== undefined)
        .map((v) => ({ _id: v, value: String(v) }));

      // Lead's Reclamation Status (lead_id.reclamation_status)
      const reclamationStatuses = await Lead.distinct('reclamation_status', {
        reclamation_status: { $ne: null, $exists: true },
      });
      valuesByField['lead_id.reclamation_status'] = reclamationStatuses
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map((v) => ({ _id: v, value: v }));

      // Lead's Active State (lead_id.active)
      valuesByField['lead_id.active'] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' },
      ];

      // Lead ID, Lead Mail, Phone: string type, user inputs value - no options
      // Do NOT populate values - avoids unoptimized dropdowns with all leads/emails/phones
    }

    // Offer's related fields (for Opening/Confirmation -> Offer lookups)
    if (mongoose.models.Offer) {
      // Offer's Current Stage (offer_id.current_stage)
      valuesByField['offer_id.current_stage'] = [
        { _id: 'offer', value: 'Offer' },
        { _id: 'call_1', value: 'Call 1' },
        { _id: 'call_2', value: 'Call 2' },
        { _id: 'call_3', value: 'Call 3' },
        { _id: 'call_4', value: 'Call 4' },
        { _id: 'opening', value: 'Opening' },
        { _id: 'confirmation', value: 'Confirmation' },
        { _id: 'payment', value: 'Payment' },
        { _id: 'netto1', value: 'Netto 1' },
        { _id: 'netto2', value: 'Netto 2' },
        { _id: 'lost', value: 'Lost' },
        { _id: 'out', value: 'Out' },
      ];

      // Offer's Agent (offer_id.agent_id)
      if (valuesByField.agent_id) {
        valuesByField['offer_id.agent_id'] = [...valuesByField.agent_id];
      }

      // Offer's Project (offer_id.project_id)
      if (valuesByField.project_id) {
        valuesByField['offer_id.project_id'] = [...valuesByField.project_id];
      }

      // Offer's Bank (offer_id.bank_id)
      if (valuesByField.bank_id) {
        valuesByField['offer_id.bank_id'] = [...valuesByField.bank_id];
        valuesByField['offer_id.bank_id.nickName'] = [...valuesByField.bank_id];
      }

      // Offer's Active State (offer_id.active)
      valuesByField['offer_id.active'] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' },
      ];

      // Offer's Bank Nick Name: string type, user inputs - no options

      // Offer's Month / Payment Terms (offer_id.payment_terms)
      if (valuesByField.payment_terms) {
        valuesByField['offer_id.payment_terms'] = [...valuesByField.payment_terms];
      }

      // Offer's Bonus (offer_id.bonus_amount)
      if (valuesByField.bonus_amount) {
        valuesByField['offer_id.bonus_amount'] = [...valuesByField.bonus_amount];
      }
    }

    // Offer type options
    valuesByField.offerType = [
      { _id: 'standard', value: 'Standard' },
      { _id: 'flex', value: 'Flex' },
    ];

    // Status options (string values)
    valuesByField.status = [
      { _id: 'active', value: 'Active' },
      { _id: 'pending', value: 'Pending' },
      { _id: 'completed', value: 'Completed' },
      { _id: 'cancelled', value: 'Cancelled' },
    ];

    // Boolean fields
    const booleanFields = ['active', 'flex_option', 'migration_v1_consolidated'];
    booleanFields.forEach((field) => {
      valuesByField[field] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' },
      ];
    });

    // Progression active/completed booleans
    const progressionBooleans = [
      'progression.opening.active',
      'progression.confirmation.active',
      'progression.payment.active',
      'progression.netto1.active',
      'progression.netto2.active',
      'progression.lost.active',
    ];
    progressionBooleans.forEach((field) => {
      valuesByField[field] = [
        { _id: true, value: 'Yes' },
        { _id: false, value: 'No' },
      ];
    });

  } catch (error) {
    logger.error('Error building Offer value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Fetch values from MongoDB using native driver when mongoose model may not be loaded
 * Used as fallback for search-service when SchemaRegistry loads models with different names
 */
async function fetchFromCollection(collectionName, query, project, sort, limit = 1000) {
  try {
    if (!mongoose.connection || !mongoose.connection.db) return [];
    const coll = mongoose.connection.db.collection(collectionName);
    const options = { projection: project, sort, limit };
    const cursor = coll.find(query, options);
    return await cursor.toArray();
  } catch (err) {
    logger.warn(`buildReclamationValueOptions: Could not fetch from ${collectionName}:`, err.message);
    return [];
  }
}

/**
 * Build value lists for Reclamation model fields
 * Uses mongoose models when available, falls back to native MongoDB when not
 * (search-service may load models from SchemaRegistry with different registration)
 */
async function buildReclamationValueOptions() {
  const valuesByField = {};

  try {
    // Reclamation status: 0=Pending, 1=Accepted, 2=Rejected (always include)
    valuesByField.status = [
      { _id: 0, value: 'Pending' },
      { _id: 1, value: 'Accepted' },
      { _id: 2, value: 'Rejected' },
    ];

    // Agent -> agent_id (User model)
    let agents = [];
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();
    } else {
      agents = await fetchFromCollection(
        'users',
        { active: { $ne: false }, role: { $in: ['Agent', 'Admin', 'Manager'] } },
        { _id: 1, login: 1 },
        { login: 1 }
      );
    }
    if (agents.length > 0) {
      valuesByField.agent_id = agents.map((u) => ({
        _id: (u._id || u.id)?.toString?.() || String(u._id),
        value: u.login || 'Unknown User',
      }));
    }

    // Project -> project_id (Team or Project model)
    let projects = [];
    const TeamOrProject = mongoose.models.Team || mongoose.models.Project;
    if (TeamOrProject) {
      projects = await TeamOrProject.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
    } else {
      projects = await fetchFromCollection(
        'teams',
        { active: { $ne: false } },
        { _id: 1, name: 1 },
        { name: 1 }
      );
      if (projects.length === 0) {
        projects = await fetchFromCollection(
          'projects',
          { active: { $ne: false } },
          { _id: 1, name: 1 },
          { name: 1 }
        );
      }
    }
    if (projects.length > 0) {
      valuesByField.project_id = projects.map((p) => ({
        _id: (p._id || p.id)?.toString?.() || String(p._id),
        value: p.name || 'Unknown Project',
      }));
    }

    // Lead -> lead_id
    let leads = [];
    if (mongoose.models.Lead) {
      const Lead = mongoose.models.Lead;
      leads = await Lead.find({ active: true })
        .select('_id contact_name lead_source_no')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
    } else {
      leads = await fetchFromCollection(
        'leads',
        { active: true },
        { _id: 1, contact_name: 1, lead_source_no: 1 },
        { createdAt: -1 },
        500
      );
    }
    if (leads.length > 0) {
      valuesByField.lead_id = leads.map((l) => ({
        _id: (l._id || l.id)?.toString?.() || String(l._id),
        value: l.contact_name || l.lead_source_no || 'Unknown Lead',
      }));
    }

    // Lead's related fields (lead_id.user_id, lead_id.team_id, lead_id.source_id, etc.)
    if (valuesByField.agent_id) {
      valuesByField['lead_id.user_id'] = valuesByField.agent_id;
    }
    if (valuesByField.project_id) {
      valuesByField['lead_id.team_id'] = valuesByField.project_id;
    }

    // Source -> lead_id.source_id
    let sources = [];
    if (mongoose.models.Source) {
      const Source = mongoose.models.Source;
      sources = await Source.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
    } else {
      sources = await fetchFromCollection(
        'sources',
        { active: { $ne: false } },
        { _id: 1, name: 1 },
        { name: 1 }
      );
    }
    if (sources.length > 0) {
      valuesByField['lead_id.source_id'] = sources.map((s) => ({
        _id: (s._id || s.id)?.toString?.() || String(s._id),
        value: s.name || 'Unknown Source',
      }));
    }

    // Settings -> lead_id.status_id, lead_id.stage_id
    if (mongoose.models.Settings) {
      const Settings = mongoose.models.Settings;
      const stages = await Settings.find({ type: 'stage' })
        .select('_id name info')
        .lean();

      valuesByField['lead_id.stage_id'] = stages.map((st) => ({
        _id: (st._id || st.id)?.toString?.() || String(st._id),
        value: st.name || 'Unknown Stage',
      }));

      const statusMap = new Map();
      stages.forEach((stageDoc) => {
        const statuses = stageDoc.info?.statuses || [];
        statuses.forEach((s) => {
          if (s && s._id) {
            statusMap.set(s._id.toString(), s.name || 'Unknown');
          }
        });
      });
      if (statusMap.size > 0) {
        valuesByField['lead_id.status_id'] = Array.from(statusMap.entries()).map(([_id, value]) => ({ _id, value }));
      }
    } else {
      const settings = await fetchFromCollection(
        'settings',
        { type: 'stage' },
        { _id: 1, name: 1, info: 1 },
        { name: 1 }
      );
      if (settings.length > 0) {
        valuesByField['lead_id.stage_id'] = settings.map((st) => ({
          _id: (st._id || st.id)?.toString?.() || String(st._id),
          value: st.name || 'Unknown Stage',
        }));
      }
    }

    // lead_id.reclamation_status, lead_id.use_status, lead_id.duplicate_status, lead_id.active
    if (mongoose.models.Lead) {
      const Lead = mongoose.models.Lead;
      const [reclamationStatuses, useStatuses, duplicateStatuses] = await Promise.all([
        Lead.distinct('reclamation_status', { reclamation_status: { $ne: null, $exists: true } }),
        Lead.distinct('use_status', { use_status: { $ne: null, $exists: true } }),
        Lead.distinct('duplicate_status'),
      ]);
      if (reclamationStatuses.length > 0) {
        valuesByField['lead_id.reclamation_status'] = reclamationStatuses.map((v) => ({ _id: v, value: v }));
      }
      if (useStatuses.length > 0) {
        valuesByField['lead_id.use_status'] = useStatuses.map((v) => ({ _id: v, value: v }));
      }
      if (duplicateStatuses.length > 0) {
        valuesByField['lead_id.duplicate_status'] = duplicateStatuses.map((v) => ({ _id: v, value: String(v) }));
      }
    }
    valuesByField['lead_id.active'] = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];
  } catch (error) {
    logger.error('Error building Reclamation value options:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for CashflowEntry model fields
 * Provides dropdown values for bank, entered_by, status, and related offer fields
 */
async function buildCashflowEntryValueOptions() {
  const valuesByField = {};

  try {
    // Bank -> current_bank_id, initial_bank_id (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();

      const bankOptions = banks.map((b) => ({
        _id: b._id.toString(),
        value: b.nickName || b.name || 'Unknown Bank',
      }));

      valuesByField.current_bank_id = bankOptions;
      valuesByField.initial_bank_id = [...bankOptions];
    }

    // User -> entered_by (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const users = await User.find({
        active: { $ne: false },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      valuesByField.entered_by = users.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
    }

    // Offer -> offer_id (Offer model)
    if (mongoose.models.Offer) {
      const Offer = mongoose.models.Offer;
      const offers = await Offer.find({ active: true })
        .select('_id reference_no title')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      valuesByField.offer_id = offers.map((o) => ({
        _id: o._id.toString(),
        value: o.reference_no || o.title || 'Unknown Offer',
      }));
    }

    // Status options (string values)
    valuesByField.status = [
      { _id: 'active', value: 'Active' },
      { _id: 'pending', value: 'Pending' },
      { _id: 'completed', value: 'Completed' },
      { _id: 'cancelled', value: 'Cancelled' },
    ];

    // Currency options
    valuesByField.currency = [
      { _id: 'EUR', value: 'EUR' },
      { _id: 'USD', value: 'USD' },
      { _id: 'GBP', value: 'GBP' },
      { _id: 'CHF', value: 'CHF' },
    ];

    // Boolean fields
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

    // =====================================================
    // RELATED FIELD VALUES (for Offer lookups via offer_id)
    // =====================================================

    // Project -> offer_id.project_id (Team model)
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField['offer_id.project_id'] = projects.map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // Agent -> offer_id.agent_id (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      valuesByField['offer_id.agent_id'] = agents.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
    }

    // Bank -> offer_id.bank_id (Bank model)
    if (valuesByField.current_bank_id) {
      valuesByField['offer_id.bank_id'] = [...valuesByField.current_bank_id];
    }

    // Offer's Current Stage (offer_id.current_stage)
    valuesByField['offer_id.current_stage'] = [
      { _id: 'offer', value: 'Offer' },
      { _id: 'call_1', value: 'Call 1' },
      { _id: 'call_2', value: 'Call 2' },
      { _id: 'call_3', value: 'Call 3' },
      { _id: 'call_4', value: 'Call 4' },
      { _id: 'opening', value: 'Opening' },
      { _id: 'confirmation', value: 'Confirmation' },
      { _id: 'payment', value: 'Payment' },
      { _id: 'netto1', value: 'Netto 1' },
      { _id: 'netto2', value: 'Netto 2' },
      { _id: 'lost', value: 'Lost' },
      { _id: 'out', value: 'Out' },
    ];

    // Offer's Active State (offer_id.active)
    valuesByField['offer_id.active'] = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building CashflowEntry value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for CashflowTransaction model fields
 * Provides dropdown values for bank, status, direction, transaction_type
 */
async function buildCashflowTransactionValueOptions() {
  const valuesByField = {};

  try {
    // Bank -> bank_id, counterparty_bank_id (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();

      const bankOptions = banks.map((b) => ({
        _id: b._id.toString(),
        value: b.nickName || b.name || 'Unknown Bank',
      }));

      valuesByField.bank_id = bankOptions;
      valuesByField.counterparty_bank_id = [...bankOptions];
    }

    // User -> created_by, received_by (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const users = await User.find({
        active: { $ne: false },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      const userOptions = users.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));

      valuesByField.created_by = userOptions;
      valuesByField.received_by = [...userOptions];
    }

    // Status options
    valuesByField.status = [
      { _id: 'pending', value: 'Pending' },
      { _id: 'received', value: 'Received' },
      { _id: 'sent', value: 'Sent' },
      { _id: 'completed', value: 'Completed' },
      { _id: 'failed', value: 'Failed' },
      { _id: 'cancelled', value: 'Cancelled' },
    ];

    // Direction options
    valuesByField.direction = [
      { _id: 'incoming', value: 'Incoming' },
      { _id: 'outgoing', value: 'Outgoing' },
      { _id: 'internal', value: 'Internal' },
    ];

    // Transaction type options
    valuesByField.transaction_type = [
      { _id: 'deposit', value: 'Deposit' },
      { _id: 'withdrawal', value: 'Withdrawal' },
      { _id: 'transfer', value: 'Transfer' },
      { _id: 'fee', value: 'Fee' },
      { _id: 'reversal', value: 'Reversal' },
    ];

    // Currency options
    valuesByField.currency = [
      { _id: 'EUR', value: 'EUR' },
      { _id: 'USD', value: 'USD' },
      { _id: 'GBP', value: 'GBP' },
      { _id: 'CHF', value: 'CHF' },
    ];

    // Boolean fields
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building CashflowTransaction value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for User model fields (role, login, email, project, office, mail servers)
 */
async function buildUserValueOptions(UserModel) {
  const valuesByField = {};

  try {
    const User = UserModel;

    // Role: from Role collection or User.distinct
    if (mongoose.models.Role) {
      const Role = mongoose.models.Role;
      const roles = await Role.find({ active: true }).select('name').sort({ name: 1 }).lean();
      valuesByField.role = (roles || []).map((r) => ({
        _id: r.name || r._id?.toString(),
        value: r.name || 'Unknown',
      }));
    }
    if (!valuesByField.role || valuesByField.role.length === 0) {
      const roleValues = await User.distinct('role').catch(() => []);
      valuesByField.role = (roleValues || ['Admin', 'Agent', 'Manager', 'Banker', 'Client', 'Provider'])
        .filter(Boolean)
        .map((v) => ({ _id: v, value: v }));
    }

    // Login: User list (ref: User for dropdown)
    const users = await User.find({ active: { $ne: false } })
      .select('_id login')
      .sort({ login: 1 })
      .limit(1000)
      .lean();
    valuesByField.login = (users || []).map((u) => ({
      _id: (u._id || u).toString(),
      value: u.login || 'Unknown User',
    }));

    // Email: distinct emails
    const emails = await User.distinct('email', { email: { $ne: null, $ne: '' } }).catch(() => []);
    valuesByField.email = (emails || []).filter(Boolean).map((v) => ({ _id: v, value: v }));

    // Project Name (info.project_id) - Team
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
      valuesByField['info.project_id'] = (projects || []).map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // Office (primary_office, offices) - Office model
    if (mongoose.models.Office) {
      const Office = mongoose.models.Office;
      const offices = await Office.find({})
        .select('_id name')
        .sort({ name: 1 })
        .lean();
      const officeOptions = (offices || []).map((o) => ({
        _id: o._id.toString(),
        value: o.name || 'Unknown Office',
      }));
      valuesByField.primary_office = officeOptions;
      valuesByField.offices = officeOptions;
    } else {
      const officeIds = await User.distinct('primary_office', { primary_office: { $ne: null } }).catch(() => []);
      if (officeIds.length > 0) {
        const coll = mongoose.connection?.db?.collection('offices');
        if (coll) {
          const officeDocs = await coll.find({ _id: { $in: officeIds } }).project({ _id: 1, name: 1 }).toArray();
          valuesByField.primary_office = officeDocs.map((o) => ({
            _id: o._id.toString(),
            value: o.name || 'Unknown Office',
          }));
        }
      }
    }

    // Mail Servers - Settings type mailservers
    if (mongoose.models.Settings) {
      const Settings = mongoose.models.Settings;
      const mailServers = await Settings.find({ type: 'mailservers' })
        .select('_id name info')
        .sort({ name: 1 })
        .lean();
      valuesByField.mail_servers = (mailServers || []).map((s) => ({
        _id: s._id.toString(),
        value: s.name || s.info?.admin_email || 'Unknown Mail Server',
      }));
    } else {
      const coll = mongoose.connection?.db?.collection('settings');
      if (coll) {
        const mailServers = await coll.find({ type: 'mailservers' }).project({ _id: 1, name: 1, info: 1 }).toArray();
        valuesByField.mail_servers = (mailServers || []).map((s) => ({
          _id: s._id.toString(),
          value: s.name || s.info?.admin_email || 'Unknown Mail Server',
        }));
      }
    }

    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];
  } catch (error) {
    logger.error('Error building User value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Apply ref overrides and inject missing fields for User model metadata
 * - role: ref 'Role' (was null)
 * - login: ref 'User' (for dropdown options)
 * - Add info.project_id (Project Name), ensure Office/Mail Servers labels
 */
function applyUserFieldOverrides(fields) {
  const REF_OVERRIDES = { role: 'Role', login: 'User' };
  Object.keys(REF_OVERRIDES).forEach((name) => {
    if (fields[name]) {
      fields[name].ref = REF_OVERRIDES[name];
    }
  });

  const ADDITIONAL_FIELDS = {
    'info.project_id': {
      name: 'info.project_id',
      label: 'Project Name',
      type: 'reference',
      ref: 'Team',
      filterable: true,
      groupable: true,
      sortable: true,
      operators: ['=', '!=', 'in', 'not in', 'is_empty', 'is_not_empty'],
      example: 'objectid_here',
    },
  };
  Object.assign(fields, ADDITIONAL_FIELDS);
}

/**
 * ClosedLead schema stores source_user_id / source_team_id; expose source_agent / source_project in metadata
 * with the same structure as Lead (labels + ref + operators), without removing existing fields.
 */
function applyClosedLeadSourceFieldMetadata(fields) {
  if (fields.source_user_id) {
    fields.source_agent = {
      ...fields.source_user_id,
      name: 'source_agent',
      label: CUSTOM_LABELS.source_agent || 'Source Agent',
    };
  }
  if (fields.source_team_id) {
    fields.source_project = {
      ...fields.source_team_id,
      name: 'source_project',
      label: CUSTOM_LABELS.source_project || 'Source Project',
    };
  }
}

/**
 * Build value lists for Todo and Appointment models
 */
async function buildTodoAppointmentValueOptions() {
  const valuesByField = {};

  try {
    // Agent/User -> user_id, agent_id
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const users = await User.find({
        active: { $ne: false },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      const userOptions = users.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
      
      valuesByField.user_id = userOptions;
      valuesByField.agent_id = userOptions;
      valuesByField.created_by = userOptions;
      valuesByField.assigned_to = userOptions;
    }

    // Lead -> lead_id
    if (mongoose.models.Lead) {
      const Lead = mongoose.models.Lead;
      const leads = await Lead.find({ active: true })
        .select('_id contact_name lead_source_no')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      valuesByField.lead_id = leads.map((l) => ({
        _id: l._id.toString(),
        value: l.contact_name || l.lead_source_no || 'Unknown Lead',
      }));
    }

    // Project -> project_id (Team model)
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField.project_id = projects.map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // Priority options for Todo
    valuesByField.priority = [
      { _id: 'low', value: 'Low' },
      { _id: 'medium', value: 'Medium' },
      { _id: 'high', value: 'High' },
      { _id: 'urgent', value: 'Urgent' },
    ];

    // Status options
    valuesByField.status = [
      { _id: 'pending', value: 'Pending' },
      { _id: 'confirmed', value: 'Confirmed' },
      { _id: 'completed', value: 'Completed' },
      { _id: 'cancelled', value: 'Cancelled' },
    ];

    // Boolean fields
    valuesByField.isDone = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building Todo/Appointment value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for CashflowEntry model
 */
async function buildCashflowEntryValueOptions() {
  const valuesByField = {};

  try {
    // Status options
    valuesByField.status = [
      { _id: 'active', value: 'Active' },
      { _id: 'pending', value: 'Pending' },
      { _id: 'completed', value: 'Completed' },
      { _id: 'cancelled', value: 'Cancelled' },
    ];

    // Bank -> current_bank_id, initial_bank_id (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();

      const bankOptions = banks.map((b) => ({
        _id: b._id.toString(),
        value: b.nickName ? `${b.name} (${b.nickName})` : b.name || 'Unknown Bank',
      }));

      valuesByField.current_bank_id = bankOptions;
      valuesByField.initial_bank_id = [...bankOptions];
    }

    // Agent -> agent_id (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({
        active: { $ne: false },
        role: { $in: ['Agent', 'Admin', 'Manager'] },
      })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      valuesByField.entered_by = agents.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
    }

    // Project via Offer -> offer_id.project_id
    if (mongoose.models.Team) {
      const Team = mongoose.models.Team;
      const projects = await Team.find({ active: { $ne: false } })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

      valuesByField['offer_id.project_id'] = projects.map((p) => ({
        _id: p._id.toString(),
        value: p.name || 'Unknown Project',
      }));
    }

    // Active boolean
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building CashflowEntry value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Build value lists for CashflowTransaction model
 */
async function buildCashflowTransactionValueOptions() {
  const valuesByField = {};

  try {
    // Direction options
    valuesByField.direction = [
      { _id: 'incoming', value: 'Incoming' },
      { _id: 'outgoing', value: 'Outgoing' },
    ];

    // Transaction type options
    valuesByField.transaction_type = [
      { _id: 'deposit', value: 'Deposit' },
      { _id: 'transfer', value: 'Transfer' },
      { _id: 'bounce', value: 'Bounce' },
      { _id: 'refund', value: 'Refund' },
    ];

    // Status options
    valuesByField.status = [
      { _id: 'sent', value: 'Sent' },
      { _id: 'received', value: 'Received' },
    ];

    // Bank -> bank_id, counterparty_bank_id (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();

      const bankOptions = banks.map((b) => ({
        _id: b._id.toString(),
        value: b.nickName ? `${b.name} (${b.nickName})` : b.name || 'Unknown Bank',
      }));

      valuesByField.bank_id = bankOptions;
      valuesByField.counterparty_bank_id = [...bankOptions];
    }

    // User -> created_by, received_by (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const users = await User.find({ active: { $ne: false } })
        .select('_id login')
        .sort({ login: 1 })
        .lean();

      const userOptions = users.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));

      valuesByField.created_by = userOptions;
      valuesByField.received_by = [...userOptions];
    }

    // Active boolean
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building CashflowTransaction value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Get list of all available models
 * 
 * @route GET /api/search/models
 * @access Private
 */
exports.getModels = async (req, res) => {
  try {
    const models = getAvailableModels();
    
    res.status(200).json({
      success: true,
      models: models.map(name => ({
        name,
        endpoint: `/api/search/fields/${name}`,
        optionsEndpoint: `/api/search/options/${name}`
      })),
      total: models.length
    });
    
  } catch (error) {
    logger.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Custom label mappings for specific fields
 * Human-readable labels that override auto-generated ones
 * Organized by model for clarity
 */
const CUSTOM_LABELS = {
  // ============================================
  // COMMON FIELDS (used across multiple models)
  // ============================================
  '_id': 'ID',
  'id': 'ID',
  'createdAt': 'Created Date',
  'updatedAt': 'Last Updated',
  // 'created_at': 'Created Date',
  // 'updated_at': 'Last Updated',
  'active': 'Active',
  'status': 'Status',
  'notes': 'Notes',
  'description': 'Description',
  'title': 'Title',
  'name': 'Name',
  'created_by': 'Created By',
  'files': 'Files',
  'timeline': 'Timeline',
  'metadata': 'Additional Data',
  
  // Reference fields - clean names without "Id"
  'team_id': 'Project',
  'project_id': 'Project',
  'user_id': 'Agent',
  'agent_id': 'Agent',
  'lead_id': 'Lead',
  'offer_id': 'Offer',
  'opening_id': 'Opening',
  'confirmation_id': 'Confirmation',
  'source_id': 'Source',
  'bank_id': 'Bank Nick Name',
  'stage_id': 'Stage',
  'status_id': 'Status',
  'document_id': 'Document',
  'payment_terms': 'Month',
  'bonus_amount': 'Bonus',
  'interest_rate': 'Interest Rate',
  'investment_volume': 'Amount',
  
  // ============================================
  // LEAD MODEL
  // ============================================
  'partner_id': 'Partner Number',
  'lead_source_no': 'Lead Number',
  'system_id': 'System ID',
  'instance_id': 'Instance',
  'transaction_id': 'Transaction',
  'contact_name': 'Contact Name',
  'email_from': 'Email',
  'secondary_email': 'Secondary Email',
  'phone': 'Phone',
  'expected_revenue': 'Expected Revenue',
  'leadPrice': 'Lead Price',
  'offer_calls': 'Offer Calls',
  'lead_date': 'Lead Date',
  'assigned_date': 'Assigned Date',
  'source_month': 'Source Month',
  'prev_month': 'Previous Month',
  'current_month': 'Current Month',
  'duplicate_status': 'Duplicate Status',
  'use_status': 'Usage Status',
  'reclamation_status': 'Reclamation Status',
  'checked': 'Verified',
  'usable': 'Usable',
  'tags': 'Tags',
  'nametitle': 'Salutation',
  'custom_fields': 'Custom Fields',
  'voip_extension': 'VoIP Extension',
  
  // Previous assignment
  'prev_team_id': 'Previous Project',
  'prev_user_id': 'Previous Agent',
  'source_project': 'Source Project',
  'source_agent': 'Source Agent',
  
  // Closure fields
  'closed_at': 'Closed Date',
  'closed_by_user_id': 'Closed By',
  'closure_reason': 'Closure Reason',
  'is_reverted': 'Reverted',
  'reverted_at': 'Reverted Date',
  'reverted_by_user_id': 'Reverted By',
  'closeLeadStatus': 'Close Lead Status',
  'current_status': 'Current Status',
  'project_closed_date': 'Project Closed Date',
  'original_closure_reason': 'Original Closure Reason',
  'original_closed_by_user_id': 'Originally Closed By',
  
  // Arrays
  'offer_ids': 'Offers',
  'document_ids': 'Documents',
  
  // Computed/flags
  'has_offer': 'Has Offer',
  'has_opening': 'Has Opening',
  'has_confirmation': 'Has Confirmation',
  'has_payment': 'Has Payment',
  'has_netto': 'Has Netto',
  'has_lost': 'Has Lost',
  'has_todo': 'Has Todo',
  'has_extra_todo': 'Has Extra Todo',
  'has_assigned_todo': 'Has Assigned Todo',
  'is_favourite': 'Favourite',
  
  // ============================================
  // OFFER MODEL - Basic Fields
  // ============================================
  'reference_no': 'Reference Number',
  'investment_volume': 'Investment Volume',
  'interest_rate': 'Interest Rate',
  'current_stage': 'Current Stage',
  'offer_date': 'Offer Date',
  'expiry_date': 'Expiry Date',
  'amount': 'Amount',
  'currency': 'Currency',
  'bankerRate': 'Banker Rate',
  'agentRate': 'Agent Rate',
  'offerType': 'Offer Type',
  'flex_option': 'Flex Option',
  'scheduled_date': 'Scheduled Date',
  'scheduled_time': 'Scheduled Time',
  'handover_notes': 'Handover Notes',
  'migration_v1_consolidated': 'Migration Consolidated',
  
  // Handover metadata (nested)
  'handover_metadata': 'Handover Info',
  'handover_metadata.original_agent_id': 'Original Agent (Handover)',
  'handover_metadata.handover_at': 'Handover Date',
  'handover_metadata.handover_reason': 'Handover Reason',
  
  // Pending transfer (nested)
  'pending_transfer': 'Pending Transfer',
  'pending_transfer.target_agent_id': 'Transfer To (Agent)',
  'pending_transfer.scheduled_date': 'Transfer Scheduled Date',
  'pending_transfer.scheduled_time': 'Transfer Scheduled Time',
  'pending_transfer.created_at': 'Transfer Created Date',
  'pending_transfer.transfer_notes': 'Transfer Notes',
  'pending_transfer.status': 'Transfer Status',
  
  // ============================================
  // OFFER MODEL - Progression Stages (nested)
  // ============================================
  'progression': 'Progression',
  
  // Opening stage
  'progression.opening': 'Opening Stage',
  'progression.opening.active': 'Opening Active',
  'progression.opening.completed': 'Opening Completed',
  'progression.opening.completed_by': 'Opening Completed By',
  'progression.opening.completed_at': 'Opening Completed Date',
  'progression.opening.files': 'Opening Documents',
  'progression.opening.metadata': 'Opening Data',
  
  // Confirmation stage
  'progression.confirmation': 'Confirmation Stage',
  'progression.confirmation.active': 'Confirmation Active',
  'progression.confirmation.completed': 'Confirmation Completed',
  'progression.confirmation.completed_by': 'Confirmation Completed By',
  'progression.confirmation.completed_at': 'Confirmation Completed Date',
  'progression.confirmation.files': 'Confirmation Documents',
  'progression.confirmation.metadata': 'Confirmation Data',
  
  // Payment stage
  'progression.payment': 'Payment Stage',
  'progression.payment.active': 'Payment Active',
  'progression.payment.completed': 'Payment Completed',
  'progression.payment.completed_by': 'Payment Completed By',
  'progression.payment.completed_at': 'Payment Completed Date',
  'progression.payment.files': 'Payment Documents',
  'progression.payment.amount': 'Payment Amount',
  'progression.payment.metadata': 'Payment Data',
  
  // Netto 1 stage
  'progression.netto1': 'Netto 1 Stage',
  'progression.netto1.active': 'Netto 1 Active',
  'progression.netto1.completed': 'Netto 1 Completed',
  'progression.netto1.completed_by': 'Netto 1 Completed By',
  'progression.netto1.completed_at': 'Netto 1 Completed Date',
  'progression.netto1.files': 'Netto 1 Documents',
  'progression.netto1.amount': 'Netto 1 Amount',
  'progression.netto1.bankerRate': 'Netto 1 Banker Rate',
  'progression.netto1.agentRate': 'Netto 1 Agent Rate',
  'progression.netto1.metadata': 'Netto 1 Data',
  
  // Netto 2 stage
  'progression.netto2': 'Netto 2 Stage',
  'progression.netto2.active': 'Netto 2 Active',
  'progression.netto2.completed': 'Netto 2 Completed',
  'progression.netto2.completed_by': 'Netto 2 Completed By',
  'progression.netto2.completed_at': 'Netto 2 Completed Date',
  'progression.netto2.files': 'Netto 2 Documents',
  'progression.netto2.amount': 'Netto 2 Amount',
  'progression.netto2.bankerRate': 'Netto 2 Banker Rate',
  'progression.netto2.agentRate': 'Netto 2 Agent Rate',
  'progression.netto2.metadata': 'Netto 2 Data',
  
  // Lost stage
  'progression.lost': 'Lost Stage',
  'progression.lost.active': 'Lost Active',
  'progression.lost.marked': 'Marked as Lost',
  'progression.lost.marked_by': 'Lost Marked By',
  'progression.lost.marked_at': 'Lost Marked Date',
  'progression.lost.reason': 'Lost Reason',
  'progression.lost.metadata': 'Lost Data',
  
  // ============================================
  // TODO MODEL
  // ============================================
  'isDone': 'Completed',
  'dueDate': 'Due Date',
  'priority': 'Priority',
  'reminder': 'Reminder',
  'assigned_to': 'Assigned To',
  
  // ============================================
  // APPOINTMENT MODEL
  // ============================================
  'appointment_date': 'Appointment Date',
  'appointment_time': 'Appointment Time',
  'location': 'Location',
  'attendees': 'Attendees',
  'meeting_type': 'Meeting Type',
  'duration': 'Duration',
  
  // ============================================
  // USER MODEL
  // ============================================
  'login': 'Username',
  'email': 'Email',
  'role': 'Role',
  'first_name': 'First Name',
  'last_name': 'Last Name',
  'last_login': 'Last Login',
  'password_changed_at': 'Password Changed',
  
  // ============================================
  // NOTIFICATION MODEL
  // ============================================
  'type': 'Type',
  'category': 'Category',
  'message': 'Message',
  'read': 'Read',
  'read_at': 'Read At',
  'context': 'Context',
  'context.team_id': 'Related Project',
  'context.user_id': 'Related Agent',
  'context.lead_id': 'Related Lead',
  'context.created_by': 'Created By',
  'info': 'Info',
  'info.project_id': 'Project Name',
  'info.agent_id': 'Agent',
  'info.lead_id': 'Lead',
  'primary_office': 'Office',
  'offices': 'Offices',
  'mail_servers': 'Mail Servers',
  
  // ============================================
  // CONFIGURATION MODELS (Bank, Source, Project)
  // ============================================
  'provider_id': 'Provider',
  'price': 'Price',
  'state': 'State',
  
  // ============================================
  // OPENING / CONFIRMATION / PAYMENT VOUCHER
  // ============================================
  'opening_date': 'Opening Date',
  'confirmation_date': 'Confirmation Date',
  'payment_date': 'Payment Date',
  'voucher_number': 'Voucher Number',
  'payment_method': 'Payment Method',
  'payment_status': 'Payment Status',
  
  // ============================================
  // ASSIGNMENT MODEL
  // ============================================
  'assigned_by': 'Assigned By',
  'assignment_date': 'Assignment Date',
  'assignment_type': 'Assignment Type',
  
  // ============================================
  // CASHFLOW ENTRY MODEL
  // ============================================
  'current_bank_id': 'Current Bank',
  'initial_bank_id': 'Initial Bank',
  'entered_by': 'Entered By',
  'entered_at': 'Entered At',
  
  // ============================================
  // CASHFLOW TRANSACTION MODEL
  // ============================================
  'counterparty_bank_id': 'Counterparty Bank',
  'cashflow_entry_id': 'Cashflow Entry',
  'paired_transaction_id': 'Paired Transaction',
  'reverses_transaction_id': 'Reverses Transaction',
  'received_by': 'Received By',
  'transaction_reference': 'Transaction Reference',
  'transaction_type': 'Transaction Type',
  'direction': 'Direction',
  'documents': 'Documents',
  
  // ============================================
  // TEAM MODEL
  // ============================================
  'mailserver_id': 'Mail Server',
  'voipserver_id': 'VoIP Server',
  'pdf_templates': 'Email Template',

  // ============================================
  // RELATED FIELD LABELS (cross-model)
  // ============================================
  'lead_id._id': 'Lead ID',
  'lead_id.lead_source_no': 'Lead Source No',
  'lead_id.contact_name': 'Contact Name',
  'lead_id.email_from': 'Lead Mail',
  'lead_id.phone': 'Lead Phone',
  'offer_id.interest_rate': 'Interest Rate',
  'offer_id.bonus_amount': 'Bonus',
  'offer_id.payment_terms': 'Month',
  'bank_id.nickName': 'Bank Nick Name',
  'offer_id.bank_id.nickName': 'Bank Nick Name',
};

/**
 * Related field definitions for cross-model grouping/filtering
 * 
 * These define which related fields are available when a model has a reference to another model.
 * Format: { localField: { relatedFields: [{ field, label, type, ref }] } }
 * 
 * Labels are designed to be UNIQUE and MEANINGFUL:
 * - Use "Parent's Field" format for clarity (e.g., "Lead's Status")
 * - Avoid duplicate labels across the entire metadata response
 */
const RELATED_FIELD_DEFINITIONS = {
  // When a model has lead_id reference, these related fields become available
  'lead_id': {
    parentLabel: 'Lead',
    parentRef: 'Lead',
    relatedFields: [
      { field: '_id', label: 'Lead ID', type: 'string', ref: null },
      { field: 'lead_source_no', label: 'Lead Source No', type: 'string', ref: null },
      { field: 'contact_name', label: 'Contact Name', type: 'string', ref: null },
      { field: 'email_from', label: 'Lead Mail', type: 'string', ref: null },
      { field: 'phone', label: 'Lead Phone', type: 'string', ref: null },
      { field: 'status_id', label: "Lead's Status", type: 'reference', ref: 'Settings' },
      { field: 'stage_id', label: "Lead's Stage", type: 'reference', ref: 'Settings' },
      { field: 'user_id', label: "Lead's Agent", type: 'reference', ref: 'User' },
      { field: 'team_id', label: "Lead's Project", type: 'reference', ref: 'Team' },
      { field: 'source_id', label: "Lead's Source", type: 'reference', ref: 'Source' },
      { field: 'lead_date', label: "Lead's Date", type: 'date', ref: null },
      { field: 'use_status', label: "Lead's Usage Status", type: 'string', ref: null },
      { field: 'duplicate_status', label: "Lead's Duplicate Status", type: 'number', ref: null },
      { field: 'reclamation_status', label: "Lead's Reclamation", type: 'string', ref: null },
      { field: 'active', label: "Lead's Active State", type: 'boolean', ref: null },
    ]
  },
  
  // When a model has bank_id reference (Offer has bank_id directly)
  'bank_id': {
    parentLabel: 'Bank',
    parentRef: 'Bank',
    relatedFields: [
      { field: 'nickName', label: 'Bank Nick Name', type: 'reference', ref: 'Bank' },
    ]
  },

  // When a model has offer_id reference
  'offer_id': {
    parentLabel: 'Offer',
    parentRef: 'Offer',
    relatedFields: [
      { field: 'current_stage', label: "Offer's Current Stage", type: 'string', ref: null },
      { field: 'agent_id', label: "Offer's Agent", type: 'reference', ref: 'User' },
      { field: 'project_id', label: "Offer's Project", type: 'reference', ref: 'Team' },
      { field: 'bank_id', label: "Offer's Bank", type: 'reference', ref: 'Bank' },
      { field: 'bank_id.nickName', label: 'Bank Nick Name', type: 'reference', ref: 'Bank' },
      { field: 'offer_date', label: "Offer's Date", type: 'date', ref: null },
      { field: 'investment_volume', label: "Offer's Amount", type: 'number', ref: null },
      { field: 'interest_rate', label: 'Interest Rate', type: 'number', ref: null },
      { field: 'bonus_amount', label: 'Bonus', type: 'reference', ref: 'Settings' },
      { field: 'payment_terms', label: 'Month', type: 'reference', ref: 'Settings' },
      { field: 'active', label: "Offer's Active State", type: 'boolean', ref: null },
    ]
  },
  
  // When a model has user_id reference (for non-Lead models)
  'user_id': {
    parentLabel: 'Agent',
    parentRef: 'User',
    relatedFields: [
      { field: 'role', label: "Agent's Role", type: 'string', ref: null },
      { field: 'active', label: "Agent's Active State", type: 'boolean', ref: null },
    ]
  },
  
  // When a model has agent_id reference
  'agent_id': {
    parentLabel: 'Agent',
    parentRef: 'User',
    relatedFields: [
      { field: 'role', label: "Agent's Role", type: 'string', ref: null },
      { field: 'active', label: "Agent's Active State", type: 'boolean', ref: null },
    ]
  },
  
  // When a model has team_id/project_id reference
  'team_id': {
    parentLabel: 'Project',
    parentRef: 'Team',
    relatedFields: [
      { field: 'active', label: "Project's Active State", type: 'boolean', ref: null },
    ]
  },
  'project_id': {
    parentLabel: 'Project',
    parentRef: 'Team',
    relatedFields: [
      { field: 'active', label: "Project's Active State", type: 'boolean', ref: null },
    ]
  },
};

/**
 * Model-specific related field overrides
 * Some models need specific related fields enabled/disabled
 */
const MODEL_RELATED_FIELD_CONFIG = {
  'Offer': {
    // Offer has lead_id and bank_id - enable all related fields
    enabledRelations: ['lead_id', 'bank_id'],
  },
  'Opening': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'Confirmation': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'PaymentVoucher': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'Netto1': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'Netto2': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'Lost': {
    enabledRelations: ['lead_id', 'offer_id'],
  },
  'Todo': {
    enabledRelations: ['lead_id', 'user_id'],
  },
  'Appointment': {
    enabledRelations: ['lead_id', 'user_id'],
  },
  'Activity': {
    enabledRelations: ['lead_id', 'user_id'],
  },
  'Reclamation': {
    enabledRelations: ['lead_id'],
  },
  'CashflowEntry': {
    enabledRelations: ['offer_id'],
  },
  'CashflowTransaction': {
    enabledRelations: [],  // Transactions relate to banks, not other models with nested fields
  },
};

/**
 * Generate related field options for a model based on its reference fields
 * @param {Object} fields - The extracted fields from the model schema
 * @param {string} modelName - The model name
 * @returns {Array} - Array of related field options for grouping/filtering
 */
function generateRelatedFieldOptions(fields, modelName) {
  const relatedOptions = [];
  const modelConfig = MODEL_RELATED_FIELD_CONFIG[modelName];
  
  // If no config for this model, try to auto-detect from schema
  const enabledRelations = modelConfig?.enabledRelations || [];
  
  // Check each field that has a reference
  Object.entries(fields).forEach(([fieldName, fieldMeta]) => {
    if (fieldMeta.type !== 'reference') return;
    
    // Check if this relation is enabled for this model
    const relationDef = RELATED_FIELD_DEFINITIONS[fieldName];
    if (!relationDef) return;
    
    // Only include if explicitly enabled or if no config exists (auto-detect mode)
    if (modelConfig && !enabledRelations.includes(fieldName)) return;
    
    // Generate related field options
    relationDef.relatedFields.forEach(relatedField => {
      const fullFieldPath = `${fieldName}.${relatedField.field}`;
      
      relatedOptions.push({
        field: fullFieldPath,
        label: relatedField.label,
        type: relatedField.type,
        ref: relatedField.ref,
        parentField: fieldName,
        parentLabel: relationDef.parentLabel,
        isRelatedField: true,
        operators: getOperatorsForType(relatedField.type),
        filterable: true,
        groupable: isGroupable(relatedField.type),
      });
    });
  });
  
  return relatedOptions;
}

/**
 * Extract field metadata from Mongoose schema
 */
function extractFieldMetadata(Model, modelName) {
  const fields = {};
  const schema = Model.schema;
  
  // Fields to exclude from metadata (internal, duplicate, or not useful for filtering/grouping)
  const EXCLUDED_FIELDS = [
    // Internal/system fields
    '__v', '_id',
    // Duplicate timestamp fields (we use createdAt/updatedAt)
    'updated_at', 'created_at', 'write_date',
    // Lead fields - not useful for filtering/grouping
    'partner_id', 'system_id', 'source_month', 'prev_month', 'current_month',
    'transaction_id', 'instance_id', 'custom_fields', 'tags', 'notes',
  ];
  
  schema.eachPath((path, schemaType) => {
    // Skip excluded fields
    if (EXCLUDED_FIELDS.includes(path)) {
      return;
    }
    
    const fieldType = getFieldType(schemaType);
    const operators = getOperatorsForType(fieldType);
    
    // Use custom label if available, otherwise use schema label, otherwise format the field name
    const customLabel = CUSTOM_LABELS[path];
    const label = customLabel || schemaType.options.label || formatLabel(path);
    
    fields[path] = {
      name: path,
      label: label,
      type: fieldType,
      required: schemaType.options.required || false,
      ref: schemaType.options.ref || null,
      filterable: true,
      groupable: isGroupable(fieldType),
      sortable: isSortable(fieldType),
      operators: operators,
      example: getExampleValue(fieldType, path)
    };
  });
  
  // Note: We no longer add alias fields (source_user_id, source_team_id)
  // The frontend should use the actual field names: source_agent and source_project
  
  return fields;
}

/**
 * Get field type from Mongoose schema type
 */
function getFieldType(schemaType) {
    const typeMap = {
        'ObjectID': 'reference',
        'ObjectId': 'reference', // Add alternative spelling
        'String': 'string',
        'Number': 'number',
        'Date': 'date',
        'Boolean': 'boolean',
        'Array': 'array',
        'Mixed': 'mixed'
    };
    
    // Check if it's an ObjectId by checking the ref property
    if (schemaType.options && schemaType.options.ref) {
        return 'reference';
    }
    
    return typeMap[schemaType.instance] || 'unknown';
}

/**
 * Get available operators for a field type
 */
function getOperatorsForType(fieldType) {
  const operatorMap = {
    'string': ['=', '!=', 'ilike', 'like', 'in', 'not in', 'is_empty', 'is_not_empty'],
    'number': ['=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'not in', 'is_empty', 'is_not_empty'],
    'date': ['=', '!=', '>', '>=', '<', '<=', 'between', 'is_empty', 'is_not_empty'],
    'boolean': ['=', '!='],
    'reference': ['=', '!=', 'in', 'not in', 'is_empty', 'is_not_empty'],
    'array': ['in', 'not in', 'is_empty', 'is_not_empty'],
    'mixed': ['=', '!=', 'is_empty', 'is_not_empty']
  };
  
  return operatorMap[fieldType] || ['=', '!='];
}

/**
 * Check if field can be used for grouping
 */
function isGroupable(fieldType) {
  return ['string', 'number', 'boolean', 'reference', 'date'].includes(fieldType);
}

/**
 * Check if field can be sorted
 */
function isSortable(fieldType) {
  return ['string', 'number', 'date', 'boolean'].includes(fieldType);
}

/**
 * Format field name to human-readable label
 * - Removes "_id" suffix and replaces with cleaner names
 * - Handles nested paths with dots (e.g., handover_metadata.original_agent_id)
 * - Converts snake_case and camelCase to Title Case
 */
function formatLabel(fieldName) {
  // Split by dots to handle nested paths
  const parts = fieldName.split('.');
  
  const formattedParts = parts.map((part, index) => {
    // Remove _id suffix entirely for cleaner labels
    let cleanPart = part;
    if (cleanPart.endsWith('_id')) {
      cleanPart = cleanPart.slice(0, -3); // Remove '_id'
    } else if (cleanPart.endsWith('_ids')) {
      cleanPart = cleanPart.slice(0, -4) + 's'; // Remove '_ids', keep plural
    }
    
    // Convert to readable format
    let label = cleanPart
      .replace(/_/g, ' ')           // snake_case to spaces
      .replace(/([A-Z])/g, ' $1')   // camelCase to spaces
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Special case replacements for common abbreviations
    label = label
      .replace(/\bId\b/gi, 'ID')
      .replace(/\bNo\b/gi, 'Number')
      .replace(/\bVoip\b/gi, 'VoIP')
      .replace(/\bApi\b/gi, 'API')
      .replace(/\bUrl\b/gi, 'URL');
    
    return label;
  });
  
  // For nested paths, use " > " separator for clarity
  if (parts.length > 1) {
    return formattedParts.join(' > ');
  }
  
  return formattedParts[0];
}

/**
 * Get example value for field type
 */
function getExampleValue(fieldType, fieldName) {
  const examples = {
    'string': fieldName === 'email_from' ? 'john@example.com' : 'example',
    'number': 1000,
    'date': '2024-01-01',
    'boolean': true,
    'reference': 'objectid_here',
    'array': ['value1', 'value2']
  };
  
  return examples[fieldType] || null;
}

/**
 * Get all available operators
 */
function getAllOperators() {
  return [
    { operator: '=', label: 'Equals', types: ['string', 'number', 'boolean', 'reference', 'date'] },
    { operator: '!=', label: 'Not Equals', types: ['string', 'number', 'boolean', 'reference', 'date'] },
    { operator: '>', label: 'Greater Than', types: ['number', 'date'] },
    { operator: '>=', label: 'Greater or Equal', types: ['number', 'date'] },
    { operator: '<', label: 'Less Than', types: ['number', 'date'] },
    { operator: '<=', label: 'Less or Equal', types: ['number', 'date'] },
    { operator: 'ilike', label: 'Contains (case-insensitive)', types: ['string'] },
    { operator: 'like', label: 'Contains (case-sensitive)', types: ['string'] },
    { operator: 'in', label: 'In List', types: ['string', 'number', 'reference', 'array'] },
    { operator: 'not in', label: 'Not In List', types: ['string', 'number', 'reference', 'array'] },
    { operator: 'between', label: 'Between (range)', types: ['number', 'date'] },
    { operator: 'is_empty', label: 'Is Empty/Null', types: ['string', 'number', 'reference', 'date', 'array'] },
    { operator: 'is_not_empty', label: 'Is Not Empty/Null', types: ['string', 'number', 'reference', 'date', 'array'] }
  ];
}

/**
 * Build value lists for Team model
 */
async function buildTeamValueOptions() {
  const valuesByField = {};

  try {
    // Mail Server -> mailserver_id (Settings type: mailservers)
    if (mongoose.models.Settings) {
      const Settings = mongoose.models.Settings;
      const mailServers = await Settings.find({ type: 'mailservers' })
        .select('_id name info')
        .sort({ name: 1 })
        .lean();
      valuesByField.mailserver_id = (mailServers || []).map((s) => ({
        _id: s._id.toString(),
        value: s.name || (s.info && s.info.admin_email) || 'Unknown Mail Server',
      }));
      valuesByField.mailservers = (valuesByField.mailserver_id || []).slice();
    } else {
      const coll = mongoose.connection && mongoose.connection.db && mongoose.connection.db.collection('settings');
      if (coll) {
        const mailServers = await coll.find({ type: 'mailservers' }).project({ _id: 1, name: 1, info: 1 }).toArray();
        const mailServerOptions = (mailServers || []).map((s) => ({
          _id: s._id.toString(),
          value: s.name || (s.info && s.info.admin_email) || 'Unknown Mail Server',
        }));
        valuesByField.mailserver_id = mailServerOptions;
        valuesByField.mailservers = mailServerOptions;
      }
    }

    // VoIP Server -> voipserver_id (Settings type: voipservers)
    if (mongoose.models.Settings) {
      const Settings = mongoose.models.Settings;
      const voipServers = await Settings.find({ type: 'voipservers' })
        .select('_id name info')
        .sort({ name: 1 })
        .lean();
      valuesByField.voipserver_id = (voipServers || []).map((s) => ({
        _id: s._id.toString(),
        value: s.name || (s.info && s.info.server) || 'Unknown VoIP Server',
      }));
    } else {
      const coll = mongoose.connection && mongoose.connection.db && mongoose.connection.db.collection('settings');
      if (coll) {
        const voipServers = await coll.find({ type: 'voipservers' }).project({ _id: 1, name: 1, info: 1 }).toArray();
        valuesByField.voipserver_id = (voipServers || []).map((s) => ({
          _id: s._id.toString(),
          value: s.name || (s.info && s.info.server) || 'Unknown VoIP Server',
        }));
      }
    }

    // PDF Templates -> pdf_templates (PdfTemplate model)
    if (mongoose.models.PdfTemplate) {
      const PdfTemplate = mongoose.models.PdfTemplate;
      const templates = await PdfTemplate.find({ active: { $ne: false } })
        .select('_id name template_name')
        .sort({ name: 1 })
        .lean();
      valuesByField.pdf_templates = (templates || []).map((t) => ({
        _id: t._id.toString(),
        value: t.name || t.template_name || 'Unknown Template',
      }));
    } else {
      const coll = mongoose.connection && mongoose.connection.db && mongoose.connection.db.collection('pdftemplates');
      if (coll) {
        const templates = await coll.find({ active: { $ne: false } }).project({ _id: 1, name: 1, template_name: 1 }).toArray();
        valuesByField.pdf_templates = (templates || []).map((t) => ({
          _id: t._id.toString(),
          value: t.name || t.template_name || 'Unknown Template',
        }));
      }
    }

    // Banks -> banks (Bank model)
    if (mongoose.models.Bank) {
      const Bank = mongoose.models.Bank;
      const banks = await Bank.find({ state: { $ne: 'inactive' } })
        .select('_id name nickName')
        .sort({ name: 1 })
        .lean();
      valuesByField.banks = (banks || []).map((b) => ({
        _id: b._id.toString(),
        value: b.nickName ? b.name + ' (' + b.nickName + ')' : b.name || 'Unknown Bank',
      }));
    }

    // Agents -> agent_id (User model)
    if (mongoose.models.User) {
      const User = mongoose.models.User;
      const agents = await User.find({ active: { $ne: false }, role: { $in: ['Agent', 'Admin', 'Manager'] } })
        .select('_id login')
        .sort({ login: 1 })
        .lean();
      valuesByField.agent_id = agents.map((u) => ({
        _id: u._id.toString(),
        value: u.login || 'Unknown User',
      }));
    }

    // Active boolean
    valuesByField.active = [
      { _id: true, value: 'Yes' },
      { _id: false, value: 'No' },
    ];

  } catch (error) {
    logger.error('Error building Team value options for metadata:', error);
  }

  return valuesByField;
}

/**
 * Get list of available models
 */
function getAvailableModels() {
  const mongoose = require('mongoose');
  return Object.keys(mongoose.models);
}

