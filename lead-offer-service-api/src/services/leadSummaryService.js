/**
 * Lead Summary Service
 * Generates AI summaries for leads.
 * Supports: (1) Leadbot conversation API, (2) OpenAI API (fallback).
 */

const mongoose = require('mongoose');
const axios = require('axios');
const logger = require('../utils/logger');
const leadbotConversationClient = require('../utils/leadbotConversationClient');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_LEAD_SUMMARY_MODEL || 'gpt-4o-mini';
const OPENAI_TIMEOUT = parseInt(process.env.OPENAI_LEAD_SUMMARY_TIMEOUT, 10) || 30000;

/**
 * Check if AI summary generation is enabled (OpenAI)
 */
function isEnabled() {
  return Boolean(OPENAI_API_KEY);
}

/**
 * Check if Leadbot conversation API is enabled for summary generation
 */
function isLeadbotEnabled() {
  return leadbotConversationClient.isEnabled();
}

/**
 * Build context string from lead and activities for the AI prompt
 * @param {Object} lead - Lead document (or lead_snapshot)
 * @param {Array} activities - Activity documents (message, action, createdAt)
 * @returns {string} - Formatted context for the prompt
 */
function buildContextForPrompt(lead, activities = []) {
  const parts = [];

  if (lead) {
    const snap = lead.lead_snapshot || lead;
    parts.push('## Lead Information');
    if (snap.contact_name) parts.push(`- Name: ${snap.contact_name}`);
    if (snap.nametitle) parts.push(`- Title: ${snap.nametitle}`);
    if (snap.email_from) parts.push(`- Email: ${snap.email_from}`);
    if (snap.phone) parts.push(`- Phone: ${snap.phone}`);
    if (snap.stage) parts.push(`- Stage: ${snap.stage}`);
    if (snap.status) parts.push(`- Status: ${snap.status}`);
    if (snap.use_status) parts.push(`- Use Status: ${snap.use_status}`);
    if (snap.notes) parts.push(`- Notes: ${snap.notes}`);
    if (snap.tags && snap.tags.length) parts.push(`- Tags: ${snap.tags.join(', ')}`);
    if (snap.expected_revenue != null) parts.push(`- Expected Revenue: ${snap.expected_revenue}`);
    parts.push('');
  }

  if (activities && activities.length > 0) {
    parts.push('## Recent Activities (newest first)');
    const sorted = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent = sorted.slice(0, 20);
    recent.forEach((a, i) => {
      const date = a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 19) : 'N/A';
      parts.push(`${i + 1}. [${date}] ${a.action || 'activity'}: ${a.message || 'No message'}`);
    });
    parts.push('');
  }

  return parts.join('\n').trim() || 'No context available.';
}

/**
 * Call OpenAI API to generate a lead summary
 * @param {string} context - Formatted context (lead info + activities)
 * @returns {Promise<{summary: string, model: string}|null>}
 */
async function callOpenAIForSummary(context) {
  if (!isEnabled()) {
    logger.debug('Lead summary AI skipped: OPENAI_API_KEY not configured');
    return null;
  }

  const systemPrompt = `You are a CRM assistant. Your task is to write a concise, professional summary of a sales lead based on their profile and recent activities.
The summary should:
- Be 2-4 sentences
- Highlight key contact info, current stage/status, and notable recent activity
- Be useful for a sales agent to quickly understand the lead's situation
- Use neutral, professional language`;

  const userPrompt = `Based on the following lead information and activities, write a brief summary:\n\n${context}`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: OPENAI_TIMEOUT,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      logger.warn('OpenAI returned empty summary', { model: OPENAI_MODEL });
      return null;
    }

    return {
      summary: content,
      model: response.data?.model || OPENAI_MODEL,
    };
  } catch (error) {
    logger.error('OpenAI lead summary failed', {
      error: error.message,
      status: error.response?.status,
      model: OPENAI_MODEL,
    });
    return null;
  }
}

/**
 * Generate and save AI summary for a lead when activity triggers.
 * Archives previous summary to history, calls AI API, saves new summary to LeadAIContext.
 * @param {mongoose.Types.ObjectId} leadId - Lead ID
 * @param {Object} options - { activityId, trigger }
 * @returns {Promise<{saved: boolean, summary?: string}>}
 */
async function generateAndSaveSummary(leadId, options = {}) {
  const { trigger = 'activity_update' } = options;

  if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
    return { saved: false };
  }

  if (!isEnabled()) {
    logger.debug('Lead summary generation skipped: AI not configured');
    return { saved: false };
  }

  try {
    const LeadAIContext = mongoose.model('LeadAIContext');
    const Activity = mongoose.model('Activity');
    const Lead = mongoose.model('Lead');

    let ctx = await LeadAIContext.findOne({ lead_id: leadId }).lean();
    if (!ctx) {
      ctx = await LeadAIContext.create({
        lead_id: leadId,
        lead_activity_history: options.activityId ? [options.activityId] : [],
        pending_ai_update: false,
      });
      ctx = ctx.toObject ? ctx.toObject() : ctx;
    }

    const activityIds = ctx.lead_activity_history || [];
    const activities = activityIds.length
      ? await Activity.find({ _id: { $in: activityIds } })
          .sort({ createdAt: -1 })
          .limit(25)
          .lean()
      : [];

    const lead = await Lead.findById(leadId).lean();
    const contextStr = buildContextForPrompt(
      { lead_snapshot: ctx.lead_snapshot || lead },
      activities
    );

    const result = await callOpenAIForSummary(contextStr);
    if (!result || !result.summary) {
      return { saved: false };
    }

    const LeadAISummaryHistory = mongoose.model('LeadAISummaryHistory');
    const historyDoc = await LeadAISummaryHistory.create({
      lead_id: leadId,
      summary: result.summary,
      model: result.model || null,
      trigger,
      generated_at: new Date(),
      ...(ctx.tenantId && { tenantId: ctx.tenantId }),
    });

    await LeadAIContext.findOneAndUpdate(
      { lead_id: leadId },
      {
        $set: {
          last_summary: result.summary,
          last_summary_at: new Date(),
          last_summary_model: result.model || OPENAI_MODEL,
          pending_ai_update: false,
          lead_snapshot: ctx.lead_snapshot || {
            contact_name: lead?.contact_name,
            nametitle: lead?.nametitle,
            email_from: lead?.email_from,
            secondary_email: lead?.secondary_email,
            phone: lead?.phone,
            use_status: lead?.use_status,
            stage: lead?.stage,
            status: lead?.status,
            notes: lead?.notes,
            tags: lead?.tags,
            expected_revenue: lead?.expected_revenue,
            lead_date: lead?.lead_date,
            assigned_date: lead?.assigned_date,
            team_id: lead?.team_id,
            user_id: lead?.user_id,
            source_id: lead?.source_id,
            snapshot_at: new Date(),
          },
        },
        $push: { lead_ai_summary_history: historyDoc._id },
      }
    );

    logger.info('Lead AI summary generated and saved', {
      leadId: leadId.toString(),
      trigger,
      model: result.model,
    });

    return { saved: true, summary: result.summary };
  } catch (error) {
    logger.error('Failed to generate and save lead summary', {
      error: error.message,
      leadId: leadId?.toString(),
    });
    return { saved: false };
  }
}

/**
 * Generate and save lead summary using Leadbot conversation API.
 * User passes user_id and lead_id; we fetch conversation from leadbot and save the summary.
 * @param {string} userId - User ID (from API request)
 * @param {string|mongoose.Types.ObjectId} leadId - Lead ID (from API request)
 * @param {Object} options - { trigger, limit }
 * @returns {Promise<{saved: boolean, summary?: string}>}
 */
async function generateAndSaveSummaryFromLeadbot(userId, leadId, options = {}) {
  const { trigger = 'manual', limit = 20 } = options;

  const leadIdStr = leadId?.toString?.() || String(leadId);
  const userIdStr = userId?.toString?.() || String(userId);

  if (!userIdStr || !leadIdStr || !mongoose.Types.ObjectId.isValid(leadIdStr)) {
    return { saved: false, error: 'Invalid user_id or lead_id' };
  }

  if (!isLeadbotEnabled()) {
    logger.debug('Lead summary from leadbot skipped: LEADBOT_CONVERSATION_URL not configured');
    return { saved: false, error: 'Leadbot conversation API not configured' };
  }

  try {
    const conversation = await leadbotConversationClient.getConversation(userIdStr, leadIdStr, limit);
    if (!conversation || !conversation.summary) {
      logger.warn('Leadbot conversation returned no summary', { userId: userIdStr, leadId: leadIdStr });
      return { saved: false, error: 'No summary returned from leadbot conversation API' };
    }

    const LeadAIContext = mongoose.model('LeadAIContext');
    const LeadAISummaryHistory = mongoose.model('LeadAISummaryHistory');
    const Lead = mongoose.model('Lead');

    let ctx = await LeadAIContext.findOne({ lead_id: leadIdStr }).lean();
    const lead = await Lead.findById(leadIdStr).lean();

    // Archive previous summary to history before overwriting
    if (ctx && ctx.last_summary && ctx.last_summary.trim()) {
      try {
        const archiveHistoryDoc = await LeadAISummaryHistory.create({
          lead_id: leadIdStr,
          summary: ctx.last_summary,
          model: ctx.last_summary_model || null,
          trigger,
          generated_at: ctx.last_summary_at || new Date(),
          ...(ctx.tenantId && { tenantId: ctx.tenantId }),
        });
        await LeadAIContext.updateOne(
          { lead_id: leadIdStr },
          { $push: { lead_ai_summary_history: archiveHistoryDoc._id } }
        );
      } catch (archiveErr) {
        logger.warn('Failed to archive previous summary', { error: archiveErr.message });
      }
    }

    if (!ctx) {
      ctx = await LeadAIContext.create({
        lead_id: leadIdStr,
        lead_activity_history: [],
        pending_ai_update: false,
      });
      ctx = ctx.toObject ? ctx.toObject() : ctx;
    }

    const historyDoc = await LeadAISummaryHistory.create({
      lead_id: leadIdStr,
      summary: conversation.summary,
      model: 'leadbot-conversation',
      trigger,
      generated_at: new Date(),
      ...(ctx.tenantId && { tenantId: ctx.tenantId }),
    });

    const leadSnapshot = ctx.lead_snapshot || {
      contact_name: lead?.contact_name,
      nametitle: lead?.nametitle,
      email_from: lead?.email_from,
      secondary_email: lead?.secondary_email,
      phone: lead?.phone,
      use_status: lead?.use_status,
      stage: lead?.stage,
      status: lead?.status,
      notes: lead?.notes,
      tags: lead?.tags,
      expected_revenue: lead?.expected_revenue,
      lead_date: lead?.lead_date,
      assigned_date: lead?.assigned_date,
      team_id: lead?.team_id,
      user_id: lead?.user_id,
      source_id: lead?.source_id,
      snapshot_at: new Date(),
    };

    await LeadAIContext.findOneAndUpdate(
      { lead_id: leadIdStr },
      {
        $set: {
          last_summary: conversation.summary,
          last_summary_at: new Date(),
          last_summary_model: 'leadbot-conversation',
          pending_ai_update: false,
          lead_snapshot: leadSnapshot,
        },
        $push: { lead_ai_summary_history: historyDoc._id },
        $setOnInsert: { lead_id: leadIdStr },
      },
      { upsert: true }
    );

    logger.info('Lead summary from leadbot saved', {
      leadId: leadIdStr,
      userId: userIdStr,
      trigger,
    });

    return { saved: true, summary: conversation.summary };
  } catch (error) {
    logger.error('Failed to generate and save lead summary from leadbot', {
      error: error.message,
      leadId: leadIdStr,
      userId: userIdStr,
    });
    return { saved: false, error: error.message };
  }
}

module.exports = {
  isEnabled,
  isLeadbotEnabled,
  buildContextForPrompt,
  callOpenAIForSummary,
  generateAndSaveSummary,
  generateAndSaveSummaryFromLeadbot,
};
