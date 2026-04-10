/**
 * Email Service HTTP Client
 * Provides HTTP communication with the email-service microservice
 */

const axios = require('axios');
const logger = require('../utils/logger');

class EmailServiceClient {
  constructor() {
    // Get the email service URL from environment or use default
    this.baseURL = process.env.EMAIL_SERVICE_URL || 'http://localhost:4008';
    this.emailSystemEndpoint = '/email-system';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Email Service Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('Email Service Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Email Service Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('Email Service Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update email projects when lead project changes
   * @param {String} leadId - Lead ID whose project changed
   * @param {String} newProjectId - New project ID
   * @param {String} adminUserId - Admin user making the change
   * @param {String} reason - Reason for the change
   * @returns {Object} Update result with statistics
   */
  async updateEmailProjectsForLeadChange(leadId, newProjectId, adminUserId, reason = '') {
    try {
      const endpoint = `${this.emailSystemEndpoint}/update-email-projects-for-lead-change`;
      
      const payload = {
        leadId,
        newProjectId,
        adminUserId,
        reason,
      };

      logger.info('Calling email-service to update email projects', {
        leadId,
        newProjectId,
        adminUserId,
        endpoint,
      });

      const response = await this.client.post(endpoint, payload);

      if (response.data.status === 'success') {
        logger.info('Email projects updated successfully', {
          leadId,
          newProjectId,
          emailsUpdated: response.data.data?.emailsUpdated,
          emailsFound: response.data.data?.emailsFound,
        });
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update email projects');
      }
    } catch (error) {
      logger.error('Failed to update email projects via email-service', {
        leadId,
        newProjectId,
        adminUserId,
        error: error.message,
        responseData: error.response?.data,
      });
      
      // Re-throw with more context
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(`Email service call failed: ${errorMessage}`);
    }
  }

  /**
   * Health check for email service
   * @returns {Object} Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Email service health check failed', {
        error: error.message,
      });
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailServiceClient();

