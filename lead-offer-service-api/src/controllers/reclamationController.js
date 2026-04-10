const reclamationService = require('../services/reclamationService');
// const notificationService = require('../services/notificationService');
// const { User } = require('../models/user');
// const logger = require('../helpers/logger');
const { ROLES } = require('../middleware/roles/roleDefinitions');

    /**
     * Create reclamation request(s) - handles both single and bulk operations
     */
    async function createReclamation(req, res, next) {
    try {
        // Check if this is a bulk operation (has 'leads' array)
        if (req.body.leads && Array.isArray(req.body.leads)) {
        return await createBulkReclamations(req, res, next);
        }

        // Single reclamation creation
        return await createSingleReclamation(req, res, next);
    } catch (error) {
        next(error);
    }
    }

    /**
     * Create a single reclamation request
     */
    async function createSingleReclamation(req, res, next) {
    try {
        // Validate required fields
        if (!req.body.lead_id) {
        return res.status(400).json({
            status: 'error',
            message: 'Lead ID is required for reclamation requests',
        });
        }

        if (!req.body.reason) {
        return res.status(400).json({
            status: 'error',
            message: 'Reason is required for reclamation requests',
        });
        }

        const reclamationData = {
        project_id: req.body.project_id,
        agent_id: req.body.agent_id,
        lead_id: req.body.lead_id,
        reason: req.body.reason,
        status: 0, // Default to pending (reclamation workflow status)
        };
        // If frontend sends desired lead status_id (24-char ObjectId), pass it so the lead's stage/status get updated
        if (
          req.body.status &&
          typeof req.body.status === 'string' &&
          /^[a-fA-F0-9]{24}$/.test(req.body.status)
        ) {
          reclamationData.lead_status_id = req.body.status;
        }

        // Try to create the reclamation
        let reclamation;
        try {
        reclamation = await reclamationService.createReclamation(reclamationData, req.user);
        } catch (validationError) {
        // Handle validation errors from the service
        return res.status(400).json({
            status: 'error',
            message: validationError.message,
        });
        }

        // TODO: Temporarily commented out notification functionality
        /*
        // Find admin users for notification
        const adminUsers = await User.find({ role: ROLES.ADMIN }).select('info login').exec();

        // Find provider users for notification
        const providerUsers = await User.find({ role: ROLES.PROVIDER }).select('info login').exec();

        // Get agent details for notification
        const agent = await User.findById(reclamation.agent_id).select('info login').exec();

        // Send notifications via email
        try {
        await notificationService.sendNewReclamationNotification(
            reclamation,
            adminUsers,
            providerUsers,
            agent || { info: { email: 'unknown@example.com' } }
        );

        logger.info('Reclamation notification emails sent', {
            reclamationId: reclamation._id,
            adminCount: adminUsers.length,
            providerCount: providerUsers.length,
        });
        } catch (error) {
        logger.error('Failed to send reclamation notification emails', {
            error: error.message,
            reclamationId: reclamation._id,
        });
        // Continue processing even if email fails
        }
        */

        res.status(201).json({
        status: 'success',
        data: reclamation,
        });
    } catch (error) {
        next(error);
    }
    }

    /**
     * Create multiple reclamation requests in bulk
     */
    async function createBulkReclamations(req, res, next) {
    try {
        // Validate bulk request format
        if (!req.body.leads || !Array.isArray(req.body.leads) || req.body.leads.length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Bulk request must contain a non-empty "leads" array',
        });
        }

        if (!req.body.reason) {
        return res.status(400).json({
            status: 'error',
            message: 'Reason is required for bulk reclamation requests',
        });
        }

        // Create reclamation data array with single reason applied to all leads
        const reclamationDataArray = req.body.leads.map((lead_id) => ({
        project_id: req.body.project_id, // Optional field
        agent_id: req.body.agent_id,
        lead_id: lead_id,
        reason: req.body.reason, // Single reason for all leads
        status: 0, // Default to pending
        }));

        // Validate each lead_id in the array
        for (let i = 0; i < reclamationDataArray.length; i++) {
        const item = reclamationDataArray[i];

        if (!item.lead_id) {
            return res.status(400).json({
            status: 'error',
            message: `Lead ID is required for reclamation request at index ${i}`,
            });
        }
        }

        // Create bulk reclamations
        const results = await reclamationService.createReclamation(reclamationDataArray, req.user);

        // Return bulk results
        res.status(201).json({
        status: 'success',
        message: `Bulk reclamation completed: ${results.successCount} successful, ${results.failureCount} failed`,
        data: {
            summary: {
            total: results.total,
            successful: results.successCount,
            failed: results.failureCount,
            },
            results: {
            successful: results.success,
            failed: results.failed,
            },
        },
        });
    } catch (error) {
        next(error);
    }
    }

    /**
     * Get all reclamation requests with pagination
     */
    async function getReclamations(req, res, next) {
    try {
        // Extract pagination parameters
        const { page = 1, limit = 20, search = '', sort = 'createdAt', order = 'desc', status, agent_id } = req.query;

        // Pass the user object and pagination parameters to the service
        const result = await reclamationService.getReclamationsWithPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sort,
        order,
        status: status !== undefined ? parseInt(status) : undefined,
        agent_id
        }, req.user);

        res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
        });
    } catch (error) {
        next(error);
    }
    }

    /**
     * Get a reclamation request by ID
     */
    async function getReclamationById(req, res, next) {
    try {
        try {
        // Pass the user object to the service to check permissions
        const reclamation = await reclamationService.getReclamationById(req.params.id, req.user);

        // Check if user is agent and not the owner of the reclamation
        if (
            req.user.role === ROLES.AGENT &&
            req.user._id.toString() !== reclamation.agent_id._id.toString()
        ) {
            return res.status(403).json({
            status: 'error',
            message: 'You are not authorized to view this reclamation',
            });
        }

        res.status(200).json({
            status: 'success',
            data: reclamation,
        });
        } catch (error) {
        // Handle permission errors
        if (error.message.includes('permission')) {
            return res.status(403).json({
            status: 'error',
            message: error.message,
            });
        }
        throw error; // Re-throw other errors to be caught by the outer catch
        }
    } catch (error) {
        next(error);
    }
    }

    /**
     * Update a reclamation request
     */
    async function updateReclamation(req, res, next) {
    try {
        const updateData = {};

        // Only update fields that are provided
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.response !== undefined) updateData.response = req.body.response;

        try {
        // Get the previous reclamation to check for status change
        const previousReclamation = await reclamationService.getReclamationById(
            req.params.id,
            req.user
        );
        const previousStatus = previousReclamation.status;

        const reclamation = await reclamationService.updateReclamation(
            req.params.id,
            updateData,
            req.user
        );

        // Check if status was changed and send notifications
        if (previousStatus !== reclamation.status) {
            // TODO: Temporarily commented out notification functionality
            /*
            // Get agent details for notification
            const agent = await User.findById(reclamation.agent_id).select('info login').exec();

            // Find provider users for notification
            const providerUsers = await User.find({ role: ROLES.PROVIDER }).select('info login').exec();

            // Send notifications via email
            try {
            await notificationService.sendStatusUpdateNotification(
                reclamation,
                previousStatus,
                agent || { info: { email: 'unknown@example.com' } },
                providerUsers
            );

            logger.info('Status update notification emails sent', {
                reclamationId: reclamation._id,
                previousStatus,
                newStatus: reclamation.status,
                providerCount: providerUsers.length,
            });
            } catch (error) {
            logger.error('Failed to send status update notification emails', {
                error: error.message,
                reclamationId: reclamation._id,
            });
            // Continue processing even if email fails
            }
            */
        }

        res.status(200).json({
            status: 'success',
            data: reclamation,
        });
        } catch (error) {
        // Handle permission errors
        if (error.message.includes('permission')) {
            return res.status(403).json({
            status: 'error',
            message: error.message,
            });
        }
        throw error; // Re-throw other errors to be caught by the outer catch
        }
    } catch (error) {
        next(error);
    }
    }

    /**
     * Delete a reclamation request
     */
    async function deleteReclamation(req, res, next) {
    try {
        await reclamationService.deleteReclamation(req.params.id);

        res.status(204).json({
        status: 'success',
        data: null,
        });
    } catch (error) {
        next(error);
    }
    }

    /**
     * Get reclamation requests for the current user with pagination
     */
    async function getMyReclamations(req, res, next) {
    try {
        // Extract pagination parameters
        const { page = 1, limit = 20, search = '', sort = 'createdAt', order = 'desc', status } = req.query;

        // Pass the user object and pagination parameters to the service
        const result = await reclamationService.getReclamationsWithPagination({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sort,
        order,
        status: status !== undefined ? parseInt(status) : undefined,
        }, req.user);

        res.status(200).json({
        status: 'success',
        data: result.data,
        meta: result.meta,
        });
    } catch (error) {
        next(error);
    }
    }

    module.exports = {
    createReclamation,
    getReclamations,
    getMyReclamations,
    getReclamationById,
    updateReclamation,
    deleteReclamation,
    };
