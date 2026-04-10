/**
 * Activity Controller
 * Handles API requests related to activities
 * 
 * This is the central activity API for the entire system.
 * All activities (leads, offers, emails, tasks, etc.) should be queried from here.
 */

const {
  getActivitiesByUser,
  getAllActivities,
  getActivityById: fetchActivityById,
  getActivitiesBySubject,
} = require('../services/activityService/queries');
const { NotFoundError } = require('../helpers/errorHandler');
const { ROLES } = require('../middleware/roles/roleDefinitions');

/**
 * Get all activities with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - subject_type: Filter by entity type (Lead, Offer, Email, Task, etc.)
 * - subject_id: Filter by specific entity ID
 * - action: Filter by action (create, update, delete, assign, received, sent, etc.)
 * - type: Filter by status type (info, warning, error)
 * - startDate: Filter activities from this date (ISO format)
 * - endDate: Filter activities until this date (ISO format)
 * - creator_id: Filter by creator user ID (admin only)
 * - visibility: Filter by visibility (admin, self, all) - admin only
 * - search: Search in message field
 * - sortBy: Sort field (createdAt, action, type) - default: createdAt
 * - sortOrder: Sort order (asc, desc) - default: desc
 * - sort_email: When subject_type=Email, pin the activity with this email_id to index 0
 */
const getActivities = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Parse and validate limit
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100; // Cap at 100 for performance
    if (limit < 1) limit = 1;
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit,
      subject_type: req.query.subject_type,
      subject_id: req.query.subject_id,
      sort_email: req.query.sort_email,
      action: req.query.action,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      // Explicit is_task query param support (?is_task=true/false)
      is_task:
        typeof req.query.is_task !== 'undefined'
          ? req.query.is_task === 'true' || req.query.is_task === true
          : undefined,
    };

    // Optional: parse Odoo-style domain=[[field,"=",value], ...]
    // Example: domain=[["is_task","=",true],["subject_type","=","Lead"],["subject_id","=", "<ID>"],["action","=","comment"]]
    if (req.query.domain) {
      try {
        const domain = JSON.parse(req.query.domain);
        if (Array.isArray(domain)) {
          for (const condition of domain) {
            if (!Array.isArray(condition) || condition.length < 3) continue;
            const [field, operator, value] = condition;
            if (operator !== '=') continue;

            if (field === 'is_task') {
              options.is_task = !!value;
            } else if (field === 'subject_type' && !options.subject_type) {
              options.subject_type = value;
            } else if (field === 'subject_id' && !options.subject_id) {
              options.subject_id = value;
            } else if (field === 'action' && !options.action) {
              options.action = value;
            }
          }
        }
      } catch (e) {
        // Ignore invalid domain parameter; fall back to standard filters
      }
    }

    // Agent: own + related activities. Admin (and Super Admin): all activities.
    const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN;
    if (!isAdmin) {
      const result = await getActivitiesByUser(user._id, options);
      return res.json({
        status: 'success',
        message: 'Activities retrieved successfully',
        ...result,
      });
    }

    // Admin-only filters
    if (req.query.creator_id) {
      options.creator_id = req.query.creator_id;
    }
    if (req.query.visibility) {
      options.visibility = req.query.visibility;
    }

    // For admin users, show all activities
    const result = await getAllActivities(options);
    return res.json({
      status: 'success',
      message: 'Activities retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get activities for a specific subject (lead, offer, etc.)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Route: GET /activities/subject/:subjectType/:subjectId
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - action: Filter by action
 * - type: Filter by status type
 * - startDate: Filter from date
 * - endDate: Filter until date
 * - sortOrder: Sort order (asc, desc) - default: desc
 */
const getActivitiesForSubject = async (req, res, next) => {
  try {
    const { user } = req;
    const { subjectType, subjectId } = req.params;
    
    // Parse and validate limit
    let limit = parseInt(req.query.limit) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit,
      action: req.query.action,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await getActivitiesBySubject(subjectId, subjectType, user, options);
    
    return res.json({
      status: 'success',
      message: `Activities for ${subjectType} retrieved successfully`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific activity by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const activity = await fetchActivityById(id);

    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    // Admin/Super Admin: can view any. Agent: creator or related (metadata.agent_id, assigned, etc.)
    const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN;
    if (!isAdmin) {
      const creatorMatch = activity.creator && activity.creator.toString() === user._id.toString();
      const meta = activity.metadata || activity.details || {};
      const agentIdMatch = meta.agent_id && (meta.agent_id.toString() === user._id.toString());
      const assignedMatch = Array.isArray(meta.assigned) && meta.assigned.some((id) => id && id.toString() === user._id.toString());
      const toAgentMatch = meta.to_agent && meta.to_agent.id && meta.to_agent.id.toString() === user._id.toString();
      const fromAgentMatch = meta.from_agent && meta.from_agent.id && meta.from_agent.id.toString() === user._id.toString();
      if (!creatorMatch && !agentIdMatch && !assignedMatch && !toAgentMatch && !fromAgentMatch) {
        throw new NotFoundError('Activity not found');
      }
    }

    return res.json({
      status: 'success',
      message: 'Activity retrieved successfully',
      data: activity,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
  getActivitiesForSubject,
  getActivityById,
};

