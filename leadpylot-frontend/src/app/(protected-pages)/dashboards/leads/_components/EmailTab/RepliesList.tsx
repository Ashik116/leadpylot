'use client';

import CollapsibleHtmlItem from './CollapsibleHtmlItem';
import { sanitizeHtml } from '../../[id]/_components/mailtabs/utils';
import { useCallback, useState } from 'react';



type ReplyItem = {
    _id?: string;
    from: string;
    to?: string;
    subject?: string;
    body?: string;
    html_body?: string;
    sent_at?: string;
    received_at?: string;
    attachments?: any[];
    direction?: 'incoming' | 'outgoing';
};

type RepliesListProps = {
    replies: ReplyItem[];
    onAttachmentClick: (attachment: any) => void;
};

export default function RepliesList({ replies, onAttachmentClick }: RepliesListProps) {
    if (!replies || replies.length === 0) return null;
    return (
        <div className="space-y-2">
            {replies.map((r, idx) => (
                <ReplyRow key={r._id || idx} reply={r} onAttachmentClick={onAttachmentClick} />
            ))}
        </div>
    );
}

function ReplyRow({ reply, onAttachmentClick }: { reply: ReplyItem, onAttachmentClick: (attachment: any) => void }) {
    const [selectedAttachments, setSelectedAttachments] = useState<Set<string | number>>(new Set());

    const handleAttachmentSelect = useCallback((attachmentId: string | number, selected: boolean) => {
        setSelectedAttachments(prev => {
            const newSet = new Set(prev);
            newSet[selected ? 'add' : 'delete'](attachmentId);
            return newSet;
        });
    }, []);

    const toAddr = reply.to || '';
    const when = reply.sent_at || reply.received_at || '';
    const raw = reply.html_body || (reply.body ? `<p>${reply.body}</p>` : '');
    const clean = sanitizeHtml(raw);

    return (
        <div>
            <CollapsibleHtmlItem
                headerPrimary={reply?.body?.length ? (reply.body.length > 70 ? reply.body.slice(0, 70) + '...' : reply.body) : '(empty)'}
                headerSecondary={`to: ${toAddr}`}
                rightMeta={when ? new Date(when).toLocaleString() : ''}
                rawHtml={clean}
                minHeight={240}
                openDefault={false}
                iframeTitle={`Reply ${reply._id || ''}`}
                attachments={reply.attachments}
                reply={true}
                direction={reply.direction || 'outgoing'}
                onAttachmentClick={onAttachmentClick}
                selectedAttachments={selectedAttachments}
                onAttachmentSelect={handleAttachmentSelect}
            />
        </div>
    );
}


