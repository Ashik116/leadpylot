'use client';

import React, { useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { EmailConversation } from '../../_types/email.types';
import { format } from 'date-fns';
import { EmailContent } from '../Shared/EmailContent';
import QuickActionsBar from '../Actions/QuickActionsBar';
import ApprovalActions from '../Actions/ApprovalActions';
import AssignAgentModal from '../Actions/AssignAgentModal';
import AssignToLeadModal from '@/app/(protected-pages)/dashboards/mails/_components/Actions/AssignToLeadModal';
import CreateTaskModal from '../Actions/CreateTaskModal';
import { useEmailData } from '../../_hooks/useEmailData';
import { useQueryClient } from '@tanstack/react-query';
interface EmailDetailsProps {
  conversation: EmailConversation;
}

const getInitials = (name: string): string => {
  return (
    name
      ?.replace(/['"]/g, '')
      ?.split(' ')
      ?.map((n) => n?.[0])
      ?.join('')
      ?.toUpperCase()
      ?.substring(0, 2) || '?'
  );
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  let hash = 0;
  for (let i = 0; i < (name?.length || 0); i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const parseEmailAddress = (emailStr: string) => {
  const match = emailStr?.match(/^"?(.+?)"?\s*<(.+?)>$/) || emailStr?.match(/^(.+)$/);
  if (match && match[2]) {
    return { name: match[1]?.replace(/['"]/g, ''), email: match[2] };
  }
  return { name: match?.[1]?.replace(/['"]/g, '') || emailStr, email: emailStr };
};

const EmailDetails: React.FC<EmailDetailsProps> = ({ conversation }) => {
  const queryClient = useQueryClient();
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyType, setReplyType] = useState<'reply' | 'replyAll'>('reply');
  const [showMetadata, setShowMetadata] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Get archive/restore actions from useEmailData hook
  const { archiveEmail, restoreEmail, isArchiving, isRestoring } = useEmailData();

  // Handle successful lead assignment - invalidate queries to refresh data
  const handleAssignLeadSuccess = () => {
    setShowAssignLeadModal(false);

    // Invalidate and refetch ALL lead-details queries to trigger the complete API call
    // This ensures /leads/{leadId}/complete is called when modal shows lead details
    queryClient.invalidateQueries({
      queryKey: ['lead-details'],
      refetchType: 'active', // Force immediate refetch of active queries
    });

    // Also invalidate email-conversations to ensure conversation prop updates with new lead_id
    queryClient.invalidateQueries({
      queryKey: ['email-conversations'],
      refetchType: 'active', // Force immediate refetch
    });
    queryClient.invalidateQueries({
      queryKey: ['email-conversations-infinite'],
      refetchType: 'active', // Force immediate refetch
    });
  };

  // Get the first message for display
  const message: any = conversation?.messages?.[0] || conversation;
  const fromParsed = parseEmailAddress(message?.from || '');
  const senderName = fromParsed?.name || conversation?.participants?.[0]?.name || 'Unknown';
  const senderEmail = fromParsed?.email || conversation?.participants?.[0]?.email || '';
  const messageDate = new Date(
    message?.received_at || message?.sent_at || conversation?.latest_message_date || new Date()
  );

  const handleReply = () => {
    setReplyType('reply');
    setShowReplyEditor(true);
  };

  const handleReplyAll = () => {
    setReplyType('replyAll');
    setShowReplyEditor(true);
  };

  // Archive/Restore handlers
  const handleArchive = () => {
    archiveEmail(conversation._id);
  };

  const handleRestore = () => {
    restoreEmail(conversation._id);
  };

  // Get thread messages for modals
  const threadMessages = conversation?.messages || [conversation];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with Action Buttons on Right */}
      <div className="mb-4 flex items-center justify-end border-b">
        {/* Action Buttons on Right */}
        <div className="flex items-center gap-2 pr-5">
          {/* Approval Actions (Approve/Reject) */}
          {/* {conversation?.needs_approval && <ApprovalActions conversation={conversation} />} */}

          {/* Quick Actions Bar */}
          <QuickActionsBar
            conversation={conversation}
            onAssignAgent={() => {
              if (conversation.lead_id) {
                setShowAssignAgentModal(true);
              }
            }}
            onAssignLead={() => setShowAssignLeadModal(true)}
            onCreateTask={() => setShowCreateTaskModal(true)}
            onArchive={handleArchive}
            onRestore={handleRestore}
            isArchiving={isArchiving}
            isRestoring={isRestoring}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pr-2">
          {/* Email Header */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Subject */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {conversation?.subject || '(no subject)'}
              </h3>
            </div>

            {/* Sender Info */}
            <div className="flex items-start gap-3 border-b border-gray-200 p-4">
              {/* Avatar */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${getAvatarColor(senderName)}`}
              >
                {getInitials(senderName)}
              </div>

              {/* Sender Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{senderName}</p>
                    <p className="text-sm text-gray-600">{`<${senderEmail}>`}</p>
                    <div className="mt-2 space-y-1 text-sm font-normal text-black">
                      {message?.to && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-500">To:</span>
                          <span className="min-w-0 truncate text-black">{message?.to}</span>
                        </div>
                      )}
                      {message?.cc && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-500">Cc:</span>
                          <span className="min-w-0 truncate text-black">{message?.cc}</span>
                        </div>
                      )}
                      {message?.bcc && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-500">Bcc:</span>
                          <span className="min-w-0 truncate text-black">{message?.bcc}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {format(messageDate, 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500">{format(messageDate, 'h:mm a')}</p>
                    {message?.direction && (
                      <span
                        className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          message?.direction === 'incoming'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {message?.direction}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Section */}
            {conversation?.participants && conversation?.participants?.length > 0 && (
              <div className="border-b border-gray-200 p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Participants ({conversation?.participants?.length})
                </h4>
                <div className="space-y-2">
                  {conversation?.participants?.map((participant: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs text-white ${getAvatarColor(participant?.name || participant?.email)}`}
                      >
                        {getInitials(participant?.name || participant?.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {participant?.name || 'Unknown'}
                        </p>
                        <p className="truncate text-xs text-gray-500">{participant?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Body - iframe preserves exact styling without breaking portal UI */}
            <div className="border-b border-gray-200 p-4">
              <EmailContent
                htmlBody={
                  message?.html_body ||
                  message?.original_html_body ||
                  (message as any)?.html_content ||
                  null
                }
                textBody={
                  message?.body || message?.original_body || (message as any)?.text_content || ''
                }
                className="rounded"
              />
            </div>

            {/* Attachments */}
            {message?.attachments && message?.attachments?.length > 0 && (
              <div className="border-b border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-700">
                  <ApolloIcon name="paperclip" className="mr-1 inline text-sm" />
                  {message?.attachments?.length} Attachment
                  {message?.attachments?.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {message?.attachments?.map((attachment: any, idx: number) => (
                    <div
                      key={attachment?._id || idx}
                      className="flex items-center gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <ApolloIcon name="paperclip" className="text-lg text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {attachment?.filename || 'Unnamed file'}
                        </p>
                        {attachment?.size && (
                          <p className="text-xs text-gray-500">
                            {(attachment?.size / 1024)?.toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="default">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thread Information */}
            {(message?.reply_count > 0 || conversation?.message_count > 1) && (
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center gap-4 text-sm">
                  {conversation?.message_count && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <ApolloIcon name="mail" className="text-sm" />
                      <span className="font-medium">{conversation?.message_count}</span>
                      <span>messages</span>
                    </div>
                  )}
                  {message?.reply_count > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <ApolloIcon name="reply" className="text-sm" />
                      <span className="font-medium">{message?.reply_count}</span>
                      <span>replies</span>
                    </div>
                  )}
                  {conversation?.incoming_count !== undefined && (
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <ApolloIcon name="arrow-down" className="text-sm" />
                      <span className="font-medium">{conversation?.incoming_count}</span>
                      <span>incoming</span>
                    </div>
                  )}
                  {conversation?.outgoing_count !== undefined && (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <ApolloIcon name="arrow-up" className="text-sm" />
                      <span className="font-medium">{conversation?.outgoing_count}</span>
                      <span>outgoing</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-b border-gray-200 p-4">
              <Button
                size="sm"
                variant="solid"
                icon={<ApolloIcon name="reply" />}
                onClick={handleReply}
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="default"
                icon={<ApolloIcon name="reply" />}
                onClick={handleReplyAll}
              >
                Reply All
              </Button>
              <Button size="sm" variant="default" icon={<ApolloIcon name="reply" />}>
                Forward
              </Button>
            </div>

            {/* Advanced Metadata */}
            {showMetadata && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="space-y-4">
                  {/* IDs and References */}
                  <div>
                    <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                      Identifiers
                    </h5>
                    <div className="space-y-1 text-xs">
                      {message?._id && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Message ID:</span>
                          <span className="font-mono text-gray-800">{message?._id}</span>
                        </div>
                      )}
                      {conversation?.thread_id && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Thread ID:</span>
                          <span className="font-mono text-gray-800">{conversation?.thread_id}</span>
                        </div>
                      )}
                      {message?.external_id && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">External ID:</span>
                          <span className="font-mono text-gray-800">{message?.external_id}</span>
                        </div>
                      )}
                      {message?.in_reply_to && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">In Reply To:</span>
                          <span className="font-mono text-gray-800">{message?.in_reply_to}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div>
                    <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                      Timestamps
                    </h5>
                    <div className="space-y-1 text-xs">
                      {message?.received_at && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Received:</span>
                          <span className="text-gray-800">
                            {format(new Date(message?.received_at), 'PPpp')}
                          </span>
                        </div>
                      )}
                      {message?.sent_at && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Sent:</span>
                          <span className="text-gray-800">
                            {format(new Date(message?.sent_at), 'PPpp')}
                          </span>
                        </div>
                      )}
                      {message?.createdAt && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Created:</span>
                          <span className="text-gray-800">
                            {format(new Date(message?.createdAt), 'PPpp')}
                          </span>
                        </div>
                      )}
                      {message?.updatedAt && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Updated:</span>
                          <span className="text-gray-800">
                            {format(new Date(message?.updatedAt), 'PPpp')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Addresses */}
                  <div>
                    <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                      Email Addresses
                    </h5>
                    <div className="space-y-1 text-xs">
                      {message?.from_address && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">From Address:</span>
                          <span className="text-gray-800">{message?.from_address}</span>
                        </div>
                      )}
                      {message?.reply_to_email && (
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Reply-To:</span>
                          <span className="text-gray-800">{message?.reply_to_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mail Server Info */}
                  {message?.mailserver_id && (
                    <div>
                      <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                        Mail Server
                      </h5>
                      <div className="space-y-1 text-xs">
                        <div className="flex gap-2">
                          <span className="font-medium text-gray-600">Server:</span>
                          <span className="text-gray-800">
                            {message?.mailserver_id?.name || 'N/A'}
                          </span>
                        </div>
                        {message?.mailserver_id?._id && (
                          <div className="flex gap-2">
                            <span className="font-medium text-gray-600">Server ID:</span>
                            <span className="font-mono text-gray-800">
                              {message?.mailserver_id?._id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Flags and Status */}
                  <div>
                    <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                      Status Flags
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {message?.flagged && (
                        <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                          Flagged
                        </span>
                      )}
                      {message?.archived && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          Archived
                        </span>
                      )}
                      {message?.is_spam && (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          Spam
                        </span>
                      )}
                      {message?.is_draft && (
                        <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                          Draft
                        </span>
                      )}
                      {message?.is_reply && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          Reply
                        </span>
                      )}
                      {message?.is_forward && (
                        <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                          Forward
                        </span>
                      )}
                      {message?.processed && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Processed
                        </span>
                      )}
                      {message?.admin_viewed && (
                        <span className="rounded bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700">
                          Admin Viewed
                        </span>
                      )}
                      {message?.agent_viewed && (
                        <span className="rounded bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">
                          Agent Viewed
                        </span>
                      )}
                      {message?.email_approved && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Email Approved
                        </span>
                      )}
                      {message?.attachment_approved && (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Attachment Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spam Info */}
                  {(message?.spam_score !== undefined || message?.spam_indicators?.length > 0) && (
                    <div>
                      <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                        Spam Analysis
                      </h5>
                      <div className="space-y-1 text-xs">
                        {message?.spam_score !== undefined && (
                          <div className="flex gap-2">
                            <span className="font-medium text-gray-600">Spam Score:</span>
                            <span className="text-gray-800">{message?.spam_score}</span>
                          </div>
                        )}
                        {message?.spam_indicators && message?.spam_indicators?.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">Indicators:</span>
                            <ul className="mt-1 ml-4 list-disc text-gray-800">
                              {message?.spam_indicators?.map((indicator: any, idx: number) => (
                                <li key={idx}>{indicator}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Info */}
                  {(message?.delivery_attempts > 0 || message?.delivery_errors?.length > 0) && (
                    <div>
                      <h5 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                        Delivery Information
                      </h5>
                      <div className="space-y-1 text-xs">
                        {message?.delivery_attempts !== undefined && (
                          <div className="flex gap-2">
                            <span className="font-medium text-gray-600">Attempts:</span>
                            <span className="text-gray-800">{message?.delivery_attempts}</span>
                          </div>
                        )}
                        {message?.delivery_errors && message?.delivery_errors?.length > 0 && (
                          <div>
                            <span className="font-medium text-red-600">Errors:</span>
                            <ul className="mt-1 ml-4 list-disc text-red-800">
                              {message?.delivery_errors?.map((error: any, idx: number) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Content Toggle */}
                  <div>
                    <button
                      onClick={() => setShowRawContent(!showRawContent)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      <span className="font-medium">
                        {showRawContent ? 'Hide' : 'Show'} Raw Content
                      </span>
                      <ApolloIcon name={showRawContent ? 'arrow-up' : 'arrow-down'} />
                    </button>

                    {showRawContent && (
                      <div className="mt-2 space-y-3">
                        {message?.original_body && (
                          <div>
                            <h6 className="mb-1 text-xs font-semibold text-gray-600">
                              Plain Text Content:
                            </h6>
                            <pre className="max-h-60 overflow-auto rounded bg-white p-2 text-xs text-gray-800">
                              {message?.original_body}
                            </pre>
                          </div>
                        )}
                        {message?.body && message?.body !== message?.original_body && (
                          <div>
                            <h6 className="mb-1 text-xs font-semibold text-gray-600">
                              Processed Body:
                            </h6>
                            <pre className="max-h-60 overflow-auto rounded bg-white p-2 text-xs text-gray-800">
                              {message?.body}
                            </pre>
                          </div>
                        )}
                        {message?.latest_message_snippet && (
                          <div>
                            <h6 className="mb-1 text-xs font-semibold text-gray-600">Snippet:</h6>
                            <pre className="max-h-40 overflow-auto rounded bg-white p-2 text-xs text-gray-800">
                              {conversation?.latest_message_snippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reply Editor */}
          {showReplyEditor && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {replyType === 'reply' ? 'Reply' : 'Reply All'}
                </p>
                <button
                  onClick={() => setShowReplyEditor(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ApolloIcon name="cross" />
                </button>
              </div>
              <textarea
                className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={6}
                placeholder="Type your reply..."
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="default" onClick={() => setShowReplyEditor(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="solid">
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Conversation-Level Metadata */}
        </div>
      </div>

      {/* Modals */}
      {/* Assign Agent Modal */}
      {showAssignAgentModal && (
        <AssignAgentModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          threadEmails={threadMessages}
          currentAssignedAgent={conversation.assigned_agent?._id}
          currentVisibleAgents={conversation.visible_to_agents || []}
          onClose={() => setShowAssignAgentModal(false)}
        />
      )}

      {/* Assign to Lead Modal */}
      {showAssignLeadModal && (
        <AssignToLeadModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          emailFrom={
            conversation.participants?.[0]?.email ||
            conversation.messages?.[0]?.from_address ||
            conversation.messages?.[0]?.from ||
            ''
          }
          onClose={handleAssignLeadSuccess}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          threadEmails={threadMessages}
          leadId={
            typeof conversation.lead_id === 'string'
              ? conversation.lead_id
              : conversation.lead_id?._id
          }
          onClose={() => setShowCreateTaskModal(false)}
        />
      )}
    </div>
  );
};

export default EmailDetails;
