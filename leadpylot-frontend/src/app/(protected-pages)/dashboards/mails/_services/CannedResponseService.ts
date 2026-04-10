/**
 * Canned Response Service
 * API calls for quick reply templates
 */

import AxiosBase from '@/services/axios/AxiosBase';
import { CannedResponse, CreateCannedResponseInput, UpdateCannedResponseInput } from '../_types/canned-response.types';

class CannedResponseService {
  private baseUrl = '/email-system/canned-responses';

  /**
   * Get all canned responses
   */
  async getCannedResponses(filters?: {
    category?: string;
    is_shared?: boolean;
    search?: string;
  }): Promise<CannedResponse[]> {
    const response = await AxiosBase.get(this.baseUrl, { params: filters });
    return response.data.data || [];
  }

  /**
   * Get canned response by ID
   */
  async getCannedResponseById(id: string): Promise<CannedResponse> {
    const response = await AxiosBase.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create canned response
   */
  async createCannedResponse(data: CreateCannedResponseInput): Promise<CannedResponse> {
    const response = await AxiosBase.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * Update canned response
   */
  async updateCannedResponse(id: string, data: UpdateCannedResponseInput): Promise<CannedResponse> {
    const response = await AxiosBase.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete canned response
   */
  async deleteCannedResponse(id: string): Promise<void> {
    await AxiosBase.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Process template variables
   */
  processTemplate(content: string, variables: Record<string, any>): string {
    let processed = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });
    
    return processed;
  }

  /**
   * Extract variables from template
   */
  extractVariables(content: string): string[] {
    const regex = /{{\ *(\w+(?:\.\w+)*)\s*}}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }
}

const cannedResponseService = new CannedResponseService();
export default cannedResponseService;

