import { getFileIconName } from "@/app/(protected-pages)/dashboards/leads/[id]/_components/mailtabs/utils";
import { isDev } from "@/utils/utils";

const ImagePreviewService = ({ attachment, usePreviewHook }: { attachment: any, usePreviewHook: any }) => {
    if (attachment && (attachment.documentId || attachment.document_id)) {
        attachment.icon = attachment.icon
            ? attachment.icon
            : getFileIconName(attachment.name || attachment.filename);
        // Determine preview type based on file extension or icon
        let previewType: 'pdf' | 'image' | 'other' = 'other';
        if (attachment.icon === 'file-pdf') {
            previewType = 'pdf';
        } else if (
            attachment.icon?.includes('image') ||
            attachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        ) {
            previewType = 'image';
        } else {
            previewType = 'other';
        }
        // Use the existing hook to open preview
        usePreviewHook.openPreview(
            attachment.documentId || attachment.document_id,
            attachment.name || attachment.filename || 'Document',
            previewType
        );
    } else {
        isDev && console.error('Invalid attachment data:', attachment);
    }
}

export default ImagePreviewService;
