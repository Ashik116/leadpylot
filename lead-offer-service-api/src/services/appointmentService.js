const { Appointment, Lead } = require('../models');
const { NotFoundError, ValidationError, DatabaseError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('./events');
const { updateLeadStageAndStatus } = require('./leadService/utils');
const logger = require('../utils/logger');

class AppointmentService {
  /**
   * Transform appointment response to include populated data
   */
  _transformAppointmentResponse(appointment) {
    const result = appointment.toObject ? appointment.toObject() : { ...appointment };
    
    // Transform populated fields
    if (result.lead_id) {
      result.lead = result.lead_id;
      delete result.lead_id;
    }
    
    if (result.created_by) {
      result.creator = result.created_by;
      delete result.created_by;
    }
    
    return result;
  }

  /**
   * Transform multiple appointments
   */
  _transformAppointmentsResponse(appointments) {
    return appointments.map((appointment) => this._transformAppointmentResponse(appointment));
  }

  /**
   * Validate appointment data
   */
  _validateAppointmentData(data) {
    if (!data.lead_id) {
      throw new ValidationError('Lead ID is required');
    }
    
    if (!data.appointment_date) {
      throw new ValidationError('Appointment date is required');
    }
    
    // Validate date is not in the past
    const appointmentDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      throw new ValidationError('Appointment date cannot be in the past');
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData, creator) {
    try {
      // Validate input data
      this._validateAppointmentData(appointmentData);
      
      // Verify lead exists
      const lead = await Lead.findById(appointmentData.lead_id);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }
      
      // Create appointment with creator information
      const appointmentWithCreator = {
        ...appointmentData,
        created_by: creator._id,
      };
      
      const appointment = new Appointment(appointmentWithCreator);
      await appointment.save();
      
      // Update lead status to Positiv -> Termin when appointment is created
      try {
        const updatedLead = await updateLeadStageAndStatus(lead._id, 'Positiv', 'Termin');
        if (updatedLead) {
          logger.info(`Lead ${lead._id} status updated to Positiv -> Termin after appointment creation`);
        }
      } catch (statusError) {
        logger.warn(`Failed to update lead status after appointment creation: ${statusError.message}`, {
          leadId: lead._id,
          appointmentId: appointment._id,
        });
        // Don't fail appointment creation if status update fails
      }
      
      // Get populated appointment
      const populatedAppointment = await this.getAppointmentById(appointment._id);
      
      // Emit event for notifications and activity logging
      eventEmitter.emit(EVENT_TYPES.APPOINTMENT.CREATED, {
        appointment: populatedAppointment,
        lead,
        creator,
      });
      
      return populatedAppointment;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error creating appointment', { error, appointmentData });
      throw new DatabaseError(`Error creating appointment: ${error.message}`);
    }
  }

  /**
   * Get appointment by ID with populated data
   */
  async getAppointmentById(id, includeInactive = false) {
    try {
      const query = { _id: id };
      if (!includeInactive) {
        query.active = true;
      }
      
      const appointment = await Appointment.findOne(query)
        .populate({
          path: 'lead_id',
          select: '_id contact_name email_from phone',
        })
        .populate({
          path: 'created_by',
          select: '_id login role',
        });
      
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }
      
      return this._transformAppointmentResponse(appointment);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching appointment', { error, id });
      throw new DatabaseError(`Error fetching appointment: ${error.message}`);
    }
  }

  /**
   * Get appointments by lead ID
   */
  async getAppointmentsByLeadId(leadId, options = {}) {
    try {
      const { includeInactive = false, limit = 20, sort = '-appointment_date' } = options;
      
      const query = { lead_id: leadId };
      if (!includeInactive) {
        query.active = true;
      }
      
      const appointments = await Appointment.find(query)
        .populate({
          path: 'created_by',
          select: '_id login role',
        })
        .sort(sort)
        .limit(limit);
      
      return this._transformAppointmentsResponse(appointments);
    } catch (error) {
      logger.error('Error fetching appointments by lead ID', { error, leadId });
      throw new DatabaseError(`Error fetching appointments: ${error.message}`);
    }
  }

  /**
   * Get all appointments with filtering and pagination
   */
  async getAllAppointments(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        lead_id,
        created_by,
        status,
        date_from,
        date_to,
        includeInactive = false,
      } = options;
      
      const query = {};
      
      if (!includeInactive) {
        query.active = true;
      }
      
      if (lead_id) {
        query.lead_id = lead_id;
      }
      
      if (created_by) {
        query.created_by = created_by;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (date_from) {
        query.appointment_date = { $gte: new Date(date_from) };
      }
      
      if (date_to) {
        query.appointment_date = {
          ...(query.appointment_date || {}),
          $lte: new Date(date_to),
        };
      }
      
      const skip = (page - 1) * limit;
      
      const appointments = await Appointment.find(query)
        .populate({
          path: 'lead_id',
          select: '_id contact_name email_from phone',
        })
        .populate({
          path: 'created_by',
          select: '_id login role',
        })
        .sort('-appointment_date')
        .skip(skip)
        .limit(limit);
      
      const total = await Appointment.countDocuments(query);
      
      return {
        data: this._transformAppointmentsResponse(appointments),
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching appointments', { error, options });
      throw new DatabaseError(`Error fetching appointments: ${error.message}`);
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(id, updateData, user) {
    try {
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }
      
      // Validate update data if appointment_date is being changed
      if (updateData.appointment_date) {
        this._validateAppointmentData({ 
          lead_id: appointment.lead_id, 
          appointment_date: updateData.appointment_date 
        });
      }
      
      // Store original data for comparison
      const originalAppointment = appointment.toObject();
      
      // Update appointment
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate([
        {
          path: 'lead_id',
          select: '_id contact_name email_from phone',
        },
        {
          path: 'created_by',
          select: '_id login role',
        },
      ]);
      
      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.APPOINTMENT.UPDATED, {
        appointment: updatedAppointment,
        originalAppointment,
        updater: user,
      });
      
      return this._transformAppointmentResponse(updatedAppointment);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error updating appointment', { error, id, updateData });
      throw new DatabaseError(`Error updating appointment: ${error.message}`);
    }
  }

  /**
   * Delete appointment (soft delete)
   */
  async deleteAppointment(id, user) {
    try {
      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }
      
      // Soft delete
      appointment.active = false;
      await appointment.save();
      
      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.APPOINTMENT.DELETED, {
        appointment: appointment.toObject(),
        deletedBy: user,
      });
      
      return {
        message: 'Appointment deleted successfully',
        appointment: {
          _id: appointment._id,
          active: appointment.active,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting appointment', { error, id });
      throw new DatabaseError(`Error deleting appointment: ${error.message}`);
    }
  }

  /**
   * Get appointments for a specific user (creator)
   */
  async getUserAppointments(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status, date_from, date_to } = options;
      
      const query = { created_by: userId, active: true };
      
      if (status) {
        query.status = status;
      }
      
      if (date_from) {
        query.appointment_date = { $gte: new Date(date_from) };
      }
      
      if (date_to) {
        query.appointment_date = {
          ...(query.appointment_date || {}),
          $lte: new Date(date_to),
        };
      }
      
      const skip = (page - 1) * limit;
      
      const appointments = await Appointment.find(query)
        .populate({
          path: 'lead_id',
          select: '_id contact_name email_from phone',
        })
        .sort('-appointment_date')
        .skip(skip)
        .limit(limit);
      
      const total = await Appointment.countDocuments(query);
      
      return {
        data: this._transformAppointmentsResponse(appointments),
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user appointments', { error, userId, options });
      throw new DatabaseError(`Error fetching user appointments: ${error.message}`);
    }
  }
}

module.exports = new AppointmentService();
