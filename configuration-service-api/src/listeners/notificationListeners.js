const axios = require('axios');
const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const { User } = require('../models');

const setupNotificationListeners = () => {
  const notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL || 'http://host.docker.internal:4004';

  eventEmitter.on(EVENT_TYPES.PROJECT.CREATED, async (data) => {
    try {
      const { project, creatorId } = data;
      const creator = await User.findById(creatorId).lean();
      if (!creator) {
        logger.warn('Creator not found for project notification', { creatorId });
        return;
      }

      const projectName = project.name || 'New Project';
      const message = `New project "${projectName}" has been created`;

      const response = await axios.post(
        `${notificationServiceUrl}/notifications/microservice-send`,
        {
          eventType: 'project:created',
          notification: {
            id: `project_created_${project._id}_${Date.now()}`,
            type: 'project_created',
            category: 'project',
            priority: 'medium',
            title: 'New Project Created',
            message,
            data: {
              external_id: `project_created_${project._id}`,
              project: {
                id: project._id,
                name: project.name,
                description: project.description || 'No description',
              },
              creator: {
                id: creator._id,
                login: creator.login,
                name: creator.name || creator.login,
              },
              metadata: {
                timestamp: new Date().toISOString(),
                projectId: project._id,
                projectName: project.name,
              },
            },
            timestamp: new Date().toISOString(),
            read: false,
          },
          targetRole: 'Admin',
        }
      );

      logger.info('Project creation notification sent to admins', {
        projectId: project._id,
        projectName: project.name,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send project creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD_FORM.CREATED, async (data) => {
    try {
      const { lead } = data;
      const siteLink = lead?.site_link || 'Unknown site';
      const contactName = lead?.contact_name || 'Unknown';
      const email = lead?.email || '';
      const message = `New lead from ${siteLink}: ${contactName} (${email})`;

      await axios.post(
        `${notificationServiceUrl}/notifications/microservice-send`,
        {
          eventType: 'lead_form_created',
          notification: {
            id: `lead_form_created_${lead?.id}_${Date.now()}`,
            type: 'lead_form_created',
            category: 'lead_form',
            priority: 'high',
            title: 'New Form Lead',
            message,
            data: {
              external_id: `lead_form_created_${lead?.id}`,
              lead: {
                id: lead?.id,
                contact_name: lead?.contact_name,
                email: lead?.email,
                phone: lead?.phone,
                site_link: lead?.site_link,
                expected_revenue: lead?.expected_revenue,
              },
              metadata: {
                timestamp: new Date().toISOString(),
                leadId: lead?.id,
              },
            },
            timestamp: new Date().toISOString(),
            read: false,
          },
          targetRole: 'Admin',
        }
      );

      logger.info('Lead form creation notification sent to admins', {
        leadId: lead?.id,
        siteLink,
      });
    } catch (error) {
      logger.error('Failed to send lead form creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('Notification event listeners set up for configuration service');
};

module.exports = { setupNotificationListeners };
