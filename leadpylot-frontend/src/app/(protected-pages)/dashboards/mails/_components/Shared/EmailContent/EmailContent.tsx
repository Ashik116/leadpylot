'use client';

/**
 * EmailContent - Reusable email body renderer
 *
 * Renders HTML or plain text email in an isolated iframe.
 * Use htmlBody when available; falls back to textBody (plain).
 *
 * @example
 * <EmailContent htmlBody={message.html_body} textBody={message.body} />
 */

import { memo } from 'react';
import { EmailContentFrame } from './EmailContentFrame';

export interface EmailContentProps {
  /** HTML body (when present, treated as HTML) */
  htmlBody?: string | null;
  /** Plain text fallback when htmlBody is empty */
  textBody?: string;
  className?: string;
}

const EMPTY_CONTENT_CLASS = 'text-sm text-gray-500 italic';
const EMPTY_CONTENT_MESSAGE = 'No content';

function EmailContentComponent({
  htmlBody,
  textBody = '',
  className = '',
}: EmailContentProps) {
  const hasHtml = Boolean(htmlBody?.trim());
  const content = hasHtml ? htmlBody! : textBody;

  if (!content?.trim()) {
    return (
      <div className={`${EMPTY_CONTENT_CLASS} ${className}`.trim()}>
        {EMPTY_CONTENT_MESSAGE}
      </div>
    );
  }

  return (
    <EmailContentFrame
      content={content}
      isPlainText={!hasHtml}
      className={className}
    />
  );
}

export const EmailContent = memo(EmailContentComponent);
