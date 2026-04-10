const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../helpers/errorHandler');
const models = require('../models');
const logger = require('../helpers/logger');

/**
 * Model configurations for group by operations
 * Defines available fields, permissions, and lookups for each table
 */
const MODEL_CONFIGS = {
  leads: {
    model: 'Lead',
    permissions: {
      view: PERMISSIONS.LEAD_VIEW_ALL,
      userFilterField: 'user_id',
    },
    fields: {
      stage: {
        type: 'string',
        label: 'Stage',
        lookup: {
          from: 'stages',
          localField: '_id.stage',
          foreignField: 'name',
          as: 'stageDetails',
        },
      },
      status: {
        type: 'string',
        label: 'Status',
        lookup: {
          from: 'statuses',
          localField: '_id.status',
          foreignField: 'name',
          as: 'statusDetails',
        },
      },
      source_id: {
        type: 'reference',
        label: 'Source',
        lookup: {
          from: 'sources',
          localField: '_id.source_id',
          foreignField: '_id',
          as: 'sourceDetails',
        },
      },
      team_id: {
        type: 'reference',
        label: 'Project',
        lookup: {
          from: 'teams',
          localField: '_id.team_id',
          foreignField: '_id',
          as: 'teamDetails',
        },
      },
      user_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.user_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      prev_team_id: {
        type: 'reference',
        label: 'Previous Project',
        lookup: {
          from: 'teams',
          localField: '_id.prev_team_id',
          foreignField: '_id',
          as: 'prevTeamDetails',
        },
      },
      prev_user_id: {
        type: 'reference',
        label: 'Previous Agent',
        lookup: {
          from: 'users',
          localField: '_id.prev_user_id',
          foreignField: '_id',
          as: 'prevUserDetails',
        },
      },
      source_team_id: {
        type: 'reference',
        label: 'Source Project',
        lookup: {
          from: 'teams',
          localField: '_id.source_team_id',
          foreignField: '_id',
          as: 'sourceTeamDetails',
        },
      },
      source_user_id: {
        type: 'reference',
        label: 'Source Agent',
        lookup: {
          from: 'users',
          localField: '_id.source_user_id',
          foreignField: '_id',
          as: 'sourceUserDetails',
        },
      },
      instance_id: { type: 'number', label: 'Instance' },
      closed_at: { type: 'date', label: 'Closed At' },
      closed_by_user_id: {
        type: 'reference',
        label: 'Closed By User',
        lookup: {
          from: 'users',
          localField: '_id.closed_by_user_id',
          foreignField: '_id',
          as: 'closedByUserDetails',
        },
      },
      closure_reason: { type: 'string', label: 'Closure Reason' },
      is_reverted: { type: 'boolean', label: 'Is Reverted' },
      reverted_at: { type: 'date', label: 'Reverted At' },
      reverted_by_user_id: {
        type: 'reference',
        label: 'Reverted By User',
        lookup: {
          from: 'users',
          localField: '_id.reverted_by_user_id',
          foreignField: '_id',
          as: 'revertedByUserDetails',
        },
      },
      closeLeadStatus: { type: 'string', label: 'Close Lead Status' },
      offer_ids: { type: 'array', label: 'Offer' },
      document_ids: { type: 'array', label: 'Document' },
      notes: { type: 'string', label: 'Notes' },
      tags: { type: 'array', label: 'Tags' },
      custom_fields: { type: 'mixed', label: 'Custom Fields' },
      voip_extension: { type: 'string', label: 'VoIP Extension' },
      project_closed_date: { type: 'date', label: 'Project Closed Date' },
      original_closure_reason: { type: 'string', label: 'Original Closure Reason' },
      original_closed_by_user_id: {
        type: 'reference',
        label: 'Original Closed By User',
        lookup: {
          from: 'users',
          localField: '_id.original_closed_by_user_id',
          foreignField: '_id',
          as: 'originalClosedByUserDetails',
        },
      },
      use_status: { type: 'enum', label: 'Use Status' },
      duplicate_status: { type: 'number', label: 'Duplicate Status' },
      active: { type: 'boolean', label: 'Active' },
      lead_date: { type: 'date', label: 'Lead Date' },
      contact_name: { type: 'string', label: 'Contact Name' },
      email_from: { type: 'string', label: 'Email From' },
      phone: { type: 'string', label: 'Phone' },
    },
    bulkSearchField: 'lead_source_no', // Field for bulk search
  },
  offers: {
    model: 'Offer',
    permissions: {
      view: PERMISSIONS.OFFER_VIEW_ALL,
      userFilterField: 'agent_id',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      current_stage: { type: 'string', label: 'Current Stage' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      agent_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.agent_id',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      project_id: {
        type: 'reference',
        label: 'Project',
        lookup: {
          from: 'teams',
          localField: '_id.project_id',
          foreignField: '_id',
          as: 'projectDetails',
        },
      },
      bank_id: {
        type: 'reference',
        label: 'Bank',
        lookup: {
          from: 'banks',
          localField: '_id.bank_id',
          foreignField: '_id',
          as: 'bankDetails',
        },
      },
      investment_volume: { type: 'number', label: 'Investment Volume' },
      active: { type: 'boolean', label: 'Active' },
      scheduled_date: { type: 'date', label: 'Scheduled Date' },
      scheduled_time: { type: 'string', label: 'Scheduled Time' },
      handover_notes: { type: 'string', label: 'Handover Notes' },
      'handover_metadata.original_agent_id': {
        type: 'reference',
        label: 'Original Handover Agent',
        lookup: {
          from: 'users',
          localField: '_id.handover_metadata.original_agent_id',
          foreignField: '_id',
          as: 'handoverOriginalAgentDetails',
        },
      },
      'handover_metadata.handover_at': { type: 'date', label: 'Handover Date' },
      'handover_metadata.handover_reason': { type: 'string', label: 'Handover Reason' },
      'pending_transfer.target_agent_id': {
        type: 'reference',
        label: 'Target Transfer Agent',
        lookup: {
          from: 'users',
          localField: '_id.pending_transfer.target_agent_id',
          foreignField: '_id',
          as: 'pendingTransferTargetAgentDetails',
        },
      },
      'pending_transfer.transfer_notes': { type: 'string', label: 'Transfer Notes' },
      'pending_transfer.scheduled_date': { type: 'date', label: 'Transfer Scheduled Date' },
      'pending_transfer.scheduled_time': { type: 'string', label: 'Transfer Scheduled Time' },
      'pending_transfer.status': { type: 'string', label: 'Transfer Status' },
      'pending_transfer.created_at': { type: 'date', label: 'Transfer Created Date' },
      'progression.opening.active': { type: 'boolean', label: 'Opening Active' },
      'progression.opening.completed_at': { type: 'date', label: 'Opening Completed At' },
      'progression.opening.completed_by': {
        type: 'reference',
        label: 'Opening Completed By',
        lookup: {
          from: 'users',
          localField: '_id.progression.opening.completed_by',
          foreignField: '_id',
          as: 'progressionOpeningCompletedByDetails',
        },
      },
      'progression.opening.files': { type: 'array', label: 'Opening Files' },
      'progression.opening.metadata': { type: 'mixed', label: 'Opening Metadata' },
      'progression.confirmation.active': { type: 'boolean', label: 'Confirmation Active' },
      'progression.confirmation.completed_at': { type: 'date', label: 'Confirmation Completed At' },
      'progression.confirmation.completed_by': {
        type: 'reference',
        label: 'Confirmation Completed By',
        lookup: {
          from: 'users',
          localField: '_id.progression.confirmation.completed_by',
          foreignField: '_id',
          as: 'progressionConfirmationCompletedByDetails',
        },
      },
      'progression.confirmation.files': { type: 'array', label: 'Confirmation Files' },
      'progression.confirmation.metadata': { type: 'mixed', label: 'Confirmation Metadata' },
      'progression.payment.active': { type: 'boolean', label: 'Payment Active' },
      'progression.payment.completed_at': { type: 'date', label: 'Payment Completed At' },
      'progression.payment.completed_by': {
        type: 'reference',
        label: 'Payment Completed By',
        lookup: {
          from: 'users',
          localField: '_id.progression.payment.completed_by',
          foreignField: '_id',
          as: 'progressionPaymentCompletedByDetails',
        },
      },
      'progression.payment.files': { type: 'array', label: 'Payment Files' },
      'progression.payment.amount': { type: 'number', label: 'Payment Amount' },
      'progression.payment.metadata': { type: 'mixed', label: 'Payment Metadata' },
      'progression.netto1.active': { type: 'boolean', label: 'Netto1 Active' },
      'progression.netto1.completed_at': { type: 'date', label: 'Netto1 Completed At' },
      'progression.netto1.completed_by': {
        type: 'reference',
        label: 'Netto1 Completed By',
        lookup: {
          from: 'users',
          localField: '_id.progression.netto1.completed_by',
          foreignField: '_id',
          as: 'progressionNetto1CompletedByDetails',
        },
      },
      'progression.netto1.files': { type: 'array', label: 'Netto1 Files' },
      'progression.netto1.amount': { type: 'number', label: 'Netto1 Amount' },
      'progression.netto1.bankerRate': { type: 'number', label: 'Netto1 Banker Rate' },
      'progression.netto1.agentRate': { type: 'number', label: 'Netto1 Agent Rate' },
      'progression.netto1.metadata': { type: 'mixed', label: 'Netto1 Metadata' },
      'progression.netto2.active': { type: 'boolean', label: 'Netto2 Active' },
      'progression.netto2.completed_at': { type: 'date', label: 'Netto2 Completed At' },
      'progression.netto2.completed_by': {
        type: 'reference',
        label: 'Netto2 Completed By',
        lookup: {
          from: 'users',
          localField: '_id.progression.netto2.completed_by',
          foreignField: '_id',
          as: 'progressionNetto2CompletedByDetails',
        },
      },
      'progression.netto2.files': { type: 'array', label: 'Netto2 Files' },
      'progression.netto2.amount': { type: 'number', label: 'Netto2 Amount' },
      'progression.netto2.bankerRate': { type: 'number', label: 'Netto2 Banker Rate' },
      'progression.netto2.agentRate': { type: 'number', label: 'Netto2 Agent Rate' },
      'progression.netto2.metadata': { type: 'mixed', label: 'Netto2 Metadata' },
      'progression.lost.active': { type: 'boolean', label: 'Lost Active' },
      'progression.lost.reason': { type: 'string', label: 'Lost Reason' },
      'progression.lost.marked_at': { type: 'date', label: 'Lost Marked At' },
      'progression.lost.marked_by': {
        type: 'reference',
        label: 'Lost Marked By',
        lookup: {
          from: 'users',
          localField: '_id.progression.lost.marked_by',
          foreignField: '_id',
          as: 'progressionLostMarkedByDetails',
        },
      },
      'progression.lost.metadata': { type: 'mixed', label: 'Lost Metadata' },
      timeline: { type: 'array', label: 'Timeline' },
      migration_v1_consolidated: { type: 'boolean', label: 'Migration V1 Consolidated' },
      created_at: { type: 'date', label: 'Created At' },
      updated_at: { type: 'date', label: 'Updated At' },
    },
  },
  openings: {
    model: 'Opening',
    permissions: {
      view: PERMISSIONS.OPENING_VIEW_ALL,
      userFilterField: 'agent_id',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      offer_id: {
        type: 'reference',
        label: 'Offer',
        lookup: {
          from: 'offers',
          localField: '_id.offer_id',
          foreignField: '_id',
          as: 'offerDetails',
        },
      },
      agent_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.agent_id',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      bank_id: {
        type: 'reference',
        label: 'Bank',
        lookup: {
          from: 'banks',
          localField: '_id.bank_id',
          foreignField: '_id',
          as: 'bankDetails',
        },
      },
      active: { type: 'boolean', label: 'Active' },
      created_at: { type: 'date', label: 'Created Date' },
    },
  },
  confirmations: {
    model: 'Confirmation',
    permissions: {
      view: PERMISSIONS.CONFIRMATION_VIEW_ALL,
      userFilterField: 'agent_id',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      offer_id: {
        type: 'reference',
        label: 'Offer',
        lookup: {
          from: 'offers',
          localField: '_id.offer_id',
          foreignField: '_id',
          as: 'offerDetails',
        },
      },
      opening_id: {
        type: 'reference',
        label: 'Opening',
        lookup: {
          from: 'openings',
          localField: '_id.opening_id',
          foreignField: '_id',
          as: 'openingDetails',
        },
      },
      agent_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.agent_id',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      bank_id: {
        type: 'reference',
        label: 'Bank',
        lookup: {
          from: 'banks',
          localField: '_id.bank_id',
          foreignField: '_id',
          as: 'bankDetails',
        },
      },
      active: { type: 'boolean', label: 'Active' },
      created_at: { type: 'date', label: 'Created Date' },
    },
  },
  paymentvouchers: {
    model: 'PaymentVoucher',
    permissions: {
      view: PERMISSIONS.PAYMENT_VIEW_ALL,
      userFilterField: 'agent_id',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      offer_id: {
        type: 'reference',
        label: 'Offer',
        lookup: {
          from: 'offers',
          localField: '_id.offer_id',
          foreignField: '_id',
          as: 'offerDetails',
        },
      },
      agent_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.agent_id',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      bank_id: {
        type: 'reference',
        label: 'Bank',
        lookup: {
          from: 'banks',
          localField: '_id.bank_id',
          foreignField: '_id',
          as: 'bankDetails',
        },
      },
      active: { type: 'boolean', label: 'Active' },
      created_at: { type: 'date', label: 'Created Date' },
    },
  },
  appointments: {
    model: 'Appointment',
    permissions: {
      view: PERMISSIONS.APPOINTMENT_VIEW_ALL,
      userFilterField: 'agent_id',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      agent_id: {
        type: 'reference',
        label: 'Agent',
        lookup: {
          from: 'users',
          localField: '_id.agent_id',
          foreignField: '_id',
          as: 'agentDetails',
        },
      },
      appointment_type: { type: 'string', label: 'Appointment Type' },
      appointment_date: { type: 'date', label: 'Appointment Date' },
      active: { type: 'boolean', label: 'Active' },
    },
  },
  todos: {
    model: 'Todo',
    permissions: {
      view: PERMISSIONS.TODO_VIEW_ALL,
      userFilterField: 'assigned_to',
    },
    fields: {
      status: { type: 'string', label: 'Status' },
      priority: { type: 'string', label: 'Priority' },
      lead_id: {
        type: 'reference',
        label: 'Lead',
        lookup: {
          from: 'leads',
          localField: '_id.lead_id',
          foreignField: '_id',
          as: 'leadDetails',
        },
      },
      assigned_to: {
        type: 'reference',
        label: 'Assigned To',
        lookup: {
          from: 'users',
          localField: '_id.assigned_to',
          foreignField: '_id',
          as: 'assignedToDetails',
        },
      },
      assigned_by: {
        type: 'reference',
        label: 'Assigned By',
        lookup: {
          from: 'users',
          localField: '_id.assigned_by',
          foreignField: '_id',
          as: 'assignedByDetails',
        },
      },
      due_date: { type: 'date', label: 'Due Date' },
      active: { type: 'boolean', label: 'Active' },
    },
  },
  banks: {
    model: 'Bank',
    permissions: {
      view: PERMISSIONS.BANK_VIEW_ALL,
    },
    fields: {
      name: { type: 'string', label: 'Bank Name' },
      active: { type: 'boolean', label: 'Active' },
    },
  },
  sources: {
    model: 'Source',
    permissions: {
      view: PERMISSIONS.SOURCE_VIEW_ALL,
    },
    fields: {
      name: { type: 'string', label: 'Source Name' },
      price: { type: 'number', label: 'Price' },
      active: { type: 'boolean', label: 'Active' },
    },
  },
};

/**
 * Get model configuration by table name
 */
const getModelConfig = (tableName) => {
  const config = MODEL_CONFIGS[tableName.toLowerCase()];
  if (!config) {
    throw new Error(
      `Invalid table name: ${tableName}. Available tables: ${Object.keys(MODEL_CONFIGS).join(', ')}`
    );
  }
  return config;
};

/**
 * Get model by table name
 */
const getModel = (tableName) => {
  const config = getModelConfig(tableName);
  const Model = models[config.model];
  if (!Model) {
    throw new Error(`Model ${config.model} not found`);
  }
  return Model;
};

/**
 * Group data by specified fields for any table
 * Supports both full table grouping and bulk search result grouping (for supported tables)
 */
const groupByTable = asyncHandler(async (req, res) => {
  const { user } = req;
  const {
    table,
    groupByFields,
    bulkSearchValues,
    showInactive = false,
    includeRecords = false,
  } = req.body;

  if (!table) {
    return res.status(400).json({
      message: 'Missing table parameter. Please specify which table to group.',
      availableTables: Object.keys(MODEL_CONFIGS),
    });
  }

  if (!groupByFields || !Array.isArray(groupByFields) || groupByFields.length === 0) {
    return res.status(400).json({
      message:
        'Missing or invalid groupByFields. Please provide an array of field names to group by.',
      example: { table: 'leads', groupByFields: ['status', 'stage'] },
    });
  }

  try {
    const config = getModelConfig(table);
    const Model = getModel(table);

    const allowedFields = Object.keys(config.fields);
    const invalidFields = groupByFields.filter((field) => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Invalid grouping fields for table '${table}': ${invalidFields.join(', ')}`,
        allowedFields,
      });
    }

    const baseQuery = {};

    if (config.permissions.view && !hasPermission(user.role, config.permissions.view)) {
      if (config.permissions.userFilterField && user._id) {
        baseQuery[config.permissions.userFilterField] = user._id;
      }
    }

    let isBulkSearch = false;
    let bulkSearchMeta = null;

    if (bulkSearchValues && Array.isArray(bulkSearchValues) && bulkSearchValues.length > 0) {
      if (!config.bulkSearchField) {
        return res.status(400).json({
          message: `Bulk search is not supported for table '${table}'`,
        });
      }

      isBulkSearch = true;
      const cleanedValues = [
        ...new Set(bulkSearchValues.filter((val) => val && val.toString().trim())),
      ];

      if (cleanedValues.length > 0) {
        baseQuery[config.bulkSearchField] = { $in: cleanedValues };
        bulkSearchMeta = {
          searchedValues: cleanedValues,
          totalSearched: cleanedValues.length,
          searchField: config.bulkSearchField,
        };
      } else {
        return res.status(400).json({
          message: 'No valid bulk search values provided',
          data: [],
        });
      }
    }

    if (config.fields.active && !showInactive) {
      baseQuery.active = true;
    }

    // Create a mapping between field names and safe keys (for fields with dots)
    const fieldToSafeKeyMap = {};
    const groupId = {};
    groupByFields.forEach((field) => {
      // Handle nested fields (e.g., 'progression.opening.active')
      // Create a safe key without dots for the _id object key
      // but use the original field path (with dots) for MongoDB field access
      const safeKey = field.includes('.') ? field.replace(/\./g, '_') : field;
      fieldToSafeKeyMap[field] = safeKey;
      
      // Use safe key for _id object, but original field path for MongoDB field access
      groupId[safeKey] = `$${field}`;
    });

    const pipeline = [
      { $match: baseQuery },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
          recordIds: { $push: '$_id' },
        },
      },
      { $sort: { count: -1 } },
    ];

    groupByFields.forEach((field) => {
      const fieldConfig = config.fields[field];
      if (fieldConfig && fieldConfig.lookup) {
        pipeline.push({ $lookup: fieldConfig.lookup });
      }
    });

    const groupedData = await Model.aggregate(pipeline);
    const totalRecordsCount = await Model.countDocuments(baseQuery);

    const formattedResults = groupedData.map((group) => {
      // Transform groupBy to use user-friendly labels instead of field names
      const groupByWithLabels = {};
      const groupByRaw = group._id;
      
      groupByFields.forEach((field) => {
        const fieldConfig = config.fields[field];
        const label = fieldConfig?.label || field; // Use label if available, otherwise fallback to field name
        // Use the safe key to access the value from groupByRaw
        const safeKey = fieldToSafeKeyMap[field];
        if (groupByRaw[safeKey] !== undefined) {
          groupByWithLabels[label] = groupByRaw[safeKey];
        }
      });

      const result = {
        groupBy: groupByWithLabels, // Use labels instead of raw field names
        count: group.count,
        percentage:
          totalRecordsCount > 0 ? ((group.count / totalRecordsCount) * 100).toFixed(2) : 0,
        recordIds: group.recordIds,
      };

      result.displayNames = {};

      groupByFields.forEach((field) => {
        const fieldConfig = config.fields[field];
        const label = fieldConfig?.label || field; // Use label for displayNames key too
        if (fieldConfig && fieldConfig.lookup) {
          const detailsKey = fieldConfig.lookup.as;
          if (group[detailsKey] && group[detailsKey].length > 0) {
            const detail = group[detailsKey][0];
            let displayName = '';
            if (detail.name) displayName = detail.name;
            else if (detail.firstName || detail.lastName)
              displayName = `${detail.firstName || ''} ${detail.lastName || ''}`.trim();
            else if (detail.contact_name) displayName = detail.contact_name;
            if (displayName) result.displayNames[label] = displayName; // Use label as key
          }
        }
      });

      return result;
    });

    // ✅ Fetch and populate actual records if requested
    if (includeRecords) {
      // Get all record IDs from grouped data
      const allRecordIds = formattedResults.flatMap((item) => item.recordIds);

      // Fetch records with population based on table
      let populatedRecords = [];

      if (table === 'leads') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('source_id', 'name price active color')
          .populate('team_id', 'name')
          .populate('user_id', 'firstName lastName email')
          .lean();
      } else if (table === 'offers') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('agent_id', 'firstName lastName email')
          .populate('project_id', 'name color_code')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .lean();
      } else if (table === 'openings') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('offer_id', 'investment_volume')
          .populate('agent_id', 'firstName lastName email')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .lean();
      } else if (table === 'confirmations') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('offer_id', 'investment_volume')
          .populate('opening_id')
          .populate('agent_id', 'firstName lastName email')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .lean();
      } else if (table === 'paymentvouchers') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('offer_id', 'investment_volume')
          .populate('agent_id', 'firstName lastName email')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .lean();
      } else if (table === 'appointments') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('agent_id', 'firstName lastName email')
          .lean();
      } else if (table === 'todos') {
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } })
          .populate('lead_id', 'contact_name phone email_from')
          .populate('assigned_to', 'firstName lastName email')
          .populate('assigned_by', 'firstName lastName email')
          .lean();
      } else {
        // For other tables, just fetch without special population
        populatedRecords = await Model.find({ _id: { $in: allRecordIds } }).lean();
      }

      // Create a map of records by ID for quick lookup
      const recordsMap = {};
      populatedRecords.forEach((record) => {
        recordsMap[record._id.toString()] = record;
      });

      // Add populated records to each group item
      formattedResults.forEach((item) => {
        item.records = item.recordIds.map((id) => recordsMap[id.toString()]).filter(Boolean);
      });
    }

    // ✅ NEW LOGIC: Transform into grouped object (by first groupBy field)
    const groupedResponse = {};
    const primaryField = groupByFields[0];
    const primaryFieldLabel = config.fields[primaryField]?.label || primaryField; // Get label for primary field

    formattedResults.forEach((item) => {
      const key = item.groupBy[primaryFieldLabel] ?? 'Unknown'; // Use label to get the key
      if (!groupedResponse[key]) groupedResponse[key] = [];
      groupedResponse[key].push(item);
    });

    // Build meta info
    const meta = {
      table,
      totalRecords: totalRecordsCount,
      totalGroups: groupedData.length,
      groupByFields,
      isBulkSearch,
      appliedFilters: {
        showInactive,
        userFiltered: config.permissions.view && !hasPermission(user.role, config.permissions.view),
      },
    };

    if (isBulkSearch && bulkSearchMeta) {
      const recordsInGroups = await Model.find(baseQuery).distinct(config.bulkSearchField);
      const foundValues = [...new Set(recordsInGroups)];
      const missedValues = bulkSearchMeta.searchedValues.filter(
        (value) => !foundValues.includes(value)
      );

      meta.bulkSearch = {
        ...bulkSearchMeta,
        foundValues,
        missedValues,
        totalFound: foundValues.length,
        totalMissed: missedValues.length,
        message: `Grouped ${totalRecordsCount} records from ${foundValues.length}/${bulkSearchMeta.totalSearched} ${config.bulkSearchField} values`,
      };
    }

    // ✅ Final structured response
    return res.status(200).json({
      success: true,
      data: groupedResponse,
      meta,
    });
  } catch (error) {
    logger.error('Error in groupByTable:', {
      error: error.message,
      stack: error.stack,
      table,
      groupByFields,
      isBulkSearch: !!bulkSearchValues,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to group data',
      error: error.message,
    });
  }
});

/**
 * Get available tables and their grouping options
 */
const getAvailableTables = asyncHandler(async (req, res) => {
  const { user } = req;

  const tables = await Promise.all(Object.entries(MODEL_CONFIGS).map(async ([tableName, config]) => {
    // Check if user has permission to view this table
    const hasViewPermission =
      !config.permissions.view || await hasPermission(user.role, config.permissions.view);

    return {
      table: tableName,
      label: config.model,
      hasPermission: hasViewPermission,
      supportsBulkSearch: !!config.bulkSearchField,
      bulkSearchField: config.bulkSearchField || null,
      fields: Object.entries(config.fields).map(([fieldName, fieldConfig]) => ({
        value: fieldName,
        label: fieldConfig.label,
        type: fieldConfig.type,
        hasLookup: !!fieldConfig.lookup,
      })),
    };
  }));

  return res.status(200).json({
    success: true,
    data: tables,
  });
});

/**
 * Get grouping options for a specific table
 */
const getTableGroupByOptions = asyncHandler(async (req, res) => {
  const { table } = req.params;

  try {
    const config = getModelConfig(table);

    const options = Object.entries(config.fields).map(([fieldName, fieldConfig]) => ({
      value: fieldName,
      label: fieldConfig.label,
      type: fieldConfig.type,
      hasLookup: !!fieldConfig.lookup,
    }));

    return res.status(200).json({
      success: true,
      table,
      supportsBulkSearch: !!config.bulkSearchField,
      bulkSearchField: config.bulkSearchField || null,
      data: options,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      availableTables: Object.keys(MODEL_CONFIGS),
    });
  }
});

/**
 * Get group summary statistics for a specific table
 * Provides high-level statistics across all groups
 */
const getTableGroupSummary = asyncHandler(async (req, res) => {
  const { user } = req;
  const { table, groupByField, bulkSearchValues, showInactive = false } = req.body;

  if (!table) {
    return res.status(400).json({
      message: 'Missing table parameter',
      availableTables: Object.keys(MODEL_CONFIGS),
    });
  }

  if (!groupByField) {
    return res.status(400).json({
      message: 'Missing groupByField parameter',
    });
  }

  try {
    // Get model configuration
    const config = getModelConfig(table);
    const Model = getModel(table);

    // Build base query
    const baseQuery = {};

    // Apply user-based filtering
    if (config.permissions.view && !hasPermission(user.role, config.permissions.view)) {
      if (config.permissions.userFilterField && user._id) {
        baseQuery[config.permissions.userFilterField] = user._id;
      }
    }

    // Handle bulk search
    if (bulkSearchValues && Array.isArray(bulkSearchValues) && bulkSearchValues.length > 0) {
      if (!config.bulkSearchField) {
        return res.status(400).json({
          message: `Bulk search is not supported for table '${table}'`,
        });
      }

      const cleanedValues = [
        ...new Set(bulkSearchValues.filter((val) => val && val.toString().trim())),
      ];
      if (cleanedValues.length > 0) {
        baseQuery[config.bulkSearchField] = { $in: cleanedValues };
      }
    }

    // Apply active filter
    if (config.fields.active && !showInactive) {
      baseQuery.active = true;
    }

    // Get summary statistics
    const summary = await Model.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: `$${groupByField}`,
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalGroups: { $sum: 1 },
          minRecordsPerGroup: { $min: '$count' },
          maxRecordsPerGroup: { $max: '$count' },
          avgRecordsPerGroup: { $avg: '$count' },
          totalRecords: { $sum: '$count' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      table,
      groupByField,
      data: summary.length > 0 ? summary[0] : null,
    });
  } catch (error) {
    logger.error('Error in getTableGroupSummary:', {
      error: error.message,
      table,
      groupByField,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get group summary',
      error: error.message,
    });
  }
});

module.exports = {
  groupByTable,
  getAvailableTables,
  getTableGroupByOptions,
  getTableGroupSummary,
};
