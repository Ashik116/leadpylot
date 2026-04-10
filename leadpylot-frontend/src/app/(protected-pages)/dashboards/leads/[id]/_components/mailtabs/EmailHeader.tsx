'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Email } from '../../emailTypes/types';
import { getBackgroundColor, getInitials } from '../../../../../../../utils/emailUtils';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import EmailApprovalSection from './EmailApprovalSection';
import { THandleQuickAction } from './useMailData';

interface EmailHeaderProps {
  email: Email;
  onBack: () => void;
  notification?: any;
  handleQuickApproveContent?: ({ emailId, isApprove, attachments }: THandleQuickAction) => void;
  onRejectShowModal: (email: Email) => void;
  onAssignLead: (email: Email) => void;
  onReply?: (email: Email) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

/**
 * Email header component displaying subject, sender info, and metadata
 */
const EmailHeader = ({
  email,
  onBack,
  handleQuickApproveContent,
  onRejectShowModal,
  onAssignLead,
  onReply,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: EmailHeaderProps) => {
  const isAdmin = email.isAgent === false;
  const router = useRouter();
  const leadName =
    typeof email.lead_id === 'string' ? email.lead_id : email.lead_id?.contact_name || email.from;
  const [localApprovalStatus, setLocalApprovalStatus] = useState(email?.approval_status);
  // const [assignLead, setLocalApprovalStatus] = useState(email?.approval_status);
  // Update local state when email approval status changes
  useEffect(() => {
    setLocalApprovalStatus(email?.approval_status);
  }, [email?.approval_status]);

  // Enhanced handler that updates header state
  const handleApprovalWithHeaderUpdate = useCallback(
    async (params: THandleQuickAction) => {
      if (handleQuickApproveContent) {
        try {
          // Optimistically update header state
          setLocalApprovalStatus(params.isApprove ? 'approved' : 'rejected');

          // Call the original handler
          await handleQuickApproveContent(params);
        } catch (error) {
          // Revert on error
          setLocalApprovalStatus(email?.approval_status);
          throw error; // Re-throw so EmailApprovalSection can handle it
        }
      }
    },
    [handleQuickApproveContent, email?.approval_status]
  );

  return (
    <div>
      {/* Header with back button and subject */}
      <div className="border-b bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="plain"
              size="sm"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 shadow-sm hover:bg-gray-50"
              onClick={onBack}
            >
              <ApolloIcon name="arrow-left" className="text-md" />
            </Button>
            <div>
              <h1 className="text-xl font-medium text-gray-800">{email.subject}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="sm"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onPrev && onPrev()}
              disabled={!hasPrev}
              aria-label="Previous email"
              title="Previous"
            >
              <ApolloIcon name="arrow-left" className="text-md" />
            </Button>
            <Button
              variant="plain"
              size="sm"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white p-0 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onNext && onNext()}
              disabled={!hasNext}
              aria-label="Next email"
              title="Next"
            >
              <ApolloIcon name="arrow-right" className="text-md" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sender information with integrated lead matching */}
      <div className="mb-6 pt-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-col items-start justify-between">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-white ${getBackgroundColor(email.from)}`}
                >
                  {getInitials(leadName)}
                </div>

                <div className="flex-1">
                  <div className="text-base font-medium">
                    {isAdmin ? leadName : email.fromEmail}
                    <span
                      className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        localApprovalStatus
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {localApprovalStatus ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                    <p>
                      {' '}
                      {email.direction === 'incoming'
                        ? `To: ${email.fromEmail || 'you'}`
                        : `From: ${email.fromEmail || 'you'}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-500">{email.date.dateStr}</div>
                  <div className="text-sm text-gray-400">{email.date.timeStr}</div>
                </div>
              </div>
            </div>
            <div className="mt-2 flex w-full justify-between pl-14">
              <div className="flex items-center space-x-1">
                {email.agent_alias_name && (
                  <span className="rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Agent: {email.agent_alias_name}
                  </span>
                )}
                {email.project_name && (
                  <span className="rounded bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Project: {email.project_name}
                  </span>
                )}
                {email.direction && (
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-medium ${email.direction === 'incoming' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}
                  >
                    {email.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                  </span>
                )}
                {email?.lead_id ? (
                  <div
                    className="bg-evergreen flex cursor-pointer items-center rounded px-2.5 py-0.5 text-xs font-medium text-white"
                    onClick={() => {
                      const leadId =
                        typeof email.lead_id === 'string' ? email.lead_id : email.lead_id?._id;
                      if (leadId) {
                        router.push(`/dashboards/leads/${leadId}`);
                      }
                    }}
                  >
                    <ApolloIcon name="eye-filled" className="mr-1" />
                    View lead
                  </div>
                ) : (
                  <div
                    className="bg-evergreen flex cursor-pointer items-center rounded px-2.5 py-0.5 text-xs font-medium text-white"
                    onClick={() => onAssignLead(email)}
                  >
                    <ApolloIcon name="user" className="mr-1" />
                    Assign lead
                  </div>
                )}
              </div>
              <div>
                <EmailApprovalSection
                  email={email}
                  handleQuickApproveContent={handleApprovalWithHeaderUpdate}
                  onRejectShowModal={onRejectShowModal}
                  onReply={onReply}
                />
              </div>
            </div>
          </div>
          {/* Integrated Lead Matching Card */}
          {/* {email?.lead_id && (
            <div className="mt-4">
              <LeadMatchingCard
                lead={email.lead_id as unknown as TLead}
                className="border-0 bg-white shadow-sm"
              />
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default EmailHeader;
