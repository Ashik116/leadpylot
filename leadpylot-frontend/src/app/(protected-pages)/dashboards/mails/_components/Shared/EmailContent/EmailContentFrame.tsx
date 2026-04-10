'use client';

/**
 * EmailContentFrame - Isolated iframe for email HTML
 * Height fits content when short; max 70vh with scrollbar when long.
 */

import { memo } from 'react';
import { sanitizeEmailForPreview, textToHTML } from '../../../_utils/emailSanitizer';
import { buildEmailDocument } from './buildEmailDocument';
import { IFRAME_SANDBOX, IFRAME_TITLE, DEFAULT_MIN_HEIGHT } from './emailContent.config';
import { useIframeHeightSync } from './useIframeHeightSync';

const MAX_HEIGHT_VH = 70;

export interface EmailContentFrameProps {
  content: string;
  isPlainText?: boolean;
  className?: string;
}

function EmailContentFrameComponent({
  content,
  isPlainText = false,
  className = '',
}: EmailContentFrameProps) {
  const sanitized = isPlainText ? textToHTML(content) : sanitizeEmailForPreview(content);
  const srcdoc = buildEmailDocument(sanitized);
  const { ref, height } = useIframeHeightSync(srcdoc, DEFAULT_MIN_HEIGHT, MAX_HEIGHT_VH);

  return (
    <iframe
      ref={ref}
      srcDoc={srcdoc}
      sandbox={IFRAME_SANDBOX}
      title={IFRAME_TITLE}
      className={`w-full border-0 ${className}`.trim()}
      style={{ minHeight: DEFAULT_MIN_HEIGHT, height, maxHeight: `${MAX_HEIGHT_VH}vh` }}
    />
  );
}

export const EmailContentFrame = memo(EmailContentFrameComponent);
