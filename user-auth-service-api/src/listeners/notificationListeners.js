const axios = require('axios');
const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');

const setupNotificationListeners = () => {
  const notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL || 'http://host.docker.internal:4004';

  eventEmitter.on(EVENT_TYPES.AUTH.LOGIN, async (data) => {
    try {
      const { user, ipAddress, userAgent } = data;
      const normalizedRole = (user.role || '').toString().toLowerCase();
      if (normalizedRole !== 'agent') return;

      await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
        eventType: 'auth:login',
        notification: {
          id: `agent_login_${user._id}_${Date.now()}`,
          type: 'agent_login',
          title: 'Agent Login Alert',
          message: `Agent ${user.login} has logged in`,
          data: {
            agent: {
              id: user._id?.toString() || user._id,
              login: user.login,
              name: user.name || user.login,
              role: user.role,
              email: user.email,
            },
          },
          metadata: {
            agentId: user._id?.toString() || user._id,
            agentLogin: user.login,
            agentName: user.name || user.login,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString(),
          },
        },
        targetRole: 'Admin',
      });

      logger.info('Agent login notification sent to notification service', {
        userId: user._id,
        userLogin: user.login,
        ipAddress,
      });
    } catch (error) {
      logger.error('Failed to send agent login notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.AUTH.LOGOUT, async (data) => {
    try {
      const { user, ipAddress } = data;
      const normalizedRole = (user.role || '').toString().toLowerCase();
      if (normalizedRole !== 'agent') return;

      const response = await axios.post(
        `${notificationServiceUrl}/notifications/microservice-send`,
        {
          eventType: 'auth:logout',
          notification: {
            id: `agent_logout_${user._id}_${Date.now()}`,
            type: 'agent_logout',
            title: 'Agent Logout',
            message: `Agent ${user.login} has logged out`,
            data: {
              agent: {
                id: user._id?.toString() || user._id,
                login: user.login,
                name: user.name || user.login,
                role: user.role,
                email: user.email,
              },
            },
            metadata: {
              agentId: user._id?.toString() || user._id,
              agentLogin: user.login,
              agentName: user.name || user.login,
              ipAddress,
              timestamp: new Date().toISOString(),
            },
          },
          targetRole: 'Admin',
        }
      );

      logger.info('Agent logout notification sent to notification service', {
        userId: user._id,
        userLogin: user.login,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send agent logout notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFICE.CREATED, async (data) => {
    try {
      const { office, createdBy } = data;
      const officeId = office._id?.toString?.() || office._id;
      const officeName = office.name || 'New office';
      const creatorName = createdBy?.login || createdBy?.name || 'Admin';

      await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
        eventType: 'office:created',
        notification: {
          id: `office_created_${officeId}_${Date.now()}`,
          type: 'office_created',
          title: 'Office Created',
          message: `Office "${officeName}" was created by ${creatorName}`,
          data: {
            office: {
              id: officeId,
              name: officeName,
              country: office.country,
              timezone: office.timezone,
            },
            createdBy: createdBy
              ? {
                  id: createdBy._id?.toString?.() || createdBy._id,
                  login: createdBy.login,
                  name: createdBy.name || createdBy.login,
                }
              : null,
          },
          metadata: {
            officeId,
            createdById: createdBy?._id?.toString?.() || createdBy?._id,
            timestamp: new Date().toISOString(),
          },
        },
        targetRole: 'Admin',
      });

      logger.info('Office created notification sent to notification service', {
        officeId,
        officeName,
        createdBy: createdBy?._id,
      });
    } catch (error) {
      logger.error('Failed to send office created notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFICE.MEMBER_ASSIGNED, async (data) => {
    try {
      const { office, user: assignedUser, assignedUserIds, assignedBy } = data;
      const officeId = office._id?.toString?.() || office._id;
      const officeName = office.name || 'Office';
      const assignerName = assignedBy?.login || assignedBy?.name || 'Admin';

      const sendToUser = async (userId) => {
        const uid = userId?.toString?.() || userId;
        await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
          eventType: 'office:member_assigned',
          notification: {
            id: `office_member_assigned_${uid}_${officeId}_${Date.now()}`,
            type: 'office_member_assigned',
            title: 'Assigned to Office',
            message: `You have been assigned to office "${officeName}" by ${assignerName}`,
            data: {
              office: { id: officeId, name: officeName },
              assignedBy: assignedBy
                ? {
                    id: assignedBy._id?.toString?.() || assignedBy._id,
                    login: assignedBy.login,
                    name: assignedBy.name || assignedBy.login,
                  }
                : null,
            },
            metadata: {
              officeId,
              assignedUserId: uid,
              timestamp: new Date().toISOString(),
            },
          },
          targetUserId: uid,
        });
      };

      const sendToAdmins = async (message) => {
        await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
          eventType: 'office:member_assigned',
          notification: {
            id: `office_member_assigned_admin_${officeId}_${Date.now()}`,
            type: 'office_member_assigned',
            title: 'Member Assigned to Office',
            message,
            data: {
              office: { id: officeId, name: officeName },
              assignedBy: assignedBy
                ? {
                    id: assignedBy._id?.toString?.() || assignedBy._id,
                    login: assignedBy.login,
                    name: assignedBy.name || assignedBy.login,
                  }
                : null,
            },
            metadata: {
              officeId,
              timestamp: new Date().toISOString(),
            },
          },
          targetRole: 'Admin',
        });
      };

      if (assignedUser) {
        await sendToUser(assignedUser._id);
        await sendToAdmins(
          `Member ${assignedUser.login || assignedUser.name || assignedUser.email} has been assigned to office "${officeName}" by ${assignerName}`
        );
      } else if (assignedUserIds && assignedUserIds.length > 0) {
        for (const uid of assignedUserIds) {
          await sendToUser(uid);
        }
        await sendToAdmins(
          `${assignedUserIds.length} member(s) have been assigned to office "${officeName}" by ${assignerName}`
        );
      }
    } catch (error) {
      logger.error('Failed to send office member assigned notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  logger.info('Event listeners set up for notification service');
};

module.exports = { setupNotificationListeners };
