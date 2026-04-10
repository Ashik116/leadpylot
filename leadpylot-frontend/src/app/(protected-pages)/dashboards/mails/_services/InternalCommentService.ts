/**
 * Internal Comment Service
 * API calls for internal email comments (team collaboration)
 */

import AxiosBase from '@/services/axios/AxiosBase';
import { InternalComment, CreateCommentInput, UpdateCommentInput } from '../_types/comment.types';

class InternalCommentService {
  private baseUrl = '/email-system';

  /**
   * Get all internal comments for an email
   */
  async getComments(emailId: string): Promise<InternalComment[]> {
    const response = await AxiosBase.get(`${this.baseUrl}/${emailId}/internal-comments`);
    return response.data.data || [];
  }

  /**
   * Add internal comment to email
   */
  async addComment(
    emailId: string,
    data: { text: string; mentioned_users: string[]; attachment_ids: string[] }
  ): Promise<InternalComment> {
    const response = await AxiosBase.post(
      `${this.baseUrl}/${emailId}/internal-comments`,
      data
    );
    return response.data.data;
  }

  /**
   * Update internal comment
   */
  async updateComment(
    emailId: string,
    commentId: string,
    data: UpdateCommentInput
  ): Promise<InternalComment> {
    const response = await AxiosBase.put(
      `${this.baseUrl}/${emailId}/internal-comments/${commentId}`,
      data
    );
    return response.data.data;
  }

  /**
   * Delete internal comment
   */
  async deleteComment(emailId: string, commentId: string): Promise<void> {
    await AxiosBase.delete(`${this.baseUrl}/${emailId}/internal-comments/${commentId}`);
  }

  /**
   * Parse @mentions from text
   */
  parseMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Format text with @mentions as HTML
   */
  formatMentions(text: string, users: Array<{ _id: string; login: string; name: string }>): string {
    let formattedText = text;

    users.forEach(user => {
      const mentionRegex = new RegExp(`@${user.login}`, 'g');
      formattedText = formattedText.replace(
        mentionRegex,
        `<span class="mention" data-user-id="${user._id}">@${user.login}</span>`
      );
    });

    return formattedText;
  }
}

const internalCommentService = new InternalCommentService();
export default internalCommentService;

