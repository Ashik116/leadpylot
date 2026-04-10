/**
 * Call Transfer Controller
 * Handles HTTP requests for call transfer operations
 */

const transferService = require('../services/transferService');
const amiService = require('../services/amiService');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Get available agents for transfer
 * @route GET /api/transfer/available-agents
 * @access Private (Admin only)
 */
const getAvailableAgents = asyncHandler(async (req, res) => {
  try {
    const { project_id } = req.query;
    
    const availableAgents = await transferService.getAvailableAgentsForTransfer(project_id);
    
    return res.status(200).json({
      status: 'success',
      message: 'Available agents retrieved successfully',
      data: {
        agents: availableAgents,
        count: availableAgents.length,
        onlineCount: availableAgents.filter(agent => agent.online).length
      }
    });

  } catch (error) {
    logger.error('Error getting available agents for transfer', {
      error: error.message,
      user: req.user?.id
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to get available agents'
    });
  }
});

/**
 * Perform blind transfer
 * @route POST /api/transfer/blind
 * @access Private (Admin only)
 */
const blindTransfer = asyncHandler(async (req, res) => {
  try {
    const { channel, target_extension } = req.body;
    const transferredBy = req.user.id;

    // Validate required fields
    if (!channel || !target_extension) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: channel and target_extension'
      });
    }

    logger.info('🔄 Admin initiated blind transfer', {
      channel,
      target_extension,
      admin: req.user.login,
      timestamp: new Date().toISOString()
    });

    const result = await transferService.blindTransfer(
      channel,
      target_extension,
      transferredBy
    );

    return res.status(200).json({
      status: 'success',
      message: `Call transferred to extension ${target_extension}`,
      data: result
    });

  } catch (error) {
    logger.error('Blind transfer failed', {
      error: error.message,
      body: req.body,
      user: req.user?.login
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to transfer call',
      error: error.message
    });
  }
});

/**
 * Initiate attended transfer
 * @route POST /api/transfer/attended
 * @access Private (Admin only)
 */
const attendedTransfer = asyncHandler(async (req, res) => {
  try {
    const { channel, target_extension, admin_extension } = req.body;
    const transferredBy = req.user.id;

    // Validate required fields
    if (!channel || !target_extension || !admin_extension) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: channel, target_extension, and admin_extension'
      });
    }

    logger.info('🔄 Admin initiated attended transfer', {
      channel,
      target_extension,
      admin_extension,
      admin: req.user.login
    });

    const result = await transferService.attendedTransfer(
      channel,
      target_extension,
      admin_extension,
      transferredBy
    );

    return res.status(200).json({
      status: 'success',
      message: 'Attended transfer initiated. You can now speak with the agent.',
      data: result
    });

  } catch (error) {
    logger.error('Attended transfer failed', {
      error: error.message,
      body: req.body,
      user: req.user?.login
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to initiate attended transfer',
      error: error.message
    });
  }
});

/**
 * Complete attended transfer (bridge customer to agent)
 * @route POST /api/transfer/attended/complete
 * @access Private (Admin only)
 */
const completeAttendedTransfer = asyncHandler(async (req, res) => {
  try {
    const { customer_channel, agent_channel } = req.body;
    const transferredBy = req.user.id;

    if (!customer_channel || !agent_channel) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: customer_channel and agent_channel'
      });
    }

    const result = await transferService.completeAttendedTransfer(
      customer_channel,
      agent_channel,
      transferredBy
    );

    return res.status(200).json({
      status: 'success',
      message: 'Customer successfully connected to agent',
      data: result
    });

  } catch (error) {
    logger.error('Failed to complete attended transfer', {
      error: error.message,
      body: req.body,
      user: req.user?.login
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to complete transfer',
      error: error.message
    });
  }
});

/**
 * Get active calls that can be transferred
 * @route GET /api/transfer/active-calls
 * @access Private (Admin only)
 */
const getTransferableCalls = asyncHandler(async (req, res) => {
  try {
    // Get active calls from AMI service
    const activeCalls = await amiService.getActiveCalls();
    
    // Filter calls that admin can transfer (exclude supervisor calls)
    const transferableCalls = activeCalls.filter(call => {
      return !call.isSupervisorCall && call.status === 'active';
    });

    return res.status(200).json({
      status: 'success',
      message: 'Transferable calls retrieved successfully',
      data: {
        calls: transferableCalls,
        count: transferableCalls.length
      }
    });

  } catch (error) {
    logger.error('Error getting transferable calls', {
      error: error.message,
      user: req.user?.id
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to get active calls'
    });
  }
});

/**
 * Put call on hold
 * @route POST /api/transfer/hold
 * @access Private (Admin only)
 */
const holdCall = asyncHandler(async (req, res) => {
  try {
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: channel'
      });
    }

    await transferService.holdCall(channel);

    return res.status(200).json({
      status: 'success',
      message: 'Call placed on hold',
      data: { channel }
    });

  } catch (error) {
    logger.error('Failed to hold call', {
      error: error.message,
      body: req.body,
      user: req.user?.login
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to hold call',
      error: error.message
    });
  }
});

/**
 * Resume call from hold
 * @route POST /api/transfer/resume
 * @access Private (Admin only)
 */
const resumeCall = asyncHandler(async (req, res) => {
  try {
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: channel'
      });
    }

    await transferService.resumeCall(channel);

    return res.status(200).json({
      status: 'success',
      message: 'Call resumed from hold',
      data: { channel }
    });

  } catch (error) {
    logger.error('Failed to resume call', {
      error: error.message,
      body: req.body,
      user: req.user?.login
    });

    return res.status(500).json({
      status: 'error',
      message: 'Failed to resume call',
      error: error.message
    });
  }
});

module.exports = {
  getAvailableAgents,
  blindTransfer,
  attendedTransfer,
  completeAttendedTransfer,
  getTransferableCalls,
  holdCall,
  resumeCall
};
