'use client';

import { apiGetFileAttachment } from '@/services/AttachmentService';
import { useEffect, useState } from 'react';

export const useAttachmentPreviewFile = (attachmentId: string | undefined) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttachment = async () => {
      if (!attachmentId) return;
      try {
        const blob = await apiGetFileAttachment(attachmentId);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error('useAttachmentPreviewFile: Error fetching attachment:', error);
      }
    };

    fetchAttachment();
  }, [attachmentId]);

  return { blobUrl };
};
