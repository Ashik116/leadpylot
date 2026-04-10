/**
 * Call Transfer Service
 * Handles call transfers using AMI commands
 */

const amiService = require('./amiService');
const logger = require('../helpers/logger');

class CallTransferService {

  /**
   * Perform blind transfer to another extension
   * @param {string} currentChannel - Channel of the call to transfer
   * @param {string} targetExtension - Extension to transfer to
   * @param {string} transferredBy - Admin/agent performing transfer
   * @returns {Promise<Object>} - Transfer result
   */
  async blindTransfer(currentChannel, targetExtension, transferredBy) {
    try {
      logger.info('🔄 Initiating blind transfer', {
        currentChannel,
        targetExtension,
        transferredBy,
        timestamp: new Date().toISOString()
      });

      // AMI Redirect action for blind transfer
      const transferAction = {
        action: 'Redirect',
        channel: currentChannel,
        exten: targetExtension,
        context: 'from-internal',
        priority: 1
      };

      const result = await amiService.sendAction(transferAction);

      logger.info('✅ Blind transfer completed', {
        currentChannel,
        targetExtension,
        result: result.response,
        transferredBy
      });

      // Log transfer activity
      await this.logTransferActivity({
        type: 'blind_transfer',
        fromChannel: currentChannel,
        toExtension: targetExtension,
        transferredBy,
        success: true,
        timestamp: new Date()
      });

      return {
        success: true,
        type: 'blind_transfer',
        targetExtension,
        message: `Call transferred to extension ${targetExtension}`
      };

    } catch (error) {
      logger.error('❌ Blind transfer failed', {
        error: error.message,
        currentChannel,
        targetExtension,
        transferredBy
      });

      await this.logTransferActivity({
        type: 'blind_transfer',
        fromChannel: currentChannel,
        toExtension: targetExtension,
        transferredBy,
        success: false,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Perform attended transfer (admin talks to agent first)
   * @param {string} currentChannel - Channel of the call to transfer
   * @param {string} targetExtension - Extension to transfer to
   * @param {string} adminExtension - Admin's extension
   * @param {string} transferredBy - Admin performing transfer
   * @returns {Promise<Object>} - Transfer result
   */
  async attendedTransfer(currentChannel, targetExtension, adminExtension, transferredBy) {
    try {
      logger.info('🔄 Initiating attended transfer', {
        currentChannel,
        targetExtension,
        adminExtension,
        transferredBy
      });

      // Step 1: Put current call on hold
      await this.holdCall(currentChannel);

      // Step 2: Originate call to target extension
      const bridgeCall = await amiService.sendAction({
        action: 'Originate',
        channel: `PJSIP/${targetExtension}`,
        context: 'from-internal',
        exten: adminExtension,
        priority: 1,
        callerid: 'Admin Transfer',
        timeout: 30000,
        variables: {
          TRANSFER_CONTEXT: 'attended_transfer'
        }
      });

      logger.info('✅ Attended transfer bridge created', {
        currentChannel,
        targetExtension,
        bridgeCall: bridgeCall.response
      });

      // The admin can now talk to the agent
      // When admin is ready, they can complete the transfer

      return {
        success: true,
        type: 'attended_transfer',
        targetExtension,
        bridgeChannel: bridgeCall.response,
        message: `Attended transfer initiated to extension ${targetExtension}. Admin can now speak with agent.`,
        nextSteps: 'Use completeAttendedTransfer() to finish the transfer'
      };

    } catch (error) {
      logger.error('❌ Attended transfer failed', {
        error: error.message,
        currentChannel,
        targetExtension
      });
      throw error;
    }
  }

  /**
   * Complete attended transfer (connect customer to agent)
   * @param {string} customerChannel - Customer's channel
   * @param {string} agentChannel - Agent's channel  
   * @param {string} transferredBy - Admin performing transfer
   * @returns {Promise<Object>} - Transfer completion result
   */
  async completeAttendedTransfer(customerChannel, agentChannel, transferredBy) {
    try {
      logger.info('🔄 Completing attended transfer', {
        customerChannel,
        agentChannel,
        transferredBy
      });

      // Bridge customer and agent channels
      const bridgeAction = {
        action: 'Bridge',
        channel1: customerChannel,
        channel2: agentChannel,
        tone: 'no'
      };

      const result = await amiService.sendAction(bridgeAction);

      logger.info('✅ Attended transfer completed', {
        customerChannel,
        agentChannel,
        result: result.response
      });

      await this.logTransferActivity({
        type: 'attended_transfer_complete',
        customerChannel,
        agentChannel,
        transferredBy,
        success: true,
        timestamp: new Date()
      });

      return {
        success: true,
        type: 'attended_transfer_complete',
        message: 'Customer successfully connected to agent'
      };

    } catch (error) {
      logger.error('❌ Failed to complete attended transfer', {
        error: error.message,
        customerChannel,
        agentChannel
      });
      throw error;
    }
  }

  /**
   * Put a call on hold
   * @param {string} channel - Channel to hold
   */
  async holdCall(channel) {
    try {
      const holdAction = {
        action: 'SetVar',
        channel: channel,
        variable: 'CHANNEL(musicclass)',
        value: 'default'
      };

      await amiService.sendAction(holdAction);

      logger.info('📞 Call placed on hold', { channel });
    } catch (error) {
      logger.error('❌ Failed to hold call', { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Resume a call from hold
   * @param {string} channel - Channel to resume
   */
  async resumeCall(channel) {
    try {
      const resumeAction = {
        action: 'SetVar',
        channel: channel,
        variable: 'CHANNEL(musicclass)',
        value: ''
      };

      await amiService.sendAction(resumeAction);

      logger.info('📞 Call resumed from hold', { channel });
    } catch (error) {
      logger.error('❌ Failed to resume call', { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get available agents for transfer (with online status)
   * @param {string} projectId - Optional project filter
   * @returns {Promise<Array>} - Available agents list
   */
  async getAvailableAgentsForTransfer(projectId = null) {
    try {
      const { Team } = require('../models');
      
      let query = { active: true };
      if (projectId) {
        query._id = projectId;
      }

      const projects = await Team.find(query)
        .select('name agents')
        .lean();

      const availableAgents = [];

      for (const project of projects) {
        if (project.agents && project.agents.length > 0) {
          for (const agent of project.agents) {
            if (agent.active && agent.voip_username) {
              // TODO: Check if extension is online via AMI
              const isOnline = await this.checkExtensionOnline(agent.voip_username);
              
              availableAgents.push({
                projectId: project._id,
                projectName: project.name,
                agentId: agent.user,
                agentName: agent.alias_name,
                extension: agent.voip_username,
                online: isOnline
              });
            }
          }
        }
      }

      return availableAgents.sort((a, b) => b.online - a.online); // Online agents first
    } catch (error) {
      logger.error('Error getting available agents for transfer', {
        error: error.message,
        projectId
      });
      return [];
    }
  }

  /**
   * Check if extension is online (placeholder)
   * @param {string} extension - Extension to check
   * @returns {Promise<boolean>} - Online status
   */
  async checkExtensionOnline(extension) {
    try {
      // TODO: Implement real extension status check via AMI
      // For now, assume online
      return true;
    } catch (error) {
      logger.error('Error checking extension status', {
        error: error.message,
        extension
      });
      return false;
    }
  }

  /**
   * Log transfer activity for compliance and monitoring
   * @param {Object} transferData - Transfer details
   */
  async logTransferActivity(transferData) {
    try {
      // TODO: Integrate with activity logging system
      logger.info('📋 Transfer activity logged', transferData);
      
      // Could store in database for compliance
      // const TransferLog = require('../models/transferLog');
      // await TransferLog.create(transferData);
      
    } catch (error) {
      logger.error('Failed to log transfer activity', {
        error: error.message,
        transferData
      });
    }
  }
}

module.exports = new CallTransferService();
