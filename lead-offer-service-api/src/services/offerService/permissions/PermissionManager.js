/**
 * Offer Permission Manager
 * Handles permission-based filtering and access control for offers
 */

const { AssignLeads, AuthorizationError } = require('../config/dependencies');

class PermissionManager {
  /**
   * Get permission-based filter for offer queries
   * @param {Object} user - User object with role and ID
   * @param {Function} hasPermissionFn - Permission checking function
   * @param {Object} permissions - Permission constants
   * @param {Object} offer - Specific offer to check (optional)
   * @returns {Object} - Permission filter object
   */
  static async getPermissionFilter(user, hasPermissionFn, permissions, offer = null) {
    // Check for admin access
    if (await hasPermissionFn(user.role, permissions.OFFER_READ_ALL)) {
      return {}; // No additional filters needed
    }

    // Check for own access
    if (await hasPermissionFn(user.role, permissions.OFFER_READ_OWN)) {
      // If checking a specific offer
      if (offer) {
        // Check if agent created the offer OR if the offer's lead is assigned to agent
        const createdByAgent = offer.agent_id &&
          (typeof offer.agent_id === 'object'
            ? offer.agent_id._id.toString() === user._id.toString()
            : offer.agent_id.toString() === user._id.toString());

        if (createdByAgent) {
          return {}; // Agent created this offer
        }

        // Check if offer's lead is assigned to this agent
        const leadId = typeof offer.lead_id === 'object' ? offer.lead_id._id : offer.lead_id;
        const assignment = await AssignLeads.findOne({
          agent_id: user._id,
          lead_id: leadId,
          status: 'active',
        }).lean();

        if (!assignment) {
          throw new AuthorizationError("You don't have permission to access this offer");
        }
        return {};
      }

      // For queries, use assignment-based filtering
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      })
        .select('lead_id')
        .lean();

      const assignedLeadIds = assignments.map((a) => a.lead_id);

      if (assignedLeadIds.length === 0) {
        return { lead_id: { $in: [] } };
      }

      return { lead_id: { $in: assignedLeadIds } };
    }

    throw new AuthorizationError("You don't have permission to view offers");
  }
}

module.exports = PermissionManager; 