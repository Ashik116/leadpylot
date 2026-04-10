/**
 * Activity Routes
 * API routes for activity-related operations
 * 
 * This is the central activity API for the entire system.
 * All activities (leads, offers, emails, tasks, etc.) should be queried from here.
 * 
 * Available Endpoints:
 * - GET /activities - Get all activities with filtering and pagination
 * - GET /activities/subject/:subjectType/:subjectId - Get activities for a specific entity
 * - GET /activities/:id - Get a specific activity by ID
 * 
 * Query Parameters for GET /activities:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - subject_type: Filter by entity type (Lead, Offer, Email, Task, etc.) - supports comma-separated
 * - subject_id: Filter by specific entity ID
 * - action: Filter by action (create, update, delete, received, sent, etc.) - supports comma-separated
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

const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticate } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /activities
 * @desc Get all activities with filtering and pagination
 * @access Private - Requires ACTIVITY_READ_OWN or ACTIVITY_READ_ALL permission
 * @params See query parameters above
 * 
 * Response format:
 * {
 *   status: 'success',
 *   message: 'Activities retrieved successfully',
 *   data: [...activities],
 *   meta: {
 *     total: number,
 *     page: number,
 *     limit: number,
 *     pages: number,
 *     hasNextPage: boolean,
 *     hasPrevPage: boolean
 *   }
 * }
 */
router.get(
  '/',
  authorizeAny([PERMISSIONS.ACTIVITY_READ_OWN, PERMISSIONS.ACTIVITY_READ_ALL]),
  activityController.getActivities
);

/**
 * @route GET /activities/subject/:subjectType/:subjectId
 * @desc Get activities for a specific entity (lead, offer, email, etc.)
 * @access Private - Requires ACTIVITY_READ_OWN or ACTIVITY_READ_ALL permission
 * @params subjectType - Entity type (Lead, Offer, Email, Task, etc.)
 * @params subjectId - Entity ID
 * @query page, limit, action, type, startDate, endDate, sortOrder
 * 
 * Example: GET /activities/subject/Lead/60a7b2c3d4e5f6g7h8i9j0k1
 */
router.get(
  '/subject/:subjectType/:subjectId',
  authorizeAny([PERMISSIONS.ACTIVITY_READ_OWN, PERMISSIONS.ACTIVITY_READ_ALL]),
  activityController.getActivitiesForSubject
);

/**
 * @route GET /activities/:id
 * @desc Get a specific activity by ID
 * @access Private - Requires ACTIVITY_READ_OWN or ACTIVITY_READ_ALL permission
 * 
 * Response format:
 * {
 *   status: 'success',
 *   message: 'Activity retrieved successfully',
 *   data: { ...activity }
 * }
 */
router.get(
  '/:id',
  authorizeAny([PERMISSIONS.ACTIVITY_READ_OWN, PERMISSIONS.ACTIVITY_READ_ALL]),
  activityController.getActivityById
);

module.exports = router;

