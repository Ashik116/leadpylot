const axios = require('axios');
const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('../services/events');

/**
 * Collects rapid-fire events into batches keyed by a caller-defined key.
 * After `windowMs` of inactivity for a given key, the batch is flushed and
 * the `onFlush` callback receives all collected items as an array.
 */
class EventBatchCollector {
  constructor({ windowMs = 500, onFlush }) {
    this._windowMs = windowMs;
    this._onFlush = onFlush;
    this._buckets = new Map();
  }

  add(key, item) {
    let bucket = this._buckets.get(key);
    if (!bucket) {
      bucket = { items: [], timer: null };
      this._buckets.set(key, bucket);
    }
    bucket.items.push(item);

    if (bucket.timer) clearTimeout(bucket.timer);
    bucket.timer = setTimeout(() => {
      const flushed = bucket.items;
      this._buckets.delete(key);
      this._onFlush(key, flushed).catch(err => {
        logger.error('[EventBatchCollector] Flush error', { key, error: err.message });
      });
    }, this._windowMs);
  }
}

const setupNotificationListeners = () => {
  const isRunningInDocker =
    process.env.NODE_ENV === 'production' ||
    require('fs').existsSync('/.dockerenv') ||
    process.env.DOCKER_CONTAINER === 'true';

  let notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';

  if (!isRunningInDocker && notificationServiceUrl.includes('host.docker.internal')) {
    notificationServiceUrl = notificationServiceUrl.replace('host.docker.internal', 'localhost');
    logger.info('Adjusted notification service URL for local development', {
      original: process.env.NOTIFICATION_SERVICE_URL,
      adjusted: notificationServiceUrl
    });
  }

  const MICROSERVICE_SECRET = process.env.MICROSERVICE_SECRET || process.env.GATEWAY_SECRET;
  const notificationAxios = axios.create({
    baseURL: notificationServiceUrl,
    timeout: 10000,
    headers: MICROSERVICE_SECRET
      ? { 'x-microservice-secret': MICROSERVICE_SECRET, 'x-gateway-secret': MICROSERVICE_SECRET }
      : {},
  });

  // Batch collector: groups rapid OFFER.CREATED events by notification target
  // (Admin role or specific agentId) and sends one summary HTTP call per batch.
  const offerCreatedBatcher = new EventBatchCollector({
    windowMs: 500,
    onFlush: async (key, items) => {
      try {
        const first = items[0];
        const totalCount = items.length;
        const creatorRole = first.creatorRole;

        const projectName = first.offer.project_id?.name || first.project?.name || 'Unknown Project';
        const message = totalCount === 1
          ? `Offer created for lead "${first.leadName}" - ${first.investmentVolume} at ${first.interestRate}% interest`
          : `${totalCount} offers created in project "${projectName}"`;

        const payload = {
          eventType: 'offer:created',
          notification: {
            id: `offer_created_batch_${first.offer._id}_${Date.now()}`,
            type: 'offer_created',
            category: 'offers',
            priority: 'high',
            title: totalCount === 1 ? 'New Offer Created' : `${totalCount} New Offers Created`,
            message,
            data: {
              external_id: `offer_created_${first.offer._id}`,
              offer: {
                id: first.offer._id,
                title: first.offer.title,
                investment_volume: first.offer.investment_volume,
                interest_rate: first.offer.interest_rate,
                status: first.offer.status || 'draft',
                bonus_amount: first.offer.bonus_amount,
                bank_id: first.offer.bank_id,
                offer_type: first.offer.offerType,
              },
              lead: {
                id: first.lead?._id,
                contact_name: first.lead?.contact_name,
                email_from: first.lead?.email_from,
                displayName: first.leadName,
              },
              creator: {
                id: first.creator._id,
                login: first.creator.login,
                name: first.creator.name || first.creator.login,
                role: creatorRole,
              },
              project: {
                id: first.offer.project_id?._id || first.offer.project_id || first.project?._id,
                name: projectName,
              },
              metadata: {
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                leadName: first.leadName,
                amount: first.offer.investment_volume ? first.offer.investment_volume.toString() : 'N/A',
                interestRate: first.offer.interest_rate ? `${first.offer.interest_rate}%` : 'N/A',
                bonus: first.bonusAmount,
                bank: first.bankName,
                offerType: first.offer.offerType || 'N/A',
                batchCount: totalCount,
              },
            },
            timestamp: new Date().toISOString(),
            read: false,
          },
        };

        if (creatorRole === 'Agent') {
          payload.targetRole = 'Admin';
        } else {
          payload.targetUserId = first.targetUserId;
        }

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          payload
        );

        logger.info('Batched offer creation notification sent', {
          totalCount,
          target: creatorRole === 'Agent' ? 'Admin role' : `user ${first.targetUserId}`,
          responseStatus: response?.status,
        });
      } catch (error) {
        logger.error('Failed to send batched offer creation notification', {
          error: error.message,
          stack: error.stack,
          response: error.response?.data,
        });
      }
    },
  });

  eventEmitter.on(EVENT_TYPES.OFFER.CREATED, async (data) => {
    try {
      const { offer, creator, lead, project } = data;
      const creatorRole = creator?.role || creator?.role_id?.name || 'Agent';

      let bonusAmount = 'N/A';
      if (offer.bonus_amount) {
        if (typeof offer.bonus_amount === 'object' && offer.bonus_amount.name) {
          bonusAmount = offer.bonus_amount.name;
        } else if (typeof offer.bonus_amount === 'string') {
          bonusAmount = offer.bonus_amount;
        }
      }

      let bankName = 'N/A';
      if (offer.bank_id) {
        if (typeof offer.bank_id === 'object' && offer.bank_id.name) {
          bankName = offer.bank_id.name;
        } else if (typeof offer.bank_id === 'string') {
          bankName = offer.bank_id;
        }
      }

      const leadName = lead?.contact_name || `Lead #${lead?._id?.toString().slice(-6)}`;
      const investmentVolume = offer.investment_volume
        ? `€${offer.investment_volume.toLocaleString()}`
        : 'N/A';
      const interestRate = offer.interest_rate || 'N/A';

      let targetUserId = null;
      if (creatorRole !== 'Agent') {
        targetUserId = offer.agent_id?._id || offer.agent_id || creator._id;
        if (targetUserId && typeof targetUserId !== 'string') {
          targetUserId = targetUserId.toString();
        }
      }

      // Batch key: group by notification target (Admin role or specific agent user)
      const batchKey = creatorRole === 'Agent' ? 'role_Admin' : `user_${targetUserId}`;
      offerCreatedBatcher.add(batchKey, {
        offer, creator, lead, project,
        creatorRole, bonusAmount, bankName, leadName,
        investmentVolume, interestRate, targetUserId,
      });

      // Ticket creation stays per-offer (not batched)
      try {
        const { Todo } = require('../models');

        let priority = 3;
        if (offer.investment_volume) {
          if (offer.investment_volume >= 100000) priority = 5;
          else if (offer.investment_volume >= 50000) priority = 4;
          else if (offer.investment_volume >= 20000) priority = 3;
          else priority = 2;
        }

        const ticketMessage = `Offer "${offer.title || 'New Offer'}" - ${investmentVolume} at ${interestRate}% interest for ${leadName}`;
        const isAdminCreated = creatorRole === 'Admin';

        const offerTicket = new Todo({
          creator_id: creator._id,
          lead_id: lead._id,
          offer_id: offer._id,
          message: ticketMessage,
          isDone: false,
          active: true,
          admin_only: isAdminCreated,
          priority: priority,
          type: 'Ticket',
        });

        await offerTicket.save();

        logger.info('Offer ticket created automatically', {
          ticketId: offerTicket._id,
          offerId: offer._id,
          leadId: lead._id,
          creatorId: creator._id,
          priority: priority,
        });
      } catch (ticketError) {
        logger.error('Failed to create offer ticket', {
          error: ticketError.message,
          offerId: offer._id,
          leadId: lead?._id,
        });
      }
    } catch (error) {
      logger.error('Failed to process offer creation event', {
        error: error.message,
        stack: error.stack,
        creatorRole: data?.creator?.role ?? 'unknown',
        hint: 'Check NOTIFICATION_SERVICE_URL and that offer_created rule is enabled in notification-service',
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.UPDATED, async (data) => {
    try {
      const { offer, creator, lead, changes } = data;
      const creatorRole = creator?.role || creator?.role_id?.name || 'Agent';

      if (creatorRole === 'Agent') {
        let bonusAmount = 'N/A';
        if (offer.bonus_amount) {
          if (typeof offer.bonus_amount === 'object' && offer.bonus_amount.name) {
            bonusAmount = offer.bonus_amount.name;
          } else if (typeof offer.bonus_amount === 'string') {
            bonusAmount = offer.bonus_amount;
          }
        }

        let bankName = 'N/A';
        if (offer.bank_id) {
          if (typeof offer.bank_id === 'object' && offer.bank_id.name) {
            bankName = offer.bank_id.name;
          } else if (typeof offer.bank_id === 'string') {
            bankName = offer.bank_id;
          }
        }

        const leadName = lead?.contact_name || `Lead #${(offer.lead_id?._id || offer.lead_id)?.toString().slice(-6)}`;
        const investmentVolume = offer.investment_volume
          ? `€${offer.investment_volume.toLocaleString()}`
          : 'N/A';
        const interestRate = offer.interest_rate || 'N/A';
        const changeCount = changes ? Object.keys(changes).length : 0;
        const message = `Offer updated by agent: "${offer.title || `Offer #${offer._id}`}" for lead "${leadName}" - ${investmentVolume} at ${interestRate}% interest${changeCount > 0 ? ` (${changeCount} field${changeCount > 1 ? 's' : ''} changed)` : ''}`;

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'offer:updated',
            notification: {
              id: `offer_updated_${offer._id}_${Date.now()}`,
              type: 'offer_updated',
              category: 'offer',
              priority: 'medium',
              title: 'Offer Updated by Agent',
              message: message,
              data: {
                external_id: `offer_updated_${offer._id}`,
                offer: {
                  id: offer._id,
                  title: offer.title,
                  investment_volume: offer.investment_volume,
                  interest_rate: offer.interest_rate,
                  status: offer.status || 'pending',
                  bonus_amount: offer.bonus_amount,
                  bank_id: offer.bank_id,
                  offer_type: offer.offerType,
                },
                lead: {
                  id: offer.lead_id?._id || offer.lead_id,
                  contact_name: leadName,
                  email_from: lead?.email_from,
                  displayName: leadName,
                },
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                project: {
                  id: offer.project_id?._id || offer.project_id,
                  name: offer.project_id?.name || 'Unknown Project',
                },
                changes: changes || {},
                metadata: {
                  createdAt: new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                  leadName: leadName,
                  amount: offer.investment_volume ? offer.investment_volume.toString() : 'N/A',
                  interestRate: offer.interest_rate ? `${offer.interest_rate}%` : 'N/A',
                  bonus: bonusAmount,
                  bank: bankName,
                  offerType: offer.offerType || 'N/A',
                  changeCount: changeCount,
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          }
        );

        logger.info('Offer update notification sent to admins (agent updated)', {
          offerId: offer._id,
          leadId: offer.lead_id?._id || offer.lead_id,
          creatorId: creator._id,
          changeCount: changeCount,
          responseStatus: response?.status,
          saved: response?.data?.saved,
        });
      }

      // Offer status changed to "sent" → notify the assigned agent
      if (changes?.status === 'sent') {
        const agentId = offer.agent_id?._id || offer.agent_id;

        if (agentId && agentId.toString() !== creator?._id?.toString()) {
          const leadName = lead?.contact_name || `Lead #${(offer.lead_id?._id || offer.lead_id)?.toString().slice(-6)}`;

          let bankName = 'N/A';
          if (offer.bank_id) {
            bankName = typeof offer.bank_id === 'object' && offer.bank_id.name
              ? offer.bank_id.name
              : typeof offer.bank_id === 'string' ? offer.bank_id : 'N/A';
          }

          const investmentVolume = offer.investment_volume
            ? `€${typeof offer.investment_volume === 'number' ? offer.investment_volume.toLocaleString() : offer.investment_volume}`
            : 'N/A';

          const message = `Offer "${offer.title || `Offer #${offer._id}`}" for lead "${leadName}" has been sent — ${investmentVolume}, Bank: ${bankName}`;

          try {
            const statusResponse = await notificationAxios.post(
              '/notifications/microservice-send',
              {
                eventType: 'offer_status_sent',
                notification: {
                  id: `offer_status_sent_${offer._id}_${Date.now()}`,
                  type: 'offer_status_sent',
                  category: 'offer',
                  priority: 'high',
                  title: 'Offer Sent',
                  message,
                  data: {
                    external_id: `offer_status_sent_${offer._id}`,
                    offer: {
                      id: offer._id,
                      title: offer.title,
                      investment_volume: offer.investment_volume,
                      interest_rate: offer.interest_rate,
                      status: 'sent',
                      bank_id: offer.bank_id,
                      offer_type: offer.offerType,
                    },
                    lead: {
                      id: offer.lead_id?._id || offer.lead_id,
                      contact_name: leadName,
                      email_from: lead?.email_from,
                      displayName: leadName,
                    },
                    creator: {
                      id: creator._id,
                      login: creator.login,
                      name: creator.name || creator.login,
                    },
                    project: {
                      id: offer.project_id?._id || offer.project_id,
                      name: offer.project_id?.name || 'Unknown Project',
                    },
                    metadata: {
                      createdAt: new Date().toISOString(),
                      timestamp: new Date().toISOString(),
                      leadName,
                      amount: offer.investment_volume ? offer.investment_volume.toString() : 'N/A',
                      bank: bankName,
                      offerType: offer.offerType || 'N/A',
                    },
                  },
                  timestamp: new Date().toISOString(),
                  read: false,
                },
                targetUserId: agentId.toString(),
              }
            );

            logger.info('Offer status "sent" notification sent to assigned agent', {
              offerId: offer._id,
              agentId: agentId.toString(),
              responseStatus: statusResponse?.status,
            });
          } catch (statusError) {
            logger.error('Failed to send offer status "sent" notification to agent', {
              error: statusError.message,
              offerId: offer._id,
              agentId: agentId.toString(),
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to send offer update notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
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
      } = data;

      if (!lead || !toAgent || !toProject) {
        logger.warn('Missing required data for lead transfer notification', {
          hasLead: !!lead,
          hasToAgent: !!toAgent,
          hasToProject: !!toProject,
        });
        return;
      }

      const leadName =
        lead.contact_name || lead.display_name || `Lead #${lead._id.toString().slice(-6)}`;
      const fromProjectName = fromProject?.name || 'Unknown Project';
      const toProjectName = toProject.name || 'Unknown Project';
      const message = `Lead "${leadName}" transferred from "${fromProjectName}" to "${toProjectName}"`;

      const response = await notificationAxios.post(
        '/notifications/microservice-send',
        {
          eventType: 'lead_transferred',
          eventData: {
            lead: lead,
            creator: creator,
            fromProject: fromProject || null,
            fromAgent: fromAgent || null,
            toProject: toProject,
            toAgent: toAgent,
            transferRecord: transferRecord || null,
            isFreshTransfer: isFreshTransfer || false,
          },
        }
      );

      logger.info('Lead transfer notification sent to notification service', {
        leadId: lead._id,
        toAgentId: toAgent._id,
        toProjectId: toProject._id,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send lead transfer notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.LEAD.BULK_TRANSFERRED, async (data) => {
    try {
      const {
        leadIds,
        toProjectId,
        toAgentUserId,
        transferredBy,
        user,
        fromProject,
        fromAgent,
        isFreshTransfer,
        successCount,
      } = data;

      if (!toProjectId || !toAgentUserId || !user || successCount === 0) {
        logger.warn('Missing required data for bulk lead transfer notification', {
          hasToProjectId: !!toProjectId,
          hasToAgentUserId: !!toAgentUserId,
          hasUser: !!user,
          successCount: successCount || 0,
        });
        return;
      }

      const { Team, User } = require('../models');
      const [toProject, toAgent] = await Promise.all([
        Team.findById(toProjectId).lean(),
        User.findById(toAgentUserId).lean(),
      ]);

      if (!toProject || !toAgent) {
        logger.error('Target project or agent not found for bulk transfer notification', {
          toProjectId,
          toAgentUserId,
        });
        return;
      }

      const fromProjectName = fromProject?.name || 'Multiple Projects';
      const toProjectName = toProject.name || 'Unknown Project';
      const message = `${successCount} lead${successCount > 1 ? 's' : ''} transferred from "${fromProjectName}" to "${toProjectName}"`;

      const response = await notificationAxios.post(
        '/notifications/microservice-send',
        {
          eventType: 'bulk_lead_transferred',
          eventData: {
            leadIds: leadIds || [],
            toProjectId: toProjectId,
            toAgentUserId: toAgentUserId,
            successCount: successCount || 0,
            failureCount: 0,
            transferredBy: transferredBy,
            user: user,
            fromProject: fromProject || null,
            fromAgent: fromAgent || null,
            isFreshTransfer: isFreshTransfer || false,
          },
        }
      );

      logger.info('Bulk lead transfer notification sent to notification service', {
        leadCount: successCount,
        toAgentId: toAgent._id,
        toProjectId: toProject._id,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send bulk lead transfer notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  // Batch collector: groups rapid OPENING.CREATED events by creator
  // and sends one summary HTTP call per batch.
  const openingCreatedBatcher = new EventBatchCollector({
    windowMs: 500,
    onFlush: async (_key, items) => {
      try {
        const first = items[0];
        const totalCount = items.length;

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'opening:created',
            eventData: {
              opening: first.opening,
              creator: first.creator,
              lead: first.lead,
              offer: first.offer,
              batchInfo: {
                isMultiple: totalCount > 1,
                totalCount,
                currentIndex: 1,
              },
            },
          }
        );

        logger.info('Batched opening creation notification sent', {
          totalCount,
          openingId: first.opening._id,
          creatorId: first.creator._id,
          responseStatus: response?.status,
        });
      } catch (error) {
        logger.error('Failed to send batched opening creation notification', {
          error: error.message,
          stack: error.stack,
          response: error.response?.data,
        });
      }
    },
  });

  eventEmitter.on(EVENT_TYPES.OPENING.CREATED, async (data) => {
    const { opening, creator, lead, offer } = data;

    let targetUserId = creator._id;
    if (offer?.agent_id) {
      targetUserId = offer.agent_id._id || offer.agent_id;
    }
    if (targetUserId && typeof targetUserId !== 'string') {
      targetUserId = targetUserId.toString();
    }

    const batchKey = `${targetUserId}_${creator._id}`;
    openingCreatedBatcher.add(batchKey, { opening, creator, lead, offer });
  });

  // Batch collector: groups rapid LEAD.ASSIGNED events by (agentId, projectId)
  // and sends a single HTTP call per batch after 500ms of inactivity.
  const leadAssignBatcher = new EventBatchCollector({
    windowMs: 500,
    onFlush: async (_key, items) => {
      try {
        const first = items[0];
        const totalCount = items.length;
        const isMultiple = totalCount > 1;

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'lead_assigned',
            eventData: {
              lead: first.lead,
              creator: first.creator || { _id: first.agent._id, role: 'Admin' },
              agent: first.agent,
              project: first.project,
              batchInfo: {
                isMultiple,
                totalCount,
                currentIndex: 1,
              },
            },
          }
        );

        logger.info('Batched lead assignment notification sent', {
          totalCount,
          agentId: first.agent._id,
          projectId: first.project._id,
          responseStatus: response?.status,
        });
      } catch (error) {
        logger.error('Failed to send batched lead assignment notification', {
          error: error.message,
          stack: error.stack,
          response: error.response?.data,
        });
      }
    },
  });

  eventEmitter.on(EVENT_TYPES.LEAD.ASSIGNED, async (data) => {
    const { lead, creator, agent, project } = data;

    if (!lead || !agent || !project) {
      logger.warn('Missing required data for lead assignment notification', {
        hasLead: !!lead,
        hasAgent: !!agent,
        hasProject: !!project,
      });
      return;
    }

    const batchKey = `${agent._id}_${project._id}`;
    leadAssignBatcher.add(batchKey, { lead, creator, agent, project });
  });

  eventEmitter.on(EVENT_TYPES.TODO.CREATED, async (data) => {
    try {
      const { todo, creator, lead } = data || {};
      const assignee = todo?.assigned_to;

      if (!assignee) {
        logger.debug('Todo created without assignee; skipping notification', { todoId: todo?._id });
        return;
      }

      const targetUserId = assignee._id?.toString?.() || assignee.toString?.() || assignee;
      const leadName =
        lead?.contact_name ||
        lead?.display_name ||
        todo?.lead_id?.contact_name ||
        `Lead #${(lead?._id || todo?.lead_id)?._id?.toString?.()?.slice(-6) ||
        (lead?._id || todo?.lead_id)?.toString?.()?.slice(-6) ||
        'unknown'
        }`;
      const message = `New ticket assigned for lead "${leadName}"`;

      const response = await notificationAxios.post('/notifications/microservice-send', {
        eventType: 'todo:created',
        eventData: {
          todo,
          lead: lead || todo?.lead_id,
          assignee,
          creator,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
        notification: {
          id: `todo_created_${todo?._id}_${Date.now()}`,
          type: 'todo_created',
          category: 'todo',
          priority: 'medium',
          title: 'New Ticket Assigned',
          message,
          data: {
            external_id: `todo_created_${todo?._id}`,
            todo: {
              id: todo?._id,
              message: todo?.message,
              isDone: todo?.isDone,
            },
            lead: {
              id: lead?._id || todo?.lead_id?._id || todo?.lead_id,
              contact_name: lead?.contact_name || todo?.lead_id?.contact_name,
              displayName:
                lead?.display_name ||
                todo?.lead_id?.display_name ||
                (leadName || '').trim(),
            },
            assignee: {
              id: targetUserId,
              login: assignee.login,
              name: assignee.name || assignee.login,
            },
            creator: {
              id: creator?._id,
              login: creator?.login,
              name: creator?.name || creator?.login,
              role: creator?.role,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
          read: false,
        },
        targetUserId,
      });

      logger.info('Todo creation notification sent to assignee', {
        todoId: todo?._id,
        targetUserId,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send todo creation notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.TODO.ASSIGNED, async (data) => {
    try {
      const { todo, assignee, assigner } = data || {};
      if (!assignee) {
        logger.warn('No assignee provided for todo assignment notification', { todoId: todo?._id });
        return;
      }

      const targetUserId = assignee._id?.toString?.() || assignee.toString?.() || assignee;
      const leadName =
        todo?.lead_id?.contact_name ||
        todo?.lead_id?.display_name ||
        `Lead #${todo?.lead_id?._id?.toString?.()?.slice(-6) || todo?.lead_id?.toString?.()?.slice(-6) || 'unknown'}`;
      const message = `Ticket assigned to you for lead "${leadName}"`;

      const response = await notificationAxios.post('/notifications/microservice-send', {
        eventType: 'todo:assigned',
        eventData: {
          todo,
          lead: todo?.lead_id,
          assignee,
          assigner,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
        notification: {
          id: `todo_assigned_${todo?._id}_${Date.now()}`,
          type: 'todo_assigned',
          category: 'todo',
          priority: 'medium',
          title: 'Ticket Assigned',
          message,
          data: {
            external_id: `todo_assigned_${todo?._id}`,
            todo: {
              id: todo?._id,
              message: todo?.message,
              isDone: todo?.isDone,
            },
            lead: {
              id: todo?.lead_id?._id || todo?.lead_id,
              contact_name: todo?.lead_id?.contact_name,
              displayName:
                todo?.lead_id?.display_name ||
                leadName ||
                `Lead #${todo?.lead_id?._id?.toString?.()?.slice(-6) || todo?.lead_id?.toString?.()?.slice(-6) || 'unknown'}`,
            },
            assignee: {
              id: targetUserId,
              login: assignee.login,
              name: assignee.name || assignee.login,
            },
            assigner: {
              id: assigner?._id,
              login: assigner?.login,
              name: assigner?.name || assigner?.login,
              role: assigner?.role,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
          read: false,
        },
        targetUserId,
      });

      logger.info('Todo assignment notification sent to assignee', {
        todoId: todo?._id,
        targetUserId,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send todo assignment notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.TODO.COMPLETED, async (data) => {
    try {
      const { todo, updater, lead } = data || {};

      if (!todo || !updater) {
        logger.warn('Missing required data for todo completion notification', {
          todoId: todo?._id,
          updaterId: updater?._id
        });
        return;
      }

      const leadName =
        lead?.contact_name ||
        lead?.display_name ||
        todo?.lead_id?.contact_name ||
        todo?.lead_id?.display_name ||
        `Lead #${(lead?._id || todo?.lead_id?._id)?.toString?.()?.slice(-6) ||
        (lead || todo?.lead_id)?.toString?.()?.slice(-6) ||
        'unknown'
        }`;

      const completedByName = updater.login || updater.name || 'Unknown User';
      const duration = todo?.completion_duration || '';

      const message = duration
        ? `Ticket for lead "${leadName}" completed by ${completedByName} in ${duration}`
        : `Ticket for lead "${leadName}" completed by ${completedByName}`;

      const response = await notificationAxios.post('/notifications/microservice-send', {
        eventType: 'todo:completed',
        eventData: {
          todo,
          lead: lead || todo?.lead_id,
          updater,
          metadata: {
            timestamp: new Date().toISOString(),
            completedAt: todo?.dateOfDone,
            duration: duration,
          },
        },
        notification: {
          id: `todo_completed_${todo?._id}_${Date.now()}`,
          type: 'todo_completed',
          category: 'todo',
          priority: 'medium',
          title: 'Ticket Completed',
          message,
          data: {
            external_id: `todo_completed_${todo?._id}`,
            todo: {
              id: todo?._id,
              message: todo?.message,
              isDone: todo?.isDone,
              dateOfDone: todo?.dateOfDone,
              completion_duration: duration,
            },
            lead: {
              id: (lead?._id || todo?.lead_id?._id || lead || todo?.lead_id),
              contact_name: lead?.contact_name || todo?.lead_id?.contact_name,
              displayName: leadName,
            },
            completedBy: {
              id: updater._id,
              login: updater.login,
              name: completedByName,
              role: updater.role,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              completedAt: todo?.dateOfDone,
              duration: duration,
            },
          },
          timestamp: new Date().toISOString(),
          read: false,
        },
        targetRole: 'Admin',
      });

      logger.info('Todo completion notification sent to admins', {
        todoId: todo?._id,
        completedById: updater._id,
        responseStatus: response?.status,
      });
    } catch (error) {
      logger.error('Failed to send todo completion notification', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.CONFIRMATION.CREATED, async (data) => {
    try {
      const { confirmation, creator, lead, offer } = data;

      const creatorRole = creator?.role || 'Agent';

      let confirmationDetails = 'New confirmation available';
      if (confirmation.description) {
        confirmationDetails = confirmation.description;
      }

      const leadName =
        lead?.contact_name || lead?.display_name || `Lead #${lead?._id?.toString().slice(-6)}`;
      const message = `New confirmation created for lead "${leadName}" - ${confirmationDetails}`;

      // Build metadata.amount, interestRate, bonus, bank for frontend display (same shape as offer_created)
      let bonusAmount = 'N/A';
      if (offer?.bonus_amount) {
        if (typeof offer.bonus_amount === 'object' && offer.bonus_amount.name) {
          bonusAmount = offer.bonus_amount.name;
        } else if (offer.bonus_amount?.info?.amount != null) {
          bonusAmount = `€${Number(offer.bonus_amount.info.amount).toLocaleString()}`;
        } else if (typeof offer.bonus_amount === 'string') {
          bonusAmount = offer.bonus_amount;
        }
      }
      let bankName = 'N/A';
      if (offer?.bank_id) {
        if (typeof offer.bank_id === 'object' && offer.bank_id.name) {
          bankName = offer.bank_id.name;
        } else if (typeof offer.bank_id === 'string') {
          bankName = offer.bank_id;
        }
      }
      const investmentVolume = offer?.investment_volume
        ? `€${Number(offer.investment_volume).toLocaleString()}`
        : 'N/A';
      const interestRate = offer?.interest_rate != null ? `${offer.interest_rate}%` : 'N/A';

      const baseMetadata = {
        timestamp: new Date().toISOString(),
        leadId: lead?._id,
        leadName: leadName,
        offerId: offer?._id,
        confirmationId: confirmation._id,
        amount: investmentVolume,
        interestRate,
        bonus: bonusAmount,
        bank: bankName,
      };

      if (creatorRole === 'Agent') {
        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'confirmation:created',
            notification: {
              id: `confirmation_created_${confirmation._id}_${Date.now()}`,
              type: 'confirmation_created',
              category: 'confirmation',
              priority: 'high',
              title: 'New Confirmation Created',
              message: message,
              data: {
                external_id: `confirmation_created_${confirmation._id}`,
                confirmation: {
                  id: confirmation._id,
                  description: confirmation.description || 'New confirmation',
                },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: offer
                  ? {
                    id: offer._id,
                    investment_volume: offer.investment_volume,
                    interest_rate: offer.interest_rate,
                    bonus_amount: offer.bonus_amount,
                    bank_id: offer.bank_id,
                  }
                  : null,
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: baseMetadata,
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          }
        );

        logger.info('Confirmation creation notification sent to admins', {
          confirmationId: confirmation._id,
          leadId: lead._id,
          responseStatus: response?.status,
        });
      } else {
        let targetUserId = offer?.agent_id?._id || offer?.agent_id || creator._id;
        if (targetUserId && typeof targetUserId !== 'string') {
          targetUserId = targetUserId.toString();
        }

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'confirmation:created',
            notification: {
              id: `confirmation_created_${confirmation._id}_${Date.now()}`,
              type: 'confirmation_created',
              category: 'confirmation',
              priority: 'high',
              title: 'New Confirmation Created',
              message: message,
              data: {
                external_id: `confirmation_created_${confirmation._id}`,
                confirmation: {
                  id: confirmation._id,
                  description: confirmation.description || 'New confirmation',
                },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: offer
                  ? {
                    id: offer._id,
                    investment_volume: offer.investment_volume,
                    interest_rate: offer.interest_rate,
                    bonus_amount: offer.bonus_amount,
                    bank_id: offer.bank_id,
                  }
                  : null,
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: baseMetadata,
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetUserId: targetUserId,
          }
        );

        logger.info('Confirmation creation notification sent to agent', {
          confirmationId: confirmation._id,
          targetUserId: targetUserId,
          responseStatus: response?.status,
        });
      }
    } catch (error) {
      logger.error('Failed to send confirmation creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.PAYMENT_VOUCHER.CREATED, async (data) => {
    try {
      const { paymentVoucher, creator, lead, offer } = data;
      const creatorRole = creator?.role || 'Agent';

      let paymentDetails = 'New payment voucher available';
      if (paymentVoucher.amount) {
        paymentDetails = `Amount: €${paymentVoucher.amount.toLocaleString()}`;
      }

      const leadName =
        lead?.contact_name || lead?.display_name || `Lead #${lead?._id?.toString().slice(-6)}`;
      const message = `New payment created for lead "${leadName}" - ${paymentDetails}`;

      if (creatorRole === 'Agent') {
        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'payment_voucher:created',
            notification: {
              id: `payment_voucher_created_${paymentVoucher._id}_${Date.now()}`,
              type: 'payment_voucher_created',
              category: 'payment',
              priority: 'high',
              title: 'New Payment Created',
              message: message,
              data: {
                external_id: `payment_voucher_created_${paymentVoucher._id}`,
                paymentVoucher: {
                  id: paymentVoucher._id,
                  amount: paymentVoucher.amount,
                  description: paymentVoucher.description || 'New payment',
                },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: offer
                  ? {
                    id: offer._id,
                    investment_volume: offer.investment_volume,
                    interest_rate: offer.interest_rate,
                  }
                  : null,
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer?._id,
                  paymentVoucherId: paymentVoucher._id,
                  amount: paymentVoucher.amount ? paymentVoucher.amount.toString() : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          }
        );

        logger.info('Payment voucher creation notification sent to admins', {
          paymentVoucherId: paymentVoucher._id,
          leadId: lead._id,
          responseStatus: response?.status,
        });
      } else {
        let targetUserId = offer?.agent_id?._id || offer?.agent_id || creator._id;
        if (targetUserId && typeof targetUserId !== 'string') {
          targetUserId = targetUserId.toString();
        }

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'payment_voucher:created',
            notification: {
              id: `payment_voucher_created_${paymentVoucher._id}_${Date.now()}`,
              type: 'payment_voucher_created',
              category: 'payment',
              priority: 'high',
              title: 'New Payment Created',
              message: message,
              data: {
                external_id: `payment_voucher_created_${paymentVoucher._id}`,
                paymentVoucher: {
                  id: paymentVoucher._id,
                  amount: paymentVoucher.amount,
                  description: paymentVoucher.description || 'New payment',
                },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: offer
                  ? {
                    id: offer._id,
                    investment_volume: offer.investment_volume,
                    interest_rate: offer.interest_rate,
                  }
                  : null,
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer?._id,
                  paymentVoucherId: paymentVoucher._id,
                  amount: paymentVoucher.amount ? paymentVoucher.amount.toString() : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetUserId: targetUserId,
          }
        );

        logger.info('Payment voucher creation notification sent to agent', {
          paymentVoucherId: paymentVoucher._id,
          targetUserId: targetUserId,
          responseStatus: response?.status,
        });
      }
    } catch (error) {
      logger.error('Failed to send payment voucher creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.NETTO1_SENT, async (data) => {
    try {
      const { offer, netto1, creator, lead, bankerRate, agentRate, calculatedAmounts } = data;

      const creatorRole = creator?.role || 'Agent';

      const leadName =
        lead?.contact_name || lead?.display_name || `Lead #${lead?._id?.toString().slice(-6)}`;
      const nettoDetails = 'Netto 1 document sent';
      const message = `Netto 1 created for lead "${leadName}" - ${nettoDetails}`;

      const bonusName = offer.bonus_amount?.name || offer.bonus_amount || 'N/A';
      const bonusValue = offer.bonus_amount?.info?.amount || offer.bonus_amount?.info || null;
      const bonusFormatted = bonusValue ? `€${Number(bonusValue).toLocaleString()}` : bonusName;
      const bankName = offer.bank_id?.name || 'N/A';

      if (creatorRole === 'Agent') {
        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'offer:netto1_sent',
            notification: {
              id: `netto1_created_${offer._id}_${Date.now()}`,
              type: 'netto1_created',
              category: 'netto',
              priority: 'high',
              title: 'Netto 1 Created',
              message: message,
              data: {
                external_id: `netto1_created_${offer._id}`,
                netto1: netto1 || { id: offer._id, status: 'sent' },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: {
                  id: offer._id,
                  investment_volume: offer.investment_volume,
                  interest_rate: offer.interest_rate,
                  bonus_amount: bonusName,
                  bonus_value: bonusValue,
                  bank_name: bankName,
                  bank_id: offer.bank_id?._id || offer.bank_id,
                  bankerRate: bankerRate,
                  agentRate: agentRate,
                },
                calculatedAmounts: calculatedAmounts || {},
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer._id,
                  netto1Id: netto1?._id,
                  amount: offer.investment_volume
                    ? `€${offer.investment_volume.toLocaleString()}`
                    : 'N/A',
                  interestRate: offer.interest_rate ? `${offer.interest_rate}%` : 'N/A',
                  bonus: bonusFormatted,
                  bank: bankName,
                  bankerRate: bankerRate ? `${bankerRate}%` : 'N/A',
                  agentRate: agentRate ? `${agentRate}%` : 'N/A',
                  agentShare:
                    calculatedAmounts?.agentShare !== undefined
                      ? `€${Number(calculatedAmounts.agentShare).toLocaleString()}`
                      : 'N/A',
                  bankShare:
                    calculatedAmounts?.bankShare !== undefined
                      ? `€${Number(calculatedAmounts.bankShare).toLocaleString()}`
                      : 'N/A',
                  revenue:
                    calculatedAmounts?.revenue !== undefined
                      ? `€${Number(calculatedAmounts.revenue).toLocaleString()}`
                      : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          }
        );

        logger.info('Netto1 creation notification sent to admins', {
          offerId: offer._id,
          leadId: lead._id,
          responseStatus: response?.status,
        });
      } else {
        let targetUserId = offer?.agent_id?._id || offer?.agent_id || creator._id;
        if (targetUserId && typeof targetUserId !== 'string') {
          targetUserId = targetUserId.toString();
        }

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'offer:netto1_sent',
            notification: {
              id: `netto1_created_${offer._id}_${Date.now()}`,
              type: 'netto1_created',
              category: 'netto',
              priority: 'high',
              title: 'Netto 1 Created',
              message: message,
              data: {
                external_id: `netto1_created_${offer._id}`,
                netto1: netto1 || { id: offer._id, status: 'sent' },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: {
                  id: offer._id,
                  investment_volume: offer.investment_volume,
                  interest_rate: offer.interest_rate,
                  bonus_amount: bonusName,
                  bonus_value: bonusValue,
                  bank_name: bankName,
                  bank_id: offer.bank_id?._id || offer.bank_id,
                  bankerRate: bankerRate,
                  agentRate: agentRate,
                },
                calculatedAmounts: calculatedAmounts || {},
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer._id,
                  netto1Id: netto1?._id,
                  amount: offer.investment_volume
                    ? `€${offer.investment_volume.toLocaleString()}`
                    : 'N/A',
                  interestRate: offer.interest_rate ? `${offer.interest_rate}%` : 'N/A',
                  bonus: bonusFormatted,
                  bank: bankName,
                  bankerRate: bankerRate ? `${bankerRate}%` : 'N/A',
                  agentRate: agentRate ? `${agentRate}%` : 'N/A',
                  agentShare:
                    calculatedAmounts?.agentShare !== undefined
                      ? `€${Number(calculatedAmounts.agentShare).toLocaleString()}`
                      : 'N/A',
                  bankShare:
                    calculatedAmounts?.bankShare !== undefined
                      ? `€${Number(calculatedAmounts.bankShare).toLocaleString()}`
                      : 'N/A',
                  revenue:
                    calculatedAmounts?.revenue !== undefined
                      ? `€${Number(calculatedAmounts.revenue).toLocaleString()}`
                      : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetUserId: targetUserId,
          }
        );

        logger.info('Netto1 creation notification sent to agent', {
          offerId: offer._id,
          targetUserId: targetUserId,
          responseStatus: response?.status,
        });
      }
    } catch (error) {
      logger.error('Failed to send netto1 creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  eventEmitter.on(EVENT_TYPES.OFFER.NETTO2_SENT, async (data) => {
    try {
      const { offer, netto2, creator, lead, bankerRate, agentRate, calculatedAmounts } = data;

      const creatorRole = creator?.role || 'Agent';

      const leadName =
        lead?.contact_name || lead?.display_name || `Lead #${lead?._id?.toString().slice(-6)}`;
      const nettoDetails = 'Netto 2 document sent';
      const message = `Netto 2 created for lead "${leadName}" - ${nettoDetails}`;

      const bonusName = offer.bonus_amount?.name || offer.bonus_amount || 'N/A';
      const bonusValue = offer.bonus_amount?.info?.amount || offer.bonus_amount?.info || null;
      const bonusFormatted = bonusValue ? `€${Number(bonusValue).toLocaleString()}` : bonusName;
      const bankName = offer.bank_id?.name || 'N/A';

      if (creatorRole === 'Agent') {
        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'offer:netto2_sent',
            notification: {
              id: `netto2_created_${offer._id}_${Date.now()}`,
              type: 'netto2_created',
              category: 'netto',
              priority: 'high',
              title: 'Netto 2 Created',
              message: message,
              data: {
                external_id: `netto2_created_${offer._id}`,
                netto2: netto2 || { id: offer._id, status: 'sent' },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: {
                  id: offer._id,
                  investment_volume: offer.investment_volume,
                  interest_rate: offer.interest_rate,
                  bonus_amount: bonusName,
                  bonus_value: bonusValue,
                  bank_name: bankName,
                  bank_id: offer.bank_id?._id || offer.bank_id,
                  bankerRate: bankerRate,
                  agentRate: agentRate,
                },
                calculatedAmounts: calculatedAmounts || {},
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer._id,
                  netto2Id: netto2?._id,
                  amount: offer.investment_volume
                    ? `€${offer.investment_volume.toLocaleString()}`
                    : 'N/A',
                  interestRate: offer.interest_rate ? `${offer.interest_rate}%` : 'N/A',
                  bonus: bonusFormatted,
                  bank: bankName,
                  bankerRate: bankerRate ? `${bankerRate}%` : 'N/A',
                  agentRate: agentRate ? `${agentRate}%` : 'N/A',
                  agentShare:
                    calculatedAmounts?.agentShare !== undefined
                      ? `€${Number(calculatedAmounts.agentShare).toLocaleString()}`
                      : 'N/A',
                  bankShare:
                    calculatedAmounts?.bankShare !== undefined
                      ? `€${Number(calculatedAmounts.bankShare).toLocaleString()}`
                      : 'N/A',
                  revenue:
                    calculatedAmounts?.revenue !== undefined
                      ? `€${Number(calculatedAmounts.revenue).toLocaleString()}`
                      : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          }
        );

        logger.info('Netto2 creation notification sent to admins', {
          offerId: offer._id,
          leadId: lead._id,
          responseStatus: response?.status,
        });
      } else {
        let targetUserId = offer?.agent_id?._id || offer?.agent_id || creator._id;
        if (targetUserId && typeof targetUserId !== 'string') {
          targetUserId = targetUserId.toString();
        }

        const response = await notificationAxios.post(
          '/notifications/microservice-send',
          {
            eventType: 'offer:netto2_sent',
            notification: {
              id: `netto2_created_${offer._id}_${Date.now()}`,
              type: 'netto2_created',
              category: 'netto',
              priority: 'high',
              title: 'Netto 2 Created',
              message: message,
              data: {
                external_id: `netto2_created_${offer._id}`,
                netto2: netto2 || { id: offer._id, status: 'sent' },
                lead: {
                  id: lead._id,
                  contact_name: lead.contact_name,
                  display_name: lead.display_name,
                },
                offer: {
                  id: offer._id,
                  investment_volume: offer.investment_volume,
                  interest_rate: offer.interest_rate,
                  bonus_amount: bonusName,
                  bonus_value: bonusValue,
                  bank_name: bankName,
                  bank_id: offer.bank_id?._id || offer.bank_id,
                  bankerRate: bankerRate,
                  agentRate: agentRate,
                },
                calculatedAmounts: calculatedAmounts || {},
                creator: {
                  id: creator._id,
                  login: creator.login,
                  name: creator.name || creator.login,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadId: lead._id,
                  leadName: leadName,
                  offerId: offer._id,
                  netto2Id: netto2?._id,
                  amount: offer.investment_volume
                    ? `€${offer.investment_volume.toLocaleString()}`
                    : 'N/A',
                  interestRate: offer.interest_rate ? `${offer.interest_rate}%` : 'N/A',
                  bonus: bonusFormatted,
                  bank: bankName,
                  bankerRate: bankerRate ? `${bankerRate}%` : 'N/A',
                  agentRate: agentRate ? `${agentRate}%` : 'N/A',
                  agentShare:
                    calculatedAmounts?.agentShare !== undefined
                      ? `€${Number(calculatedAmounts.agentShare).toLocaleString()}`
                      : 'N/A',
                  bankShare:
                    calculatedAmounts?.bankShare !== undefined
                      ? `€${Number(calculatedAmounts.bankShare).toLocaleString()}`
                      : 'N/A',
                  revenue:
                    calculatedAmounts?.revenue !== undefined
                      ? `€${Number(calculatedAmounts.revenue).toLocaleString()}`
                      : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetUserId: targetUserId,
          }
        );

        logger.info('Netto2 creation notification sent to agent', {
          offerId: offer._id,
          targetUserId: targetUserId,
          responseStatus: response?.status,
        });
      }
    } catch (error) {
      logger.error('Failed to send netto2 creation notification', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  logger.info('✅ Event listeners set up for notification service');
};

module.exports = { setupNotificationListeners };

