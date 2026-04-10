'use client';

/**
 * EmailApprovalStatus Component
 * Shows email approval workflow status and history
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import EmailApiService from '../../_services/EmailApiService';
import { EmailConversation } from '../../_types/email.types';

interface EmailApprovalStatusProps {
  conversation: EmailConversation;
}

interface WorkflowHistoryItem {
  _id: string;
  action: string;
  performedBy: {
    _id: string;
    name: string;
    login: string;
  };
  timestamp: string;
  comments?: string;
  reason?: string;
}

export default function EmailApprovalStatus({ conversation }: EmailApprovalStatusProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Fetch workflow history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['email-workflow-history', conversation._id],
    queryFn: () => EmailApiService.getWorkflowHistory(conversation._id),
    enabled: showHistory,
  });

  const history: WorkflowHistoryItem[] = historyData?.data?.workflow_history || [];

  // Determine overall status
  const getApprovalStatus = (): {
    label: string;
    color: string;
    icon: keyof typeof import('@/components/ui/ApolloIcon').APOLLO_ICONS;
  } => {
    if (conversation.approval_status === 'rejected') {
      return {
        label: 'Rejected',
        color: 'red',
        icon: 'times-circle',
      };
    }

    if (
      conversation.email_approved &&
      (conversation.has_attachments ? conversation.attachment_approved : true)
    ) {
      return {
        label: 'Fully Approved',
        color: 'green',
        icon: 'check-circle',
      };
    }

    if (
      conversation.email_approved &&
      !conversation.attachment_approved &&
      conversation.has_attachments
    ) {
      return {
        label: 'Email Approved, Attachments Pending',
        color: 'yellow',
        icon: 'clock-eight',
      };
    }

    if (!conversation.email_approved) {
      return {
        label: 'Pending Approval',
        color: 'yellow',
        icon: 'clock-eight',
      };
    }

    return {
      label: 'Unknown Status',
      color: 'gray',
      icon: 'alert-circle',
    };
  };

  const status = getApprovalStatus();

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          <ApolloIcon name="shield" className="mr-2 inline" />
          Approval Status
        </h3>
        <Button
          size="xs"
          variant="plain"
          onClick={() => setShowHistory(!showHistory)}
          icon={<ApolloIcon name={showHistory ? 'chevron-arrow-up' : 'chevron-arrow-down'} />}
        >
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>

      {/* Current Status */}
      <div
        className={`mb-3 flex items-center gap-2 rounded-md border p-3 ${colorClasses[status.color as keyof typeof colorClasses]}`}
      >
        <ApolloIcon name={status.icon as any} className="text-lg" />
        <div className="flex-1">
          <div className="font-medium">{status.label}</div>
          {conversation.needs_approval && (
            <div className="text-xs opacity-75">Requires admin action</div>
          )}
        </div>
      </div>

      {/* Approval Details */}
      <div className="space-y-2 text-sm">
        {/* Email Content */}
        <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-gray-700">Email Content</span>
          <div className="flex items-center gap-1">
            {conversation.email_approved ? (
              <>
                <ApolloIcon name="check-circle" className="text-green-600" />
                <span className="font-medium text-green-600">Approved</span>
              </>
            ) : (
              <>
                <ApolloIcon name="clock-eight" className="text-amber-600" />
                <span className="font-medium text-amber-600">Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Attachments */}
        {conversation.has_attachments && (
          <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-gray-700">
              Attachments ({(conversation.messages?.[0] as any)?.attachments?.length || 0})
            </span>
            <div className="flex items-center gap-1">
              {conversation.attachment_approved ? (
                <>
                  <ApolloIcon name="check-circle" className="text-green-600" />
                  <span className="font-medium text-green-600">Approved</span>
                </>
              ) : (
                <>
                  <ApolloIcon name="clock-eight" className="text-amber-600" />
                  <span className="font-medium text-amber-600">Pending</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Workflow History */}
      {showHistory && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="mb-3 text-xs font-semibold text-gray-500 uppercase">Workflow History</h4>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <ApolloIcon name="loading" className="animate-spin text-2xl text-gray-400" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item._id} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <ApolloIcon name="clock-eight" className="text-xs text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{item.action}</div>
                    <div className="text-xs text-gray-600">
                      by {item.performedBy.name || item.performedBy.login} •{' '}
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    {item.comments && (
                      <div className="mt-1 text-xs text-gray-500 italic">"{item.comments}"</div>
                    )}
                    {item.reason && (
                      <div className="mt-1 text-xs text-red-600">Reason: {item.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">No workflow history available</p>
          )}
        </div>
      )}
    </div>
  );
}
