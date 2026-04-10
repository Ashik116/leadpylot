'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import { useCallback, useMemo, useState } from 'react';
import MailAttachmentCard from '../../[id]/_components/mailtabs/MailAttachmentCard';
// import DOMPurify from 'dompurify'; // Optional for better security

export const EmailDirection = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
} as const;

type EmailDirectionType = (typeof EmailDirection)[keyof typeof EmailDirection];

type Attachment = {
  id: string | number;
  name?: string;
  filename?: string;
};

type CollapsibleHtmlItemProps = {
  headerPrimary?: string;
  headerSecondary?: string;
  rightMeta?: string;
  rawHtml: string;
  minHeight?: number;
  openDefault?: boolean;
  iframeTitle?: string;
  attachments?: Attachment[];
  onAttachmentClick?: (attachment: Attachment) => void;
  reply?: boolean;
  direction?: EmailDirectionType;
  selectedAttachments?: Set<string | number>;
  onAttachmentSelect?: (attachmentId: string | number, selected: boolean) => void;
};

// Constants
const DEFAULT_MIN_HEIGHT = 240;
// const IFRAME_EXTRA_PADDING = 40; // not used currently
const IFRAME_FALLBACK_HEIGHT = 320;

export default function CollapsibleHtmlItem({
  headerPrimary,
  headerSecondary,
  rightMeta,
  rawHtml,
  minHeight = DEFAULT_MIN_HEIGHT,
  openDefault = false,
  iframeTitle = 'Content',
  attachments = [],
  onAttachmentClick,
  reply = false,
  direction = EmailDirection?.INCOMING,
  selectedAttachments = new Set(),
  onAttachmentSelect,
}: CollapsibleHtmlItemProps) {
  const [open, setOpen] = useState(openDefault);

  const { isFullDocument, inlineHtml, iframeDoc } = useMemo(() => {
    const base = rawHtml || '';
    const stripScripts = (html: string) => html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    const stripEventHandlers = (html: string) => html.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    const ensureSafeLinks = (html: string) =>
      html.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer nofollow" ');
    const constrainImages = (html: string) =>
      html.replace(/<img([^>]*?)>/gi, '<img$1 style="max-width:100%;height:auto" />');

    const withoutScripts = stripScripts(base);
    const processedFragment = constrainImages(ensureSafeLinks(stripEventHandlers(withoutScripts)));

    const fullDoc = /<!DOCTYPE/i.test(withoutScripts) || /<html[\s\S]*?>/i.test(withoutScripts);
    if (fullDoc) {
      // Keep iframe for full HTML documents
      const doc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            html, body { margin: 0; padding: 0; overflow: hidden !important; }
            img { max-width: 100%; height: auto }
          </style>
        </head>
        <body>${withoutScripts}</body>
      </html>`;
      return { isFullDocument: true, inlineHtml: '', iframeDoc: doc };
    }

    return { isFullDocument: false, inlineHtml: processedFragment, iframeDoc: '' };
  }, [rawHtml]);

  const iframeKey = useMemo(() => {
    if (!isFullDocument) return '';
    let hash = 0;
    for (let i = 0; i < iframeDoc?.length; i++) {
      hash = (hash * 31 + iframeDoc.charCodeAt(i)) | 0;
    }
    return `iframe-${hash}`;
  }, [isFullDocument, iframeDoc]);

  const measureIframeHeight = useCallback(
    (iframe: HTMLIFrameElement) => {
      const measure = () => {
        try {
          const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
          if (doc) {
            const body = doc?.body;
            const bodyScroll = body?.scrollHeight || 0;
            const rectHeight = body?.getBoundingClientRect().height || 0;
            // Prefer body scroll height; fallback to rect height
            const contentHeight = Math.ceil(bodyScroll || rectHeight);
            const bufferedHeight = Math.max(1, contentHeight) + 1; // slight buffer to avoid rounding scroll
            iframe.style.height = `${bufferedHeight}px`;
          }
        } catch {
          iframe.style.height = `${Math.max(minHeight, IFRAME_FALLBACK_HEIGHT)}px`;
        }
      };
      [0, 100, 300].forEach((delay) => setTimeout(measure, delay));
    },
    [minHeight]
  );

  return (
    <div>
      {/* Header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="focus-visible:ring-new/30 flex w-full items-start justify-between rounded-md border-b px-3 py-2 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2"
      >
        <div className="flex">
          {reply && (
            <div className="bg-evergreen hidden h-4 w-4 items-center justify-center gap-2 rounded-sm p-2">
              <ApolloIcon name="reply" className="text-white" />
            </div>
          )}
          <div className="text-left">
            <div className="line-clamp-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <p className="line-clamp-1 capitalize select-none">{headerPrimary || ''}</p>
            </div>
            {headerSecondary && (
              <p className="line-clamp-1 text-xs text-gray-500">
                {' '}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${
                    direction === EmailDirection.OUTGOING ? 'bg-sky-400/90' : 'bg-new/90'
                  }`}
                >
                  {direction === EmailDirection?.OUTGOING ? 'Outgoing' : 'Incoming'}
                </span>{' '}
                {headerSecondary}
              </p>
            )}
          </div>
        </div>
        <div className="text-sm font-medium text-gray-400">
          {attachments?.length > 0 && (
            <div className="flex items-center justify-end space-x-1">
              <ApolloIcon name="paperclip" className="text-gray-400" />
              <span>attachments ({attachments?.length})</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {rightMeta && <span className="text-xs text-gray-500">{rightMeta}</span>}
            <ApolloIcon
              name={open ? 'chevron-arrow-up' : 'chevron-arrow-down'}
              className="transition-transform duration-200"
            />
          </div>
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-3 py-2 sm:pl-10">
          {/* files */}
          {attachments?.length > 0 && (
            <div className="pt-2">
              <div className="flex flex-wrap gap-2 rounded-sm bg-gradient-to-r py-2">
                {attachments?.map((attachment, i) => (
                  <MailAttachmentCard
                    key={i}
                    selectedAttachments={selectedAttachments}
                    attachment={attachment}
                    onAttachmentSelect={onAttachmentSelect || (() => {})}
                    onAttachmentClick={onAttachmentClick || (() => {})}
                  />
                ))}
              </div>
            </div>
          )}
          {!isFullDocument ? (
            <div className="flex w-full justify-start">
              <div
                className="prose w-full max-w-[720px] sm:max-w-[70%]"
                dangerouslySetInnerHTML={{ __html: inlineHtml }}
              />
            </div>
          ) : (
            <div className="flex w-full justify-start">
              <iframe
                key={iframeKey}
                srcDoc={iframeDoc}
                title={iframeTitle}
                className="block w-full overflow-hidden rounded-md border-0 sm:w-[70%]"
                scrolling="no"
                sandbox="allow-same-origin allow-scripts"
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  height: 'auto',
                }}
                onLoad={(e) => measureIframeHeight(e.currentTarget)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
