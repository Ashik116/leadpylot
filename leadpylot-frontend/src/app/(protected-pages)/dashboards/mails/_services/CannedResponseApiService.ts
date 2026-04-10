/**
 * Canned Response API Service
 * Handles API calls for canned responses/templates
 * Uses existing /settings/email_templates endpoint
 */

import AxiosBase from '@/services/axios/AxiosBase';

// Backend response format
interface BackendTemplate {
  _id: string;
  name: string;
  template_content: string;
  include_signature: boolean;
  has_signature_file: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend-friendly format
export interface CannedResponse {
  _id: string;
  name: string;
  template_content: string;
  variables?: string[];
  category?: string;
  hotkey?: string;
  include_signature?: boolean;
  has_signature_file?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateCannedResponseData {
  name: string;
  template_content: string;
  include_signature?: boolean;
  has_signature_file?: boolean;
  is_shared?: boolean;
}

class CannedResponseApiService {
  private baseUrl = '/settings/email_templates';

  /**
   * Transform backend template to frontend format
   */
  private transformTemplate(template: BackendTemplate): CannedResponse {
    const template_content = template.template_content;
    const variables = this.extractVariables(template_content);

    return {
      _id: template._id,
      name: template.name,
      template_content: template_content,
      variables: variables,
      include_signature: template.include_signature,
      has_signature_file: template.has_signature_file,
      created_at: new Date(template.created_at),
      updated_at: new Date(template.updated_at),
    };
  }

  /**
   * Get all canned responses
   */
  async getCannedResponses(category?: string): Promise<CannedResponse[]> {
    const params = category ? { category } : {};
    const response = await AxiosBase.get(this.baseUrl, { params });
    const templates: BackendTemplate[] = response.data.data || [];
    return templates.map(t => this.transformTemplate(t));
  }

  /**
   * Get single canned response by ID
   */
  async getCannedResponseById(id: string): Promise<CannedResponse> {
    const response = await AxiosBase.get(`${this.baseUrl}/${id}`);
    return response.data.data || response.data;
  }

  /**
   * Create new canned response
   */
  async createCannedResponse(data: CreateCannedResponseData): Promise<CannedResponse> {
    const response = await AxiosBase.post(this.baseUrl, data);
    return response.data.data || response.data;
  }

  /**
   * Update canned response
   */
  async updateCannedResponse(id: string, data: Partial<CreateCannedResponseData>): Promise<CannedResponse> {
    const response = await AxiosBase.put(`${this.baseUrl}/${id}`, data);
    return response.data.data || response.data;
  }

  /**
   * Delete canned response
   */
  async deleteCannedResponse(id: string): Promise<void> {
    await AxiosBase.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Replace variables in template content
   * Supports both {{variable}} and {{object.property}} formats
   * Example: replaceVariables("Hello {{contact_name}}", { contact_name: "John" })
   */
  replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      // Replace {{variable}} format
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }

  /**
   * Extract variables from content
   * Handles {{variable}} and {{object.property}} and {{array[0].property}} formats
   * Example: "{{contact_name}} from {{project[0].agent.login}}" -> ["contact_name", "project[0].agent.login"]
   */
  extractVariables(content: string): string[] {
    // Match {{variable}} including complex paths like {{project[0].agent.login}}
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    return variables;
  }

  /**
   * Strip HTML tags from content for preview
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

const cannedResponseApiService = new CannedResponseApiService();
export default cannedResponseApiService;

