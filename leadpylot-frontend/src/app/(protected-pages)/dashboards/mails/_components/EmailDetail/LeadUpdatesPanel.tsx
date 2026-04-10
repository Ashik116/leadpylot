'use client';

/**
 * LeadUpdatesPanel Component
 * Reusable component for displaying lead updates timeline and notes
 * Can be used in modals, sidebars, or any other part of the CRM
 */

import { useState } from 'react';
import { EmailConversation } from '../../_types/email.types';


import UpdatesTab from '@/app/(protected-pages)/dashboards/leads/[id]/_components/RightSidebar/UpdatesTab';
import AssignToLeadModal from '../Actions/AssignToLeadModal';

import EmailDetail from '../EmailLayout/EmailDetail';

interface LeadUpdatesPanelProps {
  leadId: string | undefined;
  conversation?: EmailConversation | null;
  showAssignToLeadButton?: boolean;
  className?: string;
}

export default function LeadUpdatesPanel({
  leadId,
  conversation,

  className = '',
}: LeadUpdatesPanelProps) {
  const [showAssignLeadModal, setShowAssignLeadModal] = useState(false);


  return (
    <>
      <div className={`flex h-full flex-col overflow-hidden  ${className}`}>
        {/* Action Buttons on Right with Updates label */}
        <div className="flex items-center gap-5 border-b border-gray-200 px-4 py-1.5">
          <h4 className="text-lg font-medium text-gray-900">Updates</h4>


        </div>
        {/* Updates Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Show Email Details when not assigned, UpdatesTab (with activities and notes) when assigned */}
          {leadId ? (
            <UpdatesTab leadId={leadId} leadExpandView={false} />
          ) : conversation ? (
            <div className="flex-1 overflow-auto">
              <EmailDetail conversation={conversation} />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              <p className="text-sm text-gray-500">No lead associated with this email</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign to Lead Modal */}
      {showAssignLeadModal && conversation && (
        <AssignToLeadModal
          emailId={conversation._id}
          emailSubject={conversation.subject}
          emailFrom={
            conversation.participants?.[0]?.email || conversation.lead_id?.email_from
          }
          onClose={() => setShowAssignLeadModal(false)}
        />
      )}
    </>
  );
}
