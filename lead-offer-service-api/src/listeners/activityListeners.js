const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('../services/events');
const { createActivity } = require('../services/activityService/utils');

const setupActivityListeners = () => {
  eventEmitter.on(EVENT_TYPES.LEAD.CREATED, async (data) => {
    try {
      const { lead, creator } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead creation activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'create',
        message: `Lead created: ${lead.contact_name || lead.email_from || 'Unknown'}`,
        type: 'info',
        details: {
          action_type: 'lead_created',
          lead_id: lead._id,
          contact_name: lead.contact_name,
          email_from: lead.email_from,
          phone: lead.phone,
          status: lead.status,
          stage: lead.stage,
        },
      });
      logger.debug('Activity created for lead creation', {
        leadId: lead._id,
        creatorId: creator._id,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead creation', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.UPDATED, async (data) => {
    try {
      const { lead, creator, changes, changeDescription } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead update activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'update',
        message: `Lead updated: ${changeDescription || 'Changes made'}`,
        type: 'info',
        details: {
          action_type: 'lead_updated',
          lead_id: lead._id,
          changes: changes,
        },
      });
      logger.debug('Activity created for lead update', {
        leadId: lead._id,
        creatorId: creator._id,
        changesCount: Object.keys(changes || {}).length,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.ASSIGNED, async (data) => {
    try {
      const { lead, creator, agent, project, batchInfo } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead assignment activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead.contact_name || lead.name || `Lead #${lead._id}`;
      const agentName = agent?.login || agent?.name || 'Unknown Agent';
      const projectName = project?.name || 'Unknown Project';
      const batchMessage = batchInfo?.isMultiple ? ` (${batchInfo.currentIndex} of ${batchInfo.totalCount})` : '';
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'assign',
        message: `Assigned to ${projectName} - ${agentName}${batchMessage}`,
        type: 'info',
        details: {
          action_type: 'lead_assigned',
          lead_id: lead._id,
          lead_name: leadName,
          project_id: project?._id,
          project_name: projectName,
          agent_id: agent?._id,
          agent_name: agentName,
          is_bulk: batchInfo?.isMultiple || false,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for lead assignment', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.STATUS_CHANGED, async (data) => {
    try {
      const { lead, creator, oldStatus, newStatus, isCombined } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead status change activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      const message = isCombined
        ? `Status changed from "${oldStatus}" to "${newStatus}"`
        : `Status changed from "${oldStatus}" to "${newStatus}"`;
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'status_change',
        message: message,
        type: 'info',
        details: {
          action_type: 'status_changed',
          lead_id: lead._id,
          old_status: oldStatus,
          new_status: newStatus,
          is_combined: isCombined,
        },
      });
      logger.debug('Activity created for lead status change', {
        leadId: lead._id,
        creatorId: creator._id,
        oldStatus,
        newStatus,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead status change', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.DELETED, async (data) => {
    try {
      const { lead, creator } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead deletion activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'delete',
        message: `Lead deleted: ${lead.contact_name || lead.email_from || 'Unknown'}`,
        type: 'warning',
        details: {
          action_type: 'lead_deleted',
          lead_id: lead._id,
          contact_name: lead.contact_name,
          email_from: lead.email_from,
        },
      });
      logger.debug('Activity created for lead deletion', {
        leadId: lead._id,
        creatorId: creator._id,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.RESTORED, async (data) => {
    try {
      const { lead, creator } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead restoration activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'restore',
        message: `Lead restored: ${lead.contact_name || lead.email_from || 'Unknown'}`,
        type: 'success',
        details: {
          action_type: 'lead_restored',
          lead_id: lead._id,
          contact_name: lead.contact_name,
          email_from: lead.email_from,
        },
      });
      logger.debug('Activity created for lead restoration', {
        leadId: lead._id,
        creatorId: creator._id,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead restoration', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.PERMANENTLY_DELETED, async (data) => {
    try {
      const { lead, creator } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead permanent deletion activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'permanent_delete',
        message: `Lead permanently deleted: ${lead.contact_name || 'Unknown'}`,
        type: 'error',
        details: {
          action_type: 'lead_permanently_deleted',
          lead_id: lead._id,
          contact_name: lead.contact_name,
        },
      });
      logger.debug('Activity created for lead permanent deletion', {
        leadId: lead._id,
        creatorId: creator._id,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead permanent deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.TRANSFERRED, async (data) => {
    try {
      const {
        lead,
        creator,
        fromProject,
        fromAgent,
        toProject,
        toAgent,
        transferRecord,
        isFreshTransfer,
        transferStats,
      } = data;
      if (!creator || !lead) {
        logger.warn('Missing data for lead transfer activity', {
          hasLead: !!lead,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead.contact_name || lead.name || `Lead #${lead._id}`;
      const fromProjectName = fromProject?.name || 'Unknown Project';
      const toProjectName = toProject?.name || 'Unknown Project';
      const fromAgentName = fromAgent?.name || fromAgent?.login || 'Unknown Agent';
      const toAgentName = toAgent?.name || toAgent?.login || 'Unknown Agent';
      const transferType = isFreshTransfer ? ' (Fresh Start)' : '';
      const message = `Transferred: ${fromProjectName} (${fromAgentName}) → ${toProjectName} (${toAgentName})${transferType}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: lead._id,
        subject_type: 'Lead',
        action: 'transfer',
        message,
        type: 'info',
        details: {
          action_type: 'lead_transferred',
          lead_id: lead._id,
          lead_name: leadName,
          from_project: { id: fromProject?._id, name: fromProjectName },
          from_agent: { id: fromAgent?._id, name: fromAgentName },
          to_project: { id: toProject?._id, name: toProjectName },
          to_agent: { id: toAgent?._id, name: toAgentName },
          transfer_record_id: transferRecord?._id,
          is_fresh_transfer: isFreshTransfer || false,
          transfer_stats: transferStats || {},
        },
      });
      logger.debug('Activity created for lead transfer', {
        leadId: lead._id,
        creatorId: creator._id,
        fromProject: fromProjectName,
        toProject: toProjectName,
        isFreshTransfer,
      });
    } catch (error) {
      logger.error('Failed to create activity for lead transfer', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.BULK_TRANSFERRED, async (data) => {
    try {
      logger.info('🔥 BULK_TRANSFERRED event received', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
      });
      const { toProjectId, toAgentUserId, successCount, user, isFreshTransfer, results } = data;
      if (!user || !toProjectId || !toAgentUserId || !results) {
        logger.warn('Missing data for bulk transfer activity', {
          hasUser: !!user,
          hasToProjectId: !!toProjectId,
          hasToAgentUserId: !!toAgentUserId,
          hasResults: !!results,
          dataKeys: data ? Object.keys(data) : [],
        });
        return;
      }
      logger.info('✅ Processing bulk transfer activities', {
        successCount,
        resultsCount: results.successful?.length || 0,
        firstLeadId: results.successful?.[0]?.leadId,
        hasResults: !!results,
        hasSuccessful: !!results.successful,
      });
      const { Team, User, Lead } = require('../models');
      logger.info('📦 Models loaded for activity creation');
      const toProject = await Team.findById(toProjectId).lean();
      const toAgent = await User.findById(toAgentUserId).lean();
      const toProjectName = toProject?.name || `Project #${toProjectId}`;
      const toAgentName = toAgent?.name || toAgent?.login || `Agent #${toAgentUserId}`;
      const transferType = isFreshTransfer ? ' (Fresh Start)' : '';
      let activitiesCreated = 0;
      let activitiesFailed = 0;
      logger.info('🔄 Starting activity creation loop', {
        totalLeads: results.successful?.length || 0,
      });
      for (const successfulTransfer of results.successful || []) {
        try {
          const { leadId, leadName, fromProject, fromAgent, transferStats, transferRecord } = successfulTransfer;
          logger.info('🔍 Processing lead for activity', {
            leadId,
            leadName,
            hasFromProject: !!fromProject,
            hasFromAgent: !!fromAgent,
          });
          const lead = await Lead.findById(leadId).lean();
          if (!lead) {
            logger.warn('⚠️ Lead not found for bulk transfer activity', { leadId });
            activitiesFailed++;
            continue;
          }
          logger.info('✅ Lead found, creating activity', {
            leadId: lead._id,
            leadName: lead.contact_name || lead.name,
          });
          const fromProjectName = fromProject?.name || 'Unknown Project';
          const fromAgentName = fromAgent?.name || fromAgent?.login || 'Unknown Agent';
          const message = `Transferred: ${fromProjectName} (${fromAgentName}) → ${toProjectName} (${toAgentName})${transferType}`;
          logger.info('💾 About to call createActivity', {
            leadId: lead._id,
            creatorId: user._id,
            message,
          });
          await createActivity({
            _creator: user._id,
            _subject_id: lead._id,
            subject_type: 'Lead',
            action: 'transfer',
            message,
            type: 'info',
            details: {
              action_type: 'lead_transferred',
              lead_id: lead._id,
              lead_name: leadName || lead.contact_name || lead.name || `Lead #${leadId}`,
              from_project: { id: fromProject?._id, name: fromProjectName },
              from_agent: { id: fromAgent?._id, name: fromAgentName },
              to_project: { id: toProjectId, name: toProjectName },
              to_agent: { id: toAgentUserId, name: toAgentName },
              transfer_record_id: transferRecord,
              is_fresh_transfer: isFreshTransfer || false,
              transfer_stats: transferStats || {},
              bulk_transfer: true,
              total_in_batch: successCount,
            },
          });
          logger.info('✅✅ Activity created successfully!', {
            leadId: lead._id,
            activityCreated: true,
          });
          activitiesCreated++;
        } catch (leadError) {
          activitiesFailed++;
          logger.error('❌ Failed to create activity for individual lead in bulk transfer', {
            leadId: successfulTransfer.leadId,
            error: leadError.message,
            stack: leadError.stack,
          });
        }
      }
      logger.info('📊 Activities created for bulk lead transfer', {
        userId: user._id,
        totalLeads: successCount,
        activitiesCreated,
        activitiesFailed,
        toProject: toProjectName,
        toAgent: toAgentName,
        isFreshTransfer,
      });
      if (activitiesFailed > 0) {
        logger.warn('Some activities failed to create in bulk transfer', {
          activitiesFailed,
          totalLeads: successCount,
        });
      }
    } catch (error) {
      logger.error('Failed to create activities for bulk transfer', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.APPOINTMENT.CREATED, async (data) => {
    try {
      const { appointment, creator, lead } = data;
      if (!creator || !appointment) {
        logger.warn('Missing data for appointment creation activity', {
          hasAppointment: !!appointment,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const appointmentDate = appointment.appointment_date
        ? new Date(appointment.appointment_date).toLocaleDateString()
        : 'Unknown date';
      await createActivity({
        _creator: creator._id,
        _subject_id: lead?._id || appointment.lead?._id || appointment.lead_id,
        subject_type: 'Lead',
        action: 'create',
        message: `Appointment created for ${leadName} on ${appointmentDate}`,
        type: 'info',
        details: {
          action_type: 'appointment_created',
          appointment_id: appointment._id || appointment.id,
          lead_id: lead?._id || appointment.lead?._id || appointment.lead_id,
          lead_name: leadName,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          notes: appointment.notes,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for appointment creation', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.APPOINTMENT.UPDATED, async (data) => {
    try {
      const { appointment, creator, lead, changes } = data;
      if (!creator || !appointment) {
        logger.warn('Missing data for appointment update activity', {
          hasAppointment: !!appointment,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      await createActivity({
        _creator: creator._id,
        _subject_id: lead?._id || appointment.lead?._id || appointment.lead_id,
        subject_type: 'Lead',
        action: 'update',
        message: `Appointment updated for ${leadName}`,
        type: 'info',
        details: {
          action_type: 'appointment_updated',
          appointment_id: appointment._id || appointment.id,
          lead_id: lead?._id || appointment.lead?._id || appointment.lead_id,
          lead_name: leadName,
          changes: changes || {},
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for appointment update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.APPOINTMENT.DELETED, async (data) => {
    try {
      const { appointment, creator, lead } = data;
      if (!creator || !appointment) {
        logger.warn('Missing data for appointment deletion activity', {
          hasAppointment: !!appointment,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      await createActivity({
        _creator: creator._id,
        _subject_id: lead?._id || appointment.lead_id?._id || appointment.lead_id,
        subject_type: 'Lead',
        action: 'delete',
        message: `Appointment deleted for ${leadName}`,
        type: 'warning',
        details: {
          action_type: 'appointment_deleted',
          appointment_id: appointment._id || appointment.id,
          lead_id: lead?._id || appointment.lead_id?._id || appointment.lead_id,
          lead_name: leadName,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for appointment deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.RECLAMATION.CREATED, async (data) => {
    try {
      const { reclamation, creator, lead, lead_status_id, lead_status_name, status_label } = data;
      const creatorId = creator?._id || creator?.id;
      if (!creatorId || !reclamation) {
        logger.warn('Missing data for reclamation creation activity', {
          hasReclamation: !!reclamation,
          hasCreator: !!creatorId,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const reasonText = reclamation.reason || 'No reason provided';
      const statusSuffix = lead_status_name ? ` (Status: ${lead_status_name})` : '';
      const message = `Reclamation created for ${leadName}: ${reasonText}${statusSuffix}`;
      await createActivity({
        _creator: creatorId,
        _subject_id: reclamation._id || reclamation.id,
        subject_type: 'Reclamation',
        action: 'create',
        message,
        type: 'info',
        details: {
          action_type: 'reclamation_created',
          reclamation_id: reclamation._id || reclamation.id,
          lead_id: reclamation.lead_id?._id || reclamation.lead_id || lead?._id,
          lead_name: leadName,
          reason: reclamation.reason,
          status: reclamation.status,
          status_label: status_label ?? (reclamation.status === 1 ? 'Accepted' : reclamation.status === 2 ? 'Rejected' : 'Pending'),
          lead_status_id: lead_status_id ?? null,
          lead_status_name: lead_status_name ?? null,
          agent_id: reclamation.agent_id?._id || reclamation.agent_id,
          project_id: reclamation.project_id?._id || reclamation.project_id,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for reclamation creation', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.RECLAMATION.UPDATED, async (data) => {
    try {
      const { reclamation, creator, lead, previousStatus, newStatus } = data;
      if (!creator || !reclamation) {
        logger.warn('Missing data for reclamation update activity', {
          hasReclamation: !!reclamation,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const statusMessage =
        previousStatus !== undefined && newStatus !== undefined
          ? `Status changed from ${previousStatus} to ${newStatus}`
          : 'Reclamation updated';
      await createActivity({
        _creator: creator._id,
        _subject_id: reclamation._id || reclamation.id,
        subject_type: 'Reclamation',
        action: previousStatus !== undefined && newStatus !== undefined ? 'status_change' : 'update',
        message: `${statusMessage} for ${leadName}`,
        type: 'info',
        details: {
          action_type: 'reclamation_updated',
          reclamation_id: reclamation._id || reclamation.id,
          lead_id: reclamation.lead_id?._id || reclamation.lead_id || lead?._id,
          lead_name: leadName,
          previous_status: previousStatus,
          new_status: newStatus !== undefined ? newStatus : reclamation.status,
          response: reclamation.response,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for reclamation update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.DELETED, async (data) => {
    try {
      const { offer, creator } = data;
      if (!creator || !offer) {
        logger.warn('Missing data for offer deletion activity', {
          hasOffer: !!offer,
          hasCreator: !!creator,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'delete',
        message: `Offer deleted: ${offerTitle}`,
        type: 'warning',
        details: {
          action_type: 'offer_deleted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for offer deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.LOST, async (data) => {
    try {
      const { offer, creator, reason, notes } = data;
      if (!creator || !offer) {
        logger.warn('Missing data for offer lost activity', {
          hasOffer: !!offer,
          hasCreator: !!creator,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'status_change',
        message: `Offer marked as lost: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'warning',
        details: {
          action_type: 'offer_lost',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          reason: reason,
          notes: notes,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for offer lost', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.LOST_REVERTED, async (data) => {
    try {
      const { offer, creator, reverter, revert_reason, revertReason } = data;
      const user = creator || reverter;
      const reason = revert_reason || revertReason;
      if (!user || !offer) {
        logger.warn('Missing data for offer lost reverted activity', {
          hasOffer: !!offer,
          hasCreator: !!creator,
          hasReverter: !!reverter,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      const previousStage = offer.current_stage || 'lost';
      const { Offer } = require('../models');
      const updatedOffer = await Offer.findById(offer._id).select('current_stage').lean();
      const newStage = updatedOffer?.current_stage || 'offer';
      await createActivity({
        _creator: user._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'update',
        message: `Offer reverted from 'lost' to '${newStage}' stage: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'offer_lost_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          previous_stage: previousStage,
          new_stage: newStage,
          revert_reason: reason,
        },
      });
      logger.info('Activity logged for offer lost reverted', {
        offerId: offer._id,
        userId: user._id,
        previousStage,
        newStage,
      });
    } catch (error) {
      logger.error('Failed to create activity for offer lost reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.PAYMENT_REVERTED, async (data) => {
    try {
      const { offer, revertedBy, reason, newStatus } = data;
      if (!revertedBy || !offer) {
        logger.warn('Missing data for offer payment reverted activity', {
          hasOffer: !!offer,
          hasRevertedBy: !!revertedBy,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      const previousStage = offer.current_stage || 'payment';
      const { Offer } = require('../models');
      const updatedOffer = await Offer.findById(offer._id).select('current_stage').lean();
      const newStage = updatedOffer?.current_stage || newStatus || 'confirmation';
      await createActivity({
        _creator: revertedBy._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'update',
        message: `Offer reverted from 'payment' to '${newStage}' stage: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'offer_payment_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          previous_stage: previousStage,
          new_stage: newStage,
          revert_reason: reason,
        },
      });
      logger.info('Activity logged for offer payment reverted', {
        offerId: offer._id,
        userId: revertedBy._id,
        previousStage,
        newStage,
      });
    } catch (error) {
      logger.error('Failed to create activity for offer payment reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.CONFIRMATION_REVERTED, async (data) => {
    try {
      const { offer, revertedBy, reason, newStatus } = data;
      if (!revertedBy || !offer) {
        logger.warn('Missing data for offer confirmation reverted activity', {
          hasOffer: !!offer,
          hasRevertedBy: !!revertedBy,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      const previousStage = offer.current_stage || 'confirmation';
      const { Offer } = require('../models');
      const updatedOffer = await Offer.findById(offer._id).select('current_stage').lean();
      const newStage = updatedOffer?.current_stage || newStatus || 'opening';
      await createActivity({
        _creator: revertedBy._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'update',
        message: `Offer reverted from 'confirmation' to '${newStage}' stage: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'offer_confirmation_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          previous_stage: previousStage,
          new_stage: newStage,
          revert_reason: reason,
        },
      });
      logger.info('Activity logged for offer confirmation reverted', {
        offerId: offer._id,
        userId: revertedBy._id,
        previousStage,
        newStage,
      });
    } catch (error) {
      logger.error('Failed to create activity for offer confirmation reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.OPENING_REVERTED, async (data) => {
    try {
      const { offer, revertedBy, reason, newStatus } = data;
      if (!revertedBy || !offer) {
        logger.warn('Missing data for offer opening reverted activity', {
          hasOffer: !!offer,
          hasRevertedBy: !!revertedBy,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      const previousStage = offer.current_stage || 'opening';
      const { Offer } = require('../models');
      const updatedOffer = await Offer.findById(offer._id).select('current_stage').lean();
      const newStage = updatedOffer?.current_stage || newStatus || 'offer';
      await createActivity({
        _creator: revertedBy._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'update',
        message: `Offer reverted from 'opening' to '${newStage}' stage: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'offer_opening_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          previous_stage: previousStage,
          new_stage: newStage,
          revert_reason: reason,
        },
      });
      logger.info('Activity logged for offer opening reverted', {
        offerId: offer._id,
        userId: revertedBy._id,
        previousStage,
        newStage,
      });
    } catch (error) {
      logger.error('Failed to create activity for offer opening reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.RESTORED, async (data) => {
    try {
      const { offer, creator } = data;
      if (!creator || !offer) {
        logger.warn('Missing data for offer restoration activity', {
          hasOffer: !!offer,
          hasCreator: !!creator,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'restore',
        message: `Offer restored: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'offer_restored',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for offer restoration', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.NETTO1_REVERTED, async (data) => {
    try {
      const { offer, revertedBy, reason } = data;
      if (!revertedBy || !offer) {
        logger.warn('Missing data for offer Netto1 reverted activity', {
          hasOffer: !!offer,
          hasCreator: !!revertedBy,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      await createActivity({
        _creator: revertedBy._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'status_change',
        message: `Netto1 reverted for offer: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'netto1_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          revert_reason: reason,
          reverted_count: data.revertedRecords?.length || 0,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for offer Netto1 reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.NETTO2_REVERTED, async (data) => {
    try {
      const { offer, revertedBy, reason } = data;
      if (!revertedBy || !offer) {
        logger.warn('Missing data for offer Netto2 reverted activity', {
          hasOffer: !!offer,
          hasCreator: !!revertedBy,
        });
        return;
      }
      const offerTitle = offer.title || `Offer #${offer._id}`;
      await createActivity({
        _creator: revertedBy._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'status_change',
        message: `Netto2 reverted for offer: ${offerTitle}${reason ? ` - ${reason}` : ''}`,
        type: 'info',
        details: {
          action_type: 'netto2_reverted',
          offer_id: offer._id,
          offer_title: offerTitle,
          lead_id: offer.lead_id?._id || offer.lead_id,
          revert_reason: reason,
          reverted_count: data.revertedRecords?.length || 0,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for offer Netto2 reverted', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OPENING.UPDATED, async (data) => {
    try {
      const { opening, creator, lead, offer, changes } = data;
      if (!creator || !opening) {
        logger.warn('Missing data for opening update activity', {
          hasOpening: !!opening,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: opening._id,
        subject_type: 'Opening',
        action: 'update',
        message: `Opening updated for ${leadName} - ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'opening_updated',
          opening_id: opening._id,
          offer_id: opening.offer_id?._id || opening.offer_id || offer?._id,
          lead_id: opening.lead_id?._id || opening.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
          changes: changes || {},
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for opening update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OPENING.DELETED, async (data) => {
    try {
      const { opening, creator, lead, offer } = data;
      if (!creator || !opening) {
        logger.warn('Missing data for opening deletion activity', {
          hasOpening: !!opening,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: opening._id,
        subject_type: 'Opening',
        action: 'delete',
        message: `Opening deleted for ${leadName} - ${offerTitle}`,
        type: 'warning',
        details: {
          action_type: 'opening_deleted',
          opening_id: opening._id,
          offer_id: opening.offer_id?._id || opening.offer_id || offer?._id,
          lead_id: opening.lead_id?._id || opening.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for opening deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.CONFIRMATION.UPDATED, async (data) => {
    try {
      const { confirmation, creator, lead, offer, changes } = data;
      if (!creator || !confirmation) {
        logger.warn('Missing data for confirmation update activity', {
          hasConfirmation: !!confirmation,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: confirmation._id,
        subject_type: 'Confirmation',
        action: 'update',
        message: `Confirmation updated for ${leadName} - ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'confirmation_updated',
          confirmation_id: confirmation._id,
          offer_id: confirmation.offer_id?._id || confirmation.offer_id || offer?._id,
          opening_id: confirmation.opening_id?._id || confirmation.opening_id,
          lead_id: confirmation.lead_id?._id || confirmation.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
          changes: changes || {},
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for confirmation update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.CONFIRMATION.DELETED, async (data) => {
    try {
      const { confirmation, creator, lead, offer } = data;
      if (!creator || !confirmation) {
        logger.warn('Missing data for confirmation deletion activity', {
          hasConfirmation: !!confirmation,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: confirmation._id,
        subject_type: 'Confirmation',
        action: 'delete',
        message: `Confirmation deleted for ${leadName} - ${offerTitle}`,
        type: 'warning',
        details: {
          action_type: 'confirmation_deleted',
          confirmation_id: confirmation._id,
          offer_id: confirmation.offer_id?._id || confirmation.offer_id || offer?._id,
          opening_id: confirmation.opening_id?._id || confirmation.opening_id,
          lead_id: confirmation.lead_id?._id || confirmation.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for confirmation deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.PAYMENT_VOUCHER.UPDATED, async (data) => {
    try {
      const { paymentVoucher, creator, lead, offer, changes } = data;
      if (!creator || !paymentVoucher) {
        logger.warn('Missing data for payment voucher update activity', {
          hasPaymentVoucher: !!paymentVoucher,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: paymentVoucher._id,
        subject_type: 'Payment Voucher',
        action: 'update',
        message: `Payment voucher updated for ${leadName} - ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'payment_voucher_updated',
          payment_voucher_id: paymentVoucher._id,
          offer_id: paymentVoucher.offer_id?._id || paymentVoucher.offer_id || offer?._id,
          confirmation_id: paymentVoucher.confirmation_id?._id || paymentVoucher.confirmation_id,
          lead_id: paymentVoucher.lead_id?._id || paymentVoucher.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
          changes: changes || {},
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for payment voucher update', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.PAYMENT_VOUCHER.DELETED, async (data) => {
    try {
      const { paymentVoucher, creator, lead, offer } = data;
      if (!creator || !paymentVoucher) {
        logger.warn('Missing data for payment voucher deletion activity', {
          hasPaymentVoucher: !!paymentVoucher,
          hasCreator: !!creator,
        });
        return;
      }
      const leadName = lead?.contact_name || lead?.name || 'Unknown Lead';
      const offerTitle = offer?.title || `Offer #${offer?._id || 'Unknown'}`;
      await createActivity({
        _creator: creator._id,
        _subject_id: paymentVoucher._id,
        subject_type: 'Payment Voucher',
        action: 'delete',
        message: `Payment voucher deleted for ${leadName} - ${offerTitle}`,
        type: 'warning',
        details: {
          action_type: 'payment_voucher_deleted',
          payment_voucher_id: paymentVoucher._id,
          offer_id: paymentVoucher.offer_id?._id || paymentVoucher.offer_id || offer?._id,
          confirmation_id: paymentVoucher.confirmation_id?._id || paymentVoucher.confirmation_id,
          lead_id: paymentVoucher.lead_id?._id || paymentVoucher.lead_id || lead?._id,
          lead_name: leadName,
          offer_title: offerTitle,
        },
      });
    } catch (error) {
      logger.error('Failed to create activity for payment voucher deletion', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('✅ Event listeners set up for activity logging');
  logger.info('📊 Event listener counts:', {
    LEAD_TRANSFERRED: eventEmitter.listenerCount(EVENT_TYPES.LEAD.TRANSFERRED),
    LEAD_BULK_TRANSFERRED: eventEmitter.listenerCount(EVENT_TYPES.LEAD.BULK_TRANSFERRED),
    LEAD_CREATED: eventEmitter.listenerCount(EVENT_TYPES.LEAD.CREATED),
    LEAD_UPDATED: eventEmitter.listenerCount(EVENT_TYPES.LEAD.UPDATED),
  });
};

module.exports = { setupActivityListeners };

