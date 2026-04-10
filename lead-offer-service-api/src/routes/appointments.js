const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * Appointment routes
 * All routes require lead read permissions since appointments are tied to leads
 */
const router = express.Router();

/**
 * Get all appointments with filtering
 * @route GET /appointments
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.getAllAppointments);

/**
 * Get current user's appointments
 * @route GET /appointments/my-appointments
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/my-appointments', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.getMyAppointments);

/**
 * Create a new appointment
 * @route POST /appointments
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.post('/', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.createAppointment);

/**
 * Get appointments by lead ID
 * @route GET /appointments/lead/:leadId
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/lead/:leadId', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.getAppointmentsByLeadId);

/**
 * Get a specific appointment by ID
 * @route GET /appointments/:id
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/:id', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.getAppointmentById);

/**
 * Update an appointment
 * @route PUT /appointments/:id
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.put('/:id', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.updateAppointment);

/**
 * Delete an appointment (soft delete)
 * @route DELETE /appointments/:id
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.delete('/:id', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), appointmentController.deleteAppointment);

module.exports = router;
