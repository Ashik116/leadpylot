const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');

const REMINDER_MINUTES_BEFORE = 30;

function getNotificationServiceUrl() {
  const isRunningInDocker =
    process.env.NODE_ENV === 'production' ||
    require('fs').existsSync('/.dockerenv') ||
    process.env.DOCKER_CONTAINER === 'true';

  let url = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';

  if (!isRunningInDocker && url.includes('host.docker.internal')) {
    url = url.replace('host.docker.internal', 'localhost');
  }

  return url;
}

/**
 * Find appointments starting within the next ~30 minutes that haven't had
 * a reminder sent yet, then notify the assigned agent AND all admins.
 */
async function checkUpcomingAppointments() {
  try {
    const { Appointment, Lead, User } = require('../models');
    const notificationServiceUrl = getNotificationServiceUrl();

    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000);

    // Query scheduled, active appointments that haven't been reminded yet
    // whose appointment_date falls on today or tomorrow (coarse filter)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(startOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

    const candidates = await Appointment.find({
      status: 'scheduled',
      active: true,
      reminder_sent: false,
      appointment_date: { $gte: startOfToday, $lt: endOfTomorrow },
    }).lean();

    if (candidates.length === 0) return;

    // Fine-filter: build full datetime and check if it falls within the reminder window
    const dueAppointments = candidates.filter((apt) => {
      const fullDt = buildFullDatetime(apt);
      return fullDt >= now && fullDt <= windowEnd;
    });

    if (dueAppointments.length === 0) return;

    logger.info(`[AppointmentReminder] ${dueAppointments.length} appointment(s) due for reminder`);

    for (const appointment of dueAppointments) {
      try {
        const lead = await Lead.findById(appointment.lead_id)
          .select('contact_name email_from phone user_id team_id')
          .populate('user_id', '_id login name role')
          .lean();

        if (!lead) {
          logger.warn('[AppointmentReminder] Lead not found for appointment', {
            appointmentId: appointment._id,
            leadId: appointment.lead_id,
          });
          continue;
        }

        const agent = lead.user_id;
        const leadName = lead.contact_name || 'Unknown Lead';
        const appointmentTime = appointment.appointment_time || 'N/A';
        const location = appointment.location || 'Not specified';
        const title = appointment.title || 'Appointment';

        const message =
          `⏰ Reminder: "${title}" with "${leadName}" starts in 30 minutes` +
          ` — Time: ${appointmentTime}, Location: ${location}`;

        // 1. Notify the assigned agent
        if (agent && agent._id) {
          try {
            await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
              eventType: 'appointment_reminder',
              notification: {
                id: `appointment_reminder_${appointment._id}_agent_${Date.now()}`,
                type: 'appointment_reminder',
                category: 'appointment',
                priority: 'high',
                title: '⏰ Meeting Reminder',
                message,
                data: {
                  external_id: `appointment_reminder_${appointment._id}`,
                  appointment: {
                    id: appointment._id,
                    title,
                    appointment_date: appointment.appointment_date,
                    appointment_time: appointmentTime,
                    location,
                    description: appointment.description,
                  },
                  lead: {
                    id: lead._id,
                    contact_name: leadName,
                    email_from: lead.email_from,
                    phone: lead.phone,
                    displayName: leadName,
                  },
                  metadata: {
                    timestamp: new Date().toISOString(),
                    leadName,
                    appointmentTime,
                    location,
                  },
                },
                timestamp: new Date().toISOString(),
                read: false,
              },
              targetUserId: agent._id.toString(),
            });

            logger.info('[AppointmentReminder] Reminder sent to agent', {
              appointmentId: appointment._id,
              agentId: agent._id,
            });
          } catch (agentErr) {
            logger.error('[AppointmentReminder] Failed to notify agent', {
              error: agentErr.message,
              appointmentId: appointment._id,
              agentId: agent._id,
            });
          }
        }

        // 2. Notify all admins
        try {
          await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
            eventType: 'appointment_reminder',
            notification: {
              id: `appointment_reminder_${appointment._id}_admin_${Date.now()}`,
              type: 'appointment_reminder',
              category: 'appointment',
              priority: 'high',
              title: '⏰ Meeting Reminder',
              message,
              data: {
                external_id: `appointment_reminder_${appointment._id}`,
                appointment: {
                  id: appointment._id,
                  title,
                  appointment_date: appointment.appointment_date,
                  appointment_time: appointmentTime,
                  location,
                  description: appointment.description,
                },
                lead: {
                  id: lead._id,
                  contact_name: leadName,
                  email_from: lead.email_from,
                  phone: lead.phone,
                  displayName: leadName,
                },
                agent: agent
                  ? { id: agent._id, login: agent.login, name: agent.name || agent.login }
                  : null,
                metadata: {
                  timestamp: new Date().toISOString(),
                  leadName,
                  appointmentTime,
                  location,
                },
              },
              timestamp: new Date().toISOString(),
              read: false,
            },
            targetRole: 'Admin',
          });

          logger.info('[AppointmentReminder] Reminder sent to admins', {
            appointmentId: appointment._id,
          });
        } catch (adminErr) {
          logger.error('[AppointmentReminder] Failed to notify admins', {
            error: adminErr.message,
            appointmentId: appointment._id,
          });
        }

        // 3. Mark reminder as sent
        await Appointment.updateOne(
          { _id: appointment._id },
          { $set: { reminder_sent: true } }
        );
      } catch (aptError) {
        logger.error('[AppointmentReminder] Error processing appointment', {
          error: aptError.message,
          appointmentId: appointment._id,
        });
      }
    }
  } catch (error) {
    logger.error('[AppointmentReminder] Cron job error', {
      error: error.message,
      stack: error.stack,
    });
  }
}

function buildFullDatetime(appointment) {
  const date = new Date(appointment.appointment_date);
  if (appointment.appointment_time) {
    const [hours, minutes] = appointment.appointment_time.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
  }
  return date;
}

/**
 * Start the appointment reminder cron job.
 * Runs every minute to catch appointments whose 30-min window just opened.
 */
function startAppointmentReminderCron() {
  cron.schedule('* * * * *', () => {
    checkUpcomingAppointments();
  });

  logger.info('[AppointmentReminder] Cron job started — checking every minute for upcoming appointments');
}

module.exports = { startAppointmentReminderCron };
