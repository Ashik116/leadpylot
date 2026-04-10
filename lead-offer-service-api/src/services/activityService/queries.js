/**
 * Activity Service Queries
 * Functions for retrieving activity data
 * 
 * This is the central activity query service for the entire system.
 * All activities (leads, offers, emails, tasks, etc.) are queried from here.
 */

const { Activity } = require('../../models');
const logger = require('../../utils/logger');
const mongoose = require('mongoose');
const Board = require('../../models/Board');
const List = require('../../models/List');

/**
 * Normalize subject_type for DB query (e.g. 'email' -> 'Email')
 * @param {string} s - Raw subject type
 * @returns {string} - Normalized subject type
 */
const normalizeSubjectType = (s) => {
  const t = (s || '').trim();
  if (t.toLowerCase() === 'email') return 'Email';
  return t;
};

/**
 * Get subject_type filter for query.
 * - When subject_type=Email: return Email activities + Lead activities that have metadata.email_id (exclude lead updates, etc.)
 * - When subject_type=Lead: only Lead activities with metadata.email_id
 * @param {string} subjectType - Raw subject type from query
 * @returns {Object} - Query conditions to merge into main query (use Object.assign)
 */
const getSubjectTypeFilter = (subjectType) => {
  if (!subjectType) return undefined;
  if (subjectType.includes(',')) {
    return { subject_type: { $in: subjectType.split(',').map((s) => normalizeSubjectType(s.trim())) } };
  }
  const norm = normalizeSubjectType(subjectType);
  const emailIdExists = { 'metadata.email_id': { $exists: true, $ne: null } };
  if (norm === 'Email') {
    // Email activities + Lead activities that have email_id; exclude Lead activities without email_id (e.g. "Lead updated: Email field")
    return {
      $and: [
        {
          $or: [
            { subject_type: 'Email' },
            { subject_type: 'Lead', ...emailIdExists },
          ],
        },
      ],
    };
  }
  if (norm === 'Lead' || (norm && norm.toLowerCase() === 'lead')) {
    return { subject_type: 'Lead', ...emailIdExists };
  }
  return { subject_type: norm };
};

/**
 * Safely convert a value to ObjectId
 * @param {string|ObjectId} value - Value to convert
 * @returns {ObjectId} - Mongoose ObjectId
 */
const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

/**
 * Reorder activities to put the one with metadata.email_id === sortEmailId at index 0.
 * Only applies when subject_type is Email and sort_email is provided.
 * @param {Array} activities - Array of activity documents
 * @param {string} sortEmailId - Email ID to sort to index 0
 * @param {string} subjectType - Subject type from query
 * @returns {Array} - Reordered activities
 */
const applySortEmail = (activities, sortEmailId, subjectType) => {
  if (!Array.isArray(activities) || !sortEmailId || !subjectType) return activities;
  const norm = (subjectType || '').trim().toLowerCase();
  if (norm !== 'email') return activities;

  const sortIdStr = typeof sortEmailId === 'string' ? sortEmailId : (sortEmailId && sortEmailId.toString ? sortEmailId.toString() : '');
  if (!sortIdStr) return activities;

  const idx = activities.findIndex((a) => {
    const eid = a.metadata?.email_id;
    if (!eid) return false;
    const eidStr = typeof eid === 'string' ? eid : eid.toString();
    return eidStr === sortIdStr;
  });
  if (idx <= 0) return activities;

  const [pinned] = activities.splice(idx, 1);
  return [pinned, ...activities];
};

/**
 * Build sort object from options
 * @param {Object} options - Query options
 * @returns {Object} - MongoDB sort object
 */
const buildSortObject = (options) => {
  const { sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  
  const validSortFields = ['createdAt', 'action', 'type', 'subject_type', 'updatedAt'];
  const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  
  return { [field]: sortDirection };
};

/**
 * Enrich email-related activities with From_email, email_body, and attachment from the Email model.
 * @param {Array} activities - Array of activity documents
 * @returns {Promise<Array>} - Activities with enriched metadata
 */
const enrichEmailActivities = async (activities) => {
  if (!Array.isArray(activities) || activities.length === 0) {
    return activities;
  }
  const emailIds = new Set();
  for (const a of activities) {
    const emailId = a.metadata?.email_id;
    if (emailId) {
      emailIds.add(typeof emailId === 'string' ? emailId : emailId.toString());
    }
  }
  if (emailIds.size === 0) return activities;
  try {
    const { Email } = require('../../models');
    const emails = await Email.find({ _id: { $in: Array.from(emailIds).map((id) => toObjectId(id)) } })
      .select('from from_address body html_body attachments')
      .lean();
    const emailMap = new Map(emails.map((e) => [e._id.toString(), e]));
    return activities.map((act) => {
      const emailId = act.metadata?.email_id;
      if (!emailId) return act;
      const idStr = typeof emailId === 'string' ? emailId : emailId.toString();
      const email = emailMap.get(idStr);
      if (!email) return act;
      const meta = { ...act.metadata };
      meta.From_email = email.from_address || email.from || null;
      meta.email_body = email.body || email.html_body || null;
      meta.attachment = Array.isArray(email.attachments)
        ? email.attachments.map((a) => ({
            document_id: a.document_id,
            filename: a.filename,
            size: a.size,
            mime_type: a.mime_type,
          }))
        : [];
      return { ...act, metadata: meta };
    });
  } catch (err) {
    logger.warn('Failed to enrich email activities', { error: err.message });
    return activities;
  }
};

/**
 * Populate board and list names in activity metadata for transfer actions
 * @param {Array} activities - Array of activity documents
 * @returns {Promise<Array>} - Activities with populated board/list names
 */
const populateBoardListNames = async (activities) => {
  if (!Array.isArray(activities) || activities.length === 0) {
    return activities;
  }

  // Collect all board and list IDs from transfer activities
  const boardIds = new Set();
  const listIds = new Set();

  // Helper to extract ID string from various formats
  const extractIdString = (id) => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id._id) return id._id.toString();
    if (id.toString) return id.toString();
    return String(id);
  };

  for (const activity of activities) {
    if (activity.action === 'transfer' && activity.metadata) {
      const meta = activity.metadata;
      
      // Collect board IDs
      if (meta.oldBoardId && Array.isArray(meta.oldBoardId)) {
        meta.oldBoardId.forEach(id => {
          const idStr = extractIdString(id);
          if (idStr) boardIds.add(idStr);
        });
      }
      if (meta.newBoardId && Array.isArray(meta.newBoardId)) {
        meta.newBoardId.forEach(id => {
          const idStr = extractIdString(id);
          if (idStr) boardIds.add(idStr);
        });
      }
      
      // Collect list IDs
      if (meta.oldListId && Array.isArray(meta.oldListId)) {
        meta.oldListId.forEach(id => {
          const idStr = extractIdString(id);
          if (idStr) listIds.add(idStr);
        });
      }
      if (meta.newListId && Array.isArray(meta.newListId)) {
        meta.newListId.forEach(id => {
          const idStr = extractIdString(id);
          if (idStr) listIds.add(idStr);
        });
      }
    }
  }

  // Fetch all boards and lists in one query
  const [boards, lists] = await Promise.all([
    boardIds.size > 0
      ? Board.find({ _id: { $in: Array.from(boardIds).map(id => new mongoose.Types.ObjectId(id)) } })
          .select('_id name')
          .lean()
      : Promise.resolve([]),
    listIds.size > 0
      ? List.find({ _id: { $in: Array.from(listIds).map(id => new mongoose.Types.ObjectId(id)) } })
          .select('_id listTitle')
          .lean()
      : Promise.resolve([]),
  ]);

  // Create lookup maps
  const boardMap = new Map(boards.map(b => [b._id.toString(), b.name]));
  const listMap = new Map(lists.map(l => [l._id.toString(), l.listTitle]));

  // Populate metadata for transfer activities
  return activities.map(activity => {
    if (activity.action === 'transfer' && activity.metadata) {
      const meta = { ...activity.metadata };
      
      // Populate oldBoardId - return just the name as string (no _id object)
      if (meta.oldBoardId && Array.isArray(meta.oldBoardId)) {
        meta.oldBoardId = meta.oldBoardId.map(id => {
          const idStr = extractIdString(id);
          const name = idStr ? boardMap.get(idStr) : null;
          return name || idStr || id;
        });
      }
      
      // Populate newBoardId - return just the name as string (no _id object)
      if (meta.newBoardId && Array.isArray(meta.newBoardId)) {
        meta.newBoardId = meta.newBoardId.map(id => {
          const idStr = extractIdString(id);
          const name = idStr ? boardMap.get(idStr) : null;
          return name || idStr || id;
        });
      }
      
      // Populate oldListId - return just the listTitle as string (no _id object)
      if (meta.oldListId && Array.isArray(meta.oldListId)) {
        meta.oldListId = meta.oldListId.map(id => {
          const idStr = extractIdString(id);
          const listTitle = idStr ? listMap.get(idStr) : null;
          return listTitle || idStr || id;
        });
      }
      
      // Populate newListId - return just the listTitle as string (no _id object)
      if (meta.newListId && Array.isArray(meta.newListId)) {
        meta.newListId = meta.newListId.map(id => {
          const idStr = extractIdString(id);
          const listTitle = idStr ? listMap.get(idStr) : null;
          return listTitle || idStr || id;
        });
      }
      
      return {
        ...activity,
        metadata: meta,
      };
    }
    
    return activity;
  });
};

/**
 * Get activities for a specific user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (pagination, filters)
 * @returns {Promise<Object>} - Paginated activities with metadata
 */
const getActivitiesByUser = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    subject_type,
    subject_id,
    sort_email,
    action,
    type,
    startDate,
    endDate,
    search,
    // Optional: filter by is_task flag
    is_task,
  } = options;
  const skip = (page - 1) * parseInt(limit);

  const { Offer } = require('../../models');
  const { Lead } = require('../../models');

  const userIdObj = toObjectId(userId);
  if (!userIdObj) {
    throw new Error('Invalid user ID');
  }

  // Build sort object
  const sortObj = buildSortObject(options);

  // Agent sees: (1) activities they created, or (2) activities where they are related (assigned, to_agent, etc.)
  const userIdStr = userIdObj.toString();
  const agentRelatedConditions = [
    { creator: userIdObj },
    { 'metadata.agent_id': userIdObj },
    { 'metadata.agent_id': userIdStr },
    { 'metadata.assigned': userIdObj },
    { 'metadata.assigned': userIdStr },
    { 'metadata.to_agent.id': userIdObj },
    { 'metadata.to_agent.id': userIdStr },
    { 'metadata.from_agent.id': userIdObj },
    { 'metadata.from_agent.id': userIdStr },
  ];

  // If filtering by subject_id, agent must have access to that subject (own lead/offer/email)
  if (subject_id) {
    const subjectIdObj = toObjectId(subject_id);
    if (!subjectIdObj) {
      throw new Error('Invalid subject ID');
    }

    const { Email } = require('../../models');
    const subjectTypeNorm = (subject_type || '').trim();

    let hasAccess = false;
    if (!subject_type || subjectTypeNorm === 'Offer') {
      const offer = await Offer.findById(subjectIdObj).select('agent_id').lean();
      if (offer && offer.agent_id && offer.agent_id.toString() === userIdStr) {
        hasAccess = true;
      }
    }
    if (!hasAccess && (!subject_type || subjectTypeNorm === 'Lead')) {
      const lead = await Lead.findById(subjectIdObj).select('user_id').lean();
      if (lead && lead.user_id && lead.user_id.toString() === userIdStr) {
        hasAccess = true;
      }
    }
    // When subject_type=Email, subject_id can be lead ID (email activities for lead) or email ID
    if (!hasAccess && (subjectTypeNorm === 'Email' || subjectTypeNorm.toLowerCase() === 'email')) {
      const lead = await Lead.findById(subjectIdObj).select('user_id').lean();
      if (lead && lead.user_id && lead.user_id.toString() === userIdStr) {
        hasAccess = true;
      }
      if (!hasAccess) {
        const email = await Email.findById(subjectIdObj).select('lead_id assigned_agent').lean();
        if (email) {
          if (email.assigned_agent && email.assigned_agent.toString() === userIdStr) {
            hasAccess = true;
          }
          if (!hasAccess && email.lead_id) {
            const emailLead = await Lead.findById(email.lead_id).select('user_id').lean();
            if (emailLead && emailLead.user_id && emailLead.user_id.toString() === userIdStr) {
              hasAccess = true;
            }
          }
        }
      }
    }
    if (!hasAccess) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const query = {
      $or: agentRelatedConditions,
      subject_id: subjectIdObj,
    };

    // Filter by is_task if provided
    if (typeof is_task === 'boolean') {
      query.is_task = is_task;
    }

    // Apply subject_type filter (Email/Lead: only email-related activities, i.e. Lead must have metadata.email_id)
    const subjectTypeFilter = getSubjectTypeFilter(subject_type);
    if (subjectTypeFilter) {
      Object.assign(query, subjectTypeFilter);
    }
    if (action) {
      if (action.includes(',')) {
        query.action = { $in: action.split(',').map(a => a.trim()) };
      } else {
        query.action = action;
      }
    }
    if (type) {
      query.type = type;
    }
    if (search) {
      query.message = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }

    try {
      const [activities, total] = await Promise.all([
        Activity.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('creator', 'login first_name last_name name email')
          .lean(),
        Activity.countDocuments(query),
      ]);

      // Populate board/list names for transfer activities
      const populatedActivities = await populateBoardListNames(activities);
      const enrichedActivities = await enrichEmailActivities(populatedActivities);
      const sortedActivities = applySortEmail(enrichedActivities, sort_email, subject_type);

      return {
        data: sortedActivities,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting activities by user', { error, userId });
      throw error;
    }
  }

  // If no subject_id: agent sees (1) activities on their leads/offers where creator or related, (2) activities where they are assigned (e.g. metadata.agent_id – email assigned to agent)
  const [userOffers, userLeads] = await Promise.all([
    Offer.find({ agent_id: userIdObj }).select('_id').lean(),
    Lead.find({ user_id: userIdObj }).select('_id').lean(),
  ]);
  const userOfferIds = userOffers.map(o => o._id);
  const userLeadIds = userLeads.map(l => l._id);
  const subjectIds = [...userOfferIds, ...userLeadIds];

  const query =
    subjectIds.length > 0
      ? {
          $or: [
            { subject_id: { $in: subjectIds }, $or: agentRelatedConditions },
            { 'metadata.agent_id': userIdObj },
            { 'metadata.agent_id': userIdStr },
          ],
        }
      : { $or: agentRelatedConditions };

  // Apply subject_type filter (Email/Lead: only email-related activities)
  const subjectTypeFilter = getSubjectTypeFilter(subject_type);
  if (subjectTypeFilter) {
    Object.assign(query, subjectTypeFilter);
  }

  if (action) {
    if (action.includes(',')) {
      query.action = { $in: action.split(',').map(a => a.trim()) };
    } else {
      query.action = action;
    }
  }

  if (type) {
    query.type = type;
  }

  // Filter by is_task if provided
  if (typeof is_task === 'boolean') {
    query.is_task = is_task;
  }

  if (search) {
    query.message = { $regex: search, $options: 'i' };
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};

    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateTime;
    }
  }

  try {
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creator', 'login first_name last_name name email')
        .lean(),
      Activity.countDocuments(query),
    ]);

    // Populate board/list names for transfer activities
    const populatedActivities = await populateBoardListNames(activities);
    const enrichedActivities = await enrichEmailActivities(populatedActivities);
    const sortedActivities = applySortEmail(enrichedActivities, sort_email, subject_type);

    return {
      data: sortedActivities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Error getting activities by user', { error, userId });
    throw error;
  }
};

/**
 * Get all activities with filtering and pagination
 * @param {Object} options - Query options (pagination, filters)
 * @returns {Promise<Object>} - Paginated activities with metadata
 */
const getAllActivities = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    subject_type,
    subject_id,
    sort_email,
    action,
    type,
    startDate,
    endDate,
    creator_id,
    visibility,
    search,
    // Task-specific flag: when true/false, filter activities by is_task
    is_task,
  } = options;

  const skip = (page - 1) * parseInt(limit);
  const query = {};

  // Apply subject_type filter (Email/Lead: only email-related activities)
  const subjectTypeFilter = getSubjectTypeFilter(subject_type);
  if (subjectTypeFilter) {
    Object.assign(query, subjectTypeFilter);
  }

  if (subject_id) {
    const subjectIdObj = toObjectId(subject_id);
    if (subjectIdObj) {
      query.subject_id = subjectIdObj;
    }
  }

  if (action) {
    // Support multiple actions (comma-separated)
    if (action.includes(',')) {
      query.action = { $in: action.split(',').map(a => a.trim()) };
    } else {
      query.action = action;
    }
  }

  if (type) {
    query.type = type;
  }

  if (creator_id) {
    const creatorIdObj = toObjectId(creator_id);
    if (creatorIdObj) {
      query.creator = creatorIdObj;
    }
  }

  if (visibility) {
    query.visibility = visibility;
  }

  // Filter by is_task flag if provided
  if (typeof is_task === 'boolean') {
    query.is_task = is_task;
  }

  // Search in message field
  if (search) {
    query.message = { $regex: search, $options: 'i' };
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};

    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      // Set end date to end of day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateTime;
    }
  }

  // Build sort object
  const sortObj = buildSortObject(options);

  try {
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creator', 'login first_name last_name name email')
        .lean(),
      Activity.countDocuments(query),
    ]);

    // Populate board/list names for transfer activities
    const populatedActivities = await populateBoardListNames(activities);
    const enrichedActivities = await enrichEmailActivities(populatedActivities);
    const sortedActivities = applySortEmail(enrichedActivities, sort_email, subject_type);

    return {
      data: sortedActivities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Error getting all activities', { error });
    throw error;
  }
};

/**
 * Get a specific activity by ID
 * @param {string} id - Activity ID
 * @returns {Promise<Object>} - Activity document
 */
const getActivityById = async (id) => {
  try {
    const activity = await Activity.findById(id)
      .populate('creator', 'login first_name last_name name email')
      .lean();

    if (!activity) return activity;
    const [enriched] = await enrichEmailActivities([activity]);
    return enriched;
  } catch (error) {
    logger.error('Error getting activity by ID', { error, id });
    throw error;
  }
};

/**
 * Get activities with filters
 * @param {Object} filters - Query filters
 * @param {Object} options - Query options (pagination)
 * @returns {Promise<Object>} - Paginated activities with metadata
 */
const getActivities = async (filters = {}, options = {}) => {
  // This is a wrapper around getAllActivities for backward compatibility
  return getAllActivities({ ...options, ...filters });
};

/**
 * Get activities for a specific subject (lead, offer, email, etc.)
 * This is a convenience method that handles access control based on user role
 * 
 * @param {string} subjectId - The subject entity ID
 * @param {string} subjectType - The subject type (Lead, Offer, Email, etc.)
 * @param {Object} user - The requesting user
 * @param {Object} options - Query options (pagination, filters)
 * @returns {Promise<Object>} - Paginated activities with metadata
 */
const getActivitiesBySubject = async (subjectId, subjectType, user, options = {}) => {
  const {
    page = 1,
    limit = 20,
    action,
    type,
    startDate,
    endDate,
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * parseInt(limit);
  const subjectIdObj = toObjectId(subjectId);
  
  if (!subjectIdObj) {
    throw new Error('Invalid subject ID');
  }

  const { Offer, Lead } = require('../../models');
  const { ROLES } = require('../../middleware/roles/roleDefinitions');

  const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN;

  // Build base query (subject_type filter includes metadata.email_id for Lead)
  const query = {
    subject_id: subjectIdObj,
    ...getSubjectTypeFilter(subjectType),
  };

  // Agent: only activities they created or are related to (assigned, to_agent, etc.)
  if (!isAdmin) {
    const userIdObj = toObjectId(user._id);
    const userIdStr = user._id.toString();
    const agentRelatedConditions = [
      { creator: userIdObj },
      { 'metadata.agent_id': userIdObj },
      { 'metadata.agent_id': userIdStr },
      { 'metadata.assigned': userIdObj },
      { 'metadata.assigned': userIdStr },
      { 'metadata.to_agent.id': userIdObj },
      { 'metadata.to_agent.id': userIdStr },
      { 'metadata.from_agent.id': userIdObj },
      { 'metadata.from_agent.id': userIdStr },
    ];

    let hasAccess = false;
    if (subjectType === 'Lead') {
      const lead = await Lead.findById(subjectIdObj).select('user_id').lean();
      hasAccess = lead && lead.user_id && lead.user_id.toString() === userIdStr;
    } else if (subjectType === 'Offer') {
      const offer = await Offer.findById(subjectIdObj).select('agent_id').lean();
      hasAccess = offer && offer.agent_id && offer.agent_id.toString() === userIdStr;
    } else {
      hasAccess = true;
    }

    if (!hasAccess) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
    query.$or = agentRelatedConditions;
  }

  // Apply additional filters
  if (action) {
    if (action.includes(',')) {
      query.action = { $in: action.split(',').map(a => a.trim()) };
    } else {
      query.action = action;
    }
  }

  if (type) {
    query.type = type;
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateTime;
    }
  }

  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  try {
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creator', 'login first_name last_name name email')
        .lean(),
      Activity.countDocuments(query),
    ]);

    // Populate board/list names for transfer activities
    const populatedActivities = await populateBoardListNames(activities);
    const enrichedActivities = await enrichEmailActivities(populatedActivities);

    return {
      data: enrichedActivities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        subject_id: subjectId,
        subject_type: subjectType,
      },
    };
  } catch (error) {
    logger.error('Error getting activities by subject', { error, subjectId, subjectType });
    throw error;
  }
};

module.exports = {
  getActivitiesByUser,
  getAllActivities,
  getActivityById,
  getActivities,
  getActivitiesBySubject,
};

