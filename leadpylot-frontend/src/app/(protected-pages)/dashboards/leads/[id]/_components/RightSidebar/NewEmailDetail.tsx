'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Badge from '@/components/ui/Badge';
import { useEmailById, useDownloadEmailAttachment } from '@/services/hooks/useEmailSystem';
import { formatEmailForDisplay } from '@/services/emailSystem/EmailSystemService';

interface NewEmailDetailProps {
  emailId: string;
  closeSidebar: () => void;
}

const NewEmailDetail: React.FC<NewEmailDetailProps> = ({ emailId, closeSidebar }) => {
  const { data: email, isLoading } = useEmailById(emailId);
  const { mutate: downloadAttachment, isPending: isDownloading } = useDownloadEmailAttachment();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <ApolloIcon name="loading" className="mx-auto mb-4 animate-spin text-4xl" />
          <p>Loading email...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-500">
          <ApolloIcon name="times" className="mx-auto mb-4 text-4xl" />
          <p>Email not found</p>
        </div>
      </div>
    );
  }

  const formattedEmail = formatEmailForDisplay(email);

  // Status badge component with safe chaining
  const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return null;

    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;

    return (
      <Badge className={`${variant} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDownloadAttachment = (attachmentId: string, filename: string) => {
    downloadAttachment({
      emailId: email._id,
      attachmentId,
      filename,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Email Details</h2>
          <StatusBadge status={email.email_approved ? 'approved' : 'pending'} />
        </div>
        <Button
          variant="plain"
          size="sm"
          icon={<ApolloIcon name="cross" />}
          onClick={closeSidebar}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Email Header */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <p className="text-sm text-gray-900">{formattedEmail.subject || 'No Subject'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">From</label>
                <p className="text-sm text-gray-900">
                  {formattedEmail.from || email.from_address || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">To</label>
                <p className="text-sm text-gray-900">
                  {formattedEmail.to || email.to || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <p className="text-sm text-gray-900">
                  {email.received_at ? new Date(email.received_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <p className="text-sm text-gray-900">
                  {email.received_at ? new Date(email.received_at).toLocaleTimeString() : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Assignment Info */}
            {email.assigned_agent?.login && (
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-sm text-blue-600">{email.assigned_agent.login}</p>
              </div>
            )}

            {/* Direction */}
            {email.direction && (
              <div>
                <label className="text-sm font-medium text-gray-700">Direction</label>
                <p className="text-sm text-gray-900 capitalize">{email.direction}</p>
              </div>
            )}

            {/* Priority */}
            {email.priority && (
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <p className="text-sm text-gray-900 capitalize">{email.priority}</p>
              </div>
            )}

            {/* Category */}
            {email.category && (
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <p className="text-sm text-gray-900 capitalize">{email.category}</p>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email Content</label>
            <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-gray-200 p-4">
              {email.html_body ? (
                <div
                  className="prose prose-sm max-w-none text-sm text-gray-900"
                  dangerouslySetInnerHTML={{ __html: email.html_body }}
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap text-gray-900">
                  {email.body || 'No content available'}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Attachments ({email.attachments.length})
                </label>
                <StatusBadge status={email.attachment_approved ? 'approved' : 'pending'} />
              </div>

              <div className="space-y-2">
                {email.attachments.map((attachment) => (
                  <div
                    key={attachment._id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <ApolloIcon name="file" className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{attachment.filename}</p>
                        <p className="text-xs text-gray-500">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={attachment.approval_status} />
                      {/* Only show download button if attachment is approved */}
                      {attachment.approval_status === 'approved' && (
                        <Button
                          variant="plain"
                          size="xs"
                          icon={<ApolloIcon name="download" />}
                          onClick={() =>
                            handleDownloadAttachment(attachment._id, attachment.filename)
                          }
                          disabled={isDownloading}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Information */}
          {email.email_approved_by?.login && (
            <div className="rounded-md bg-green-50 p-4">
              <h4 className="text-sm font-medium text-green-800">Approval Information</h4>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-green-700">
                  Approved by: {email.email_approved_by.login}
                </p>
                {email.email_approved_at && (
                  <p className="text-sm text-green-700">
                    Approved at: {new Date(email.email_approved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Intelligence Information */}
          {email.intelligence_metadata && (
            <div className="rounded-md bg-blue-50 p-4">
              <h4 className="text-sm font-medium text-blue-800">Intelligence Analysis</h4>
              <div className="mt-2 space-y-1">
                {email.intelligence_metadata.wordCount && (
                  <p className="text-sm text-blue-700">
                    Word Count: {email.intelligence_metadata.wordCount}
                  </p>
                )}
                {email.intelligence_metadata.analyzedAt && (
                  <p className="text-sm text-blue-700">
                    Analyzed: {new Date(email.intelligence_metadata.analyzedAt).toLocaleString()}
                  </p>
                )}
                {email.sentiment && (
                  <p className="text-sm text-blue-700">
                    Sentiment: {email.sentiment} ({email.sentiment_score})
                  </p>
                )}
                {email.spam_score !== undefined && (
                  <p className="text-sm text-blue-700">Spam Score: {email.spam_score}</p>
                )}
                {email.topics && email.topics.length > 0 && (
                  <p className="text-sm text-blue-700">Topics: {email.topics.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewEmailDetail;
