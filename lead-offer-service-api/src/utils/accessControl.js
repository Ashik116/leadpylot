const { ROLES } = require('../middleware/roles/roleDefinitions');
const { hasPermission } = require('../middleware/authorize');

/**
 * Check if a user can access a specific resource
 */
async function canAccessResource(resource, user, permission, accessCheckFn) {
  // Admin has access to everything
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  // Check if user has the 'all' permission
  if (await hasPermission(user.role, permission)) {
    return true;
  }

  // Use the provided access check function if available
  if (accessCheckFn && typeof accessCheckFn === 'function') {
    return accessCheckFn(resource, user._id.toString());
  }

  return false;
}

/**
 * Filter data based on user permissions
 */
async function filterDataByPermission(data, user, allPermission, filterFn) {
  // Admin or users with 'all' permission get all data
  if (user.role === ROLES.ADMIN || await hasPermission(user.role, allPermission)) {
    return data;
  }

  // Use the provided filter function
  if (filterFn && typeof filterFn === 'function') {
    return data.filter((item) => filterFn(item, user));
  }

  return [];
}

/**
 * Check if a user is an agent in a project
 */
function isUserAgentInProject(team, userId) {
  if (!team || !team.agents || team.agents.length === 0) {
    console.log(`Project ${team ? team._id : 'unknown'} has no agents`);
    return false;
  }

  console.log(
    `Checking if user ${userId} is an agent in project ${team._id}, agents count: ${team.agents.length}`
  );

  // Debug the agent structure
  team.agents.forEach((agent, index) => {
    const agentUser = agent.user
      ? agent.user._id
        ? agent.user._id.toString()
        : agent.user.toString()
      : 'no_user';
    const agentUserId = agent.user_id ? agent.user_id.toString() : 'no_user_id';
    console.log(`Agent ${index}: user=${agentUser}, user_id=${agentUserId}`);
  });

  const result = team.agents.some((agent) => {
    // Check user field (populated object)
    if (agent.user && agent.user._id) {
      const match = agent.user._id.toString() === userId;
      if (match) console.log(`Match on agent.user._id: ${agent.user._id} = ${userId}`);
      return match;
    }

    // Check user field (ID only)
    if (agent.user && typeof agent.user === 'string') {
      const match = agent.user === userId;
      if (match) console.log(`Match on agent.user: ${agent.user} = ${userId}`);
      return match;
    }

    // Check user_id field
    if (agent.user_id) {
      const userIdStr = agent.user_id.toString();
      const match = userIdStr === userId;
      if (match) console.log(`Match on agent.user_id: ${userIdStr} = ${userId}`);
      return match;
    }

    return false;
  });

  console.log(`User ${userId} is${result ? '' : ' not'} an agent in project ${team._id}`);
  return result;
}

/**
 * Check if a lead is assigned to an agent
 */
function isLeadAssignedToAgent(assignment, userId) {
  if (!assignment || !assignment.agent_id) {
    return false;
  }

  const agentId = assignment.agent_id._id
    ? assignment.agent_id._id.toString()
    : assignment.agent_id.toString();

  return agentId === userId;
}

/**
 * Get user-appropriate error message
 */
function getErrorMessage(user, adminMessage, userMessage) {
  return user.role === ROLES.ADMIN ? adminMessage : userMessage;
}

module.exports = {
  canAccessResource,
  filterDataByPermission,
  isUserAgentInProject,
  isLeadAssignedToAgent,
  getErrorMessage,
  hasPermission,
};
