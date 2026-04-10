const appointmentService = require('../services/appointmentService');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');

class AppointmentController {
  /**
   * Create a new appointment
   */
  async createAppointment(req, res) {
    try {
      const { user } = req;
      const appointmentData = req.body;

      // Check if user can create appointments for the specified lead
      if (!hasPermission(user.role, PERMISSIONS.LEAD_UPDATE)) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to create appointments.',
        });
      }

      const appointment = await appointmentService.createAppointment(appointmentData, user);
      
      res.status(201).json({
        status: 'success',
        message: 'Appointment created successfully',
        data: appointment,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Get all appointments with filtering
   */
  async getAllAppointments(req, res) {
    try {
      const { user } = req;
      const { 
        page, 
        limit, 
        lead_id, 
        created_by, 
        status, 
        date_from, 
        date_to, 
        includeInactive 
      } = req.query;

      // Check permissions - Admin can view all, others view their own or leads they have access to
      const canViewAll = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      
      if (!canViewAll && !(await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view appointments.',
        });
      }

      const options = {
        page,
        limit,
        lead_id,
        created_by: canViewAll ? created_by : user._id, // Non-admins can only see their own
        status,
        date_from,
        date_to,
        includeInactive: includeInactive === 'true',
      };

      const result = await appointmentService.getAllAppointments(options);
      
      res.json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(req, res) {
    try {
      const { id } = req.params;
      const { includeInactive } = req.query;
      const { user } = req;

      // Get the appointment first to check ownership
      const appointment = await appointmentService.getAppointmentById(id, includeInactive === 'true');

      // Check permissions - Admin can view any, others only their own
      const canViewAll = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      
      if (!canViewAll && appointment.creator._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view this appointment.',
        });
      }

      res.json({
        status: 'success',
        data: appointment,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Get appointments by lead ID
   */
  async getAppointmentsByLeadId(req, res) {
    try {
      const { leadId } = req.params;
      const { includeInactive, limit, sort } = req.query;
      const { user } = req;

      // Check permissions for lead access
      const canReadAll = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssigned = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);
      if (!canReadAll && !canReadAssigned) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view lead appointments.',
        });
      }

      const options = {
        includeInactive: includeInactive === 'true',
        limit: limit ? parseInt(limit) : 20,
        sort,
      };

      const appointments = await appointmentService.getAppointmentsByLeadId(leadId, options);
      
      res.json({
        status: 'success',
        data: appointments,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const { user } = req;

      // Get the appointment first to check ownership
      const appointment = await appointmentService.getAppointmentById(id);

      // Check permissions - Admin can update any, others only their own
      const canUpdateAll = await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE);
      
      if (!canUpdateAll && appointment.creator._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to update this appointment.',
        });
      }

      const updatedAppointment = await appointmentService.updateAppointment(id, updateData, user);
      
      res.json({
        status: 'success',
        message: 'Appointment updated successfully',
        data: updatedAppointment,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Delete appointment (soft delete)
   */
  async deleteAppointment(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      // Get the appointment first to check ownership
      const appointment = await appointmentService.getAppointmentById(id);

      // Check permissions - Admin can delete any, others only their own
      const canDeleteAll = await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE);
      
      if (!canDeleteAll && appointment.creator._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to delete this appointment.',
        });
      }

      const result = await appointmentService.deleteAppointment(id, user);
      
      res.json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }

  /**
   * Get current user's appointments
   */
  async getMyAppointments(req, res) {
    try {
      const { user } = req;
      const { page, limit, status, date_from, date_to } = req.query;

      const options = {
        page,
        limit,
        status,
        date_from,
        date_to,
      };

      const appointments = await appointmentService.getUserAppointments(user._id, options);
      
      res.json({
        status: 'success',
        ...appointments,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  }
}

module.exports = new AppointmentController();
