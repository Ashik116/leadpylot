'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Email } from '../../emailTypes/types';
import classNames from '@/utils/classNames';
import { THandleQuickAction } from './useMailData';

interface EmailApprovalSectionProps {
    email: Email;
    handleQuickApproveContent?: ({ emailId, isApprove, attachments }: THandleQuickAction) => void;
    onRejectShowModal: (email: Email) => void;
    onReply?: (email: Email) => void;
}

const EmailApprovalSection = ({
    email,
    handleQuickApproveContent,
    onRejectShowModal,
    onReply

}: EmailApprovalSectionProps) => {
    const [approvalNotes, setApprovalNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);

    // Local state for instant UI updates
    const [localApprovalStatus, setLocalApprovalStatus] = useState(email?.approval_status || 'pending');
    // const [localAttachmentApprovalStatus, setLocalAttachmentApprovalStatus] = useState(email?.attachment_approval_status || 'pending');

    // Update local state when email prop changes
    useEffect(() => {
        setLocalApprovalStatus(email.approval_status || 'pending');
        // setLocalAttachmentApprovalStatus(email.attachment_approval_status || 'pending');
    }, [email.approval_status, email.attachment_approval_status]);

    const onHandleContent = async (isApprove: boolean) => {
        if (handleQuickApproveContent) {
            try {
                // Optimistic update - immediately update local state
                setLocalApprovalStatus(isApprove ? 'approved' : 'rejected');

                // Call the approval handler
                await handleQuickApproveContent({
                    emailId: email.id,
                    isApprove,
                    attachments: isApprove ? email?.attachments?.map(attachment => (attachment.documentId || attachment._id)) as string[] : undefined
                });

                // Success - state is already updated optimistically
            } catch (error) {
                // Revert on error
                setLocalApprovalStatus(email?.approval_status || 'pending');
                console.error('Approval failed:', error);
            }
        }
    }

    return (
        <div>
            {/* Header */}

            <div className="mb-4 hidden">
                <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                    <ApolloIcon
                        name="chevron-arrow-down"
                        className={classNames(
                            'w-4 h-4 transition-transform duration-200',
                            showNotes ? 'rotate-180' : ''
                        )}
                    />
                    Add Notes (Optional)
                </button>

                <div className={classNames(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    showNotes ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0'
                )}>
                    <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        rows={3}
                        placeholder="Add notes about your approval/rejection decision..."
                    />
                </div>
            </div>

            {/* Approval Status & Buttons */}
            <div className="flex flex-wrap gap-2 items-center">

                <Button
                    size="sm"
                    variant="default"
                    onClick={() => onReply?.(email)}
                    icon={<ApolloIcon name="reply" />}
                    className="text-xs"
                >
                    Reply {email.reply_count && email.reply_count > 0 ? `(${email.reply_count})` : ''}
                </Button>

                {(localApprovalStatus === 'pending' && email.lead_id) && (
                    <>
                        <Button
                            size="sm"
                            variant="success"
                            onClick={() => onHandleContent(true)}
                            icon={<ApolloIcon name="check" />}
                            className="text-xs"
                        >
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onRejectShowModal(email)}
                            icon={<ApolloIcon name="times" />}
                            className="text-xs"
                        >
                            Reject
                        </Button>
                    </>
                )}

                {localApprovalStatus === 'approved' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200">
                        <ApolloIcon name="check" className="w-4 h-4" />
                        <span className="text-sm font-medium">Approved</span>
                    </div>
                )}

                {localApprovalStatus === 'rejected' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-md border border-red-200">
                        <ApolloIcon name="times" className="w-4 h-4" />
                        <span className="text-sm font-medium">Rejected</span>
                    </div>
                )}

            </div>
        </div>
    );
};

export default EmailApprovalSection; 