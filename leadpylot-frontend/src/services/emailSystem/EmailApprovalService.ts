import ApiService from '../ApiService';

export interface EmailApprovalRequest extends Record<string, unknown> {
    approve_email: boolean;
    approve_attachments?: boolean;
    attachment_ids?: string[];
    reason?: string;
    comments?: string;
}

export interface EmailApprovalResponse {
    success: boolean;
    message: string;
    data?: any;
}

/**
 * Approve or reject an email with optional attachment approval
 */
export async function apiApproveEmail(emailId: string, data: EmailApprovalRequest): Promise<EmailApprovalResponse> {

    try {
        const response = await ApiService.fetchDataWithAxios<EmailApprovalResponse>({
            method: 'POST',
            url: `/email-system/${emailId}/${data.approve_email ? 'approve' : 'reject'}`,
            data
        });
        return response;
    } catch (error) {
        console.error('Email approval failed:', error);
        throw error;
    }
}

/**
 * Mark a single email as viewed (read) for agent or admin
 */
export async function apiMarkEmailAsViewed(emailId: string, isAdmin: boolean): Promise<any> {
    const url = isAdmin
        ? `/email-system/${emailId}/mark-read` // Admin can use the same endpoint as agent for single email
        : `/email-system/${emailId}/mark-read`;
    try {
        const response = await ApiService.fetchDataWithAxios<any>({
            method: 'POST',
            url,
        });
        return response;
    } catch (error) {
        console.error('Mark email as viewed failed:', error);
        throw error;
    }
}

/**
 * Mark a single email as viewed (read) for agent or admin
 */
export async function apiAllEmailAsViewed(isAdmin: boolean, body?: any): Promise<any> {
    const url = isAdmin
        ? `/email-system/admin/mark-all-viewed` // Admin can use the same endpoint as agent for single email
        : `/email-system/agent/mark-all-viewed`;
    try {
        const response = await ApiService.fetchDataWithAxios<any>({
            method: 'POST',
            url,
            data: body ?? undefined
        });
        return response;
    } catch (error) {
        console.error('Mark email as viewed failed:', error);
        throw error;
    }
}
/**
 * Mark multiple emails as viewed (read) for agent or admin
 */
export async function apiMarkMultipleEmailsAsViewed(emailIds: string[], isAdmin: boolean): Promise<any> {
    const url = isAdmin
        ? '/email-system/admin/mark-multiple-viewed'
        : '/email-system/agent/mark-multiple-viewed';
    try {
        const response = await ApiService.fetchDataWithAxios<any>({
            method: 'POST',
            url,
            data: { email_ids: emailIds },
        });
        return response;
    } catch (error) {
        console.error('Mark multiple emails as viewed failed:', error);
        throw error;
    }
} 