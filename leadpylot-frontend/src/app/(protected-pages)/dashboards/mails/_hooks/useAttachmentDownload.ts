import { useCallback } from 'react';
import AxiosBase from '@/services/axios/AxiosBase';

interface Attachment {
    _id?: string;
    document_id?: string;
    filename: string;
    filetype?: string;
    metadata?: {
        original_filename?: string;
    };
}

export const useAttachmentDownload = () => {
    const downloadAttachment = useCallback(
        async (attachment: Attachment, e?: React.MouseEvent) => {
            if (e) {
                e.stopPropagation();
            }

            const attachmentId = attachment.document_id || attachment._id;
            if (!attachmentId) {
                console.error('Attachment missing identifier:', attachment);
                return;
            }

            try {
                const response = await AxiosBase.get(`/attachments/${attachmentId}/download`, {
                    responseType: 'blob',
                });

                const blob = new Blob([response.data], {
                    type: attachment.filetype || 'application/octet-stream',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = attachment.filename || attachment.metadata?.original_filename || 'document';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error downloading attachment:', error);
            }
        },
        []
    );

    return { downloadAttachment };
};

