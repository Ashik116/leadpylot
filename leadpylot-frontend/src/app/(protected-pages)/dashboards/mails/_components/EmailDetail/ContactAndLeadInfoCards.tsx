'use client';

import React from 'react';
import { TLead } from '@/services/LeadsService';
import ContactInfoCard from '../../../leads/[id]/_components/LeadAdditionalInfo/ContactInfoCard';
import LeadInfoCard from '../../../leads/[id]/_components/LeadAdditionalInfo/LeadInfoCard';
import { useContactUpdate } from '../../../leads/[id]/hooks/useContactUpdate';
import { useUpdateLead } from '@/services/hooks/useLeads';
import useDisableInteractionLead from '../../../leads/[id]/hooks/useDisableInteractionLead';
import { useAllProjects } from '@/services/hooks/useProjects';
import useDoubleTapDataUpdateChanges from '@/hooks/useDoubleTapDataUpdateChanges';
import { useTodosByLeadId } from '@/services/hooks/useToDo';
import useNotification from '@/utils/hooks/useNotification';
import { useLeadCall } from '../../../leads/[id]/_components/LeadAdditionalInfo/useLeadCall';
import { isDev } from '@/utils/utils';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { EmailConversation } from '../../_types/email.types';
import TicketCounter from '../../../leads/_components/v2/TicketCounter';

interface ContactAndLeadInfoCardsProps {
  lead: TLead | null;
  leadId?: string | null;
  conversation?: EmailConversation | null;
  showCreateTaskButton?: boolean;
  onCreateTaskClick?: () => void;
}

const ContactAndLeadInfoCards: React.FC<ContactAndLeadInfoCardsProps> = ({
  lead,
  leadId,
  showCreateTaskButton = true,
  onCreateTaskClick,
  conversation,
}) => {
  // Hooks for lead management features
  const { disableInteractionLead } = useDisableInteractionLead(lead as any);
  const { handleCall } = useLeadCall();
  const { openNotification } = useNotification();
  const { data: todos } = useTodosByLeadId(leadId || undefined);
  const { data: allProjects } = useAllProjects({ limit: 100 });
  const { allStatus } = useDoubleTapDataUpdateChanges({
    stagesApi: true,
  });

  // Contact update functionality
  const { updateContact } = useContactUpdate({
    leadId: lead?._id || '',
    onSuccess: (res) => {
      openNotification({
        type: 'success',
        massage: res?.data?.message || 'Contact updated successfully',
      });
    },
  });

  // Expected revenue update functionality
  const updateLeadMutation = useUpdateLead(lead?._id || '');

  // Handler functions
  const handleContactUpdate = async (field: string, value: string) => {
    try {
      const updateData = { [field]: value };
      await updateContact(updateData);
    } catch (error) {
      isDev && console.error('Failed to update contact:', error);
    }
  };

  const handleBatchContactUpdate = async (changes: Record<string, string>) => {
    try {
      await updateContact(changes);
    } catch (error) {
      isDev && console.error('Failed to update contact:', error);
    }
  };

  const handleExpectedRevenueUpdate = async (newValue: string) => {
    try {
      // Handle the new string format from backend (e.g., "6.78k", "1.2M", etc.)
      const parseRevenueString = (value: string): number => {
        if (!value || typeof value !== 'string') {
          throw new Error('Invalid revenue value');
        }

        // Remove any whitespace and convert to lowercase
        const cleaned = value.toString().trim().toLowerCase();

        // If it's already a plain number, parse it directly
        if (/^\d+(\.\d+)?$/.test(cleaned)) {
          return parseFloat(cleaned);
        }

        // Handle formatted strings like "6.78k", "1.2m", etc.
        const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kmb]?)$/);
        if (!match) {
          throw new Error('Invalid revenue format');
        }

        const [, numberPart, suffix] = match;
        const baseNumber = parseFloat(numberPart);

        if (isNaN(baseNumber)) {
          throw new Error('Invalid revenue number');
        }

        // Apply multiplier based on suffix
        switch (suffix) {
          case 'k':
            return baseNumber * 1000;
          case 'm':
            return baseNumber * 1000000;
          case 'b':
            return baseNumber * 1000000000;
          default:
            return baseNumber;
        }
      };

      const revenue = parseRevenueString(newValue);

      updateLeadMutation.mutate(
        { expected_revenue: revenue },
        {
          onSuccess: () => {
            isDev && console.log('Expected revenue updated successfully');
          },
          onError: (error) => {
            isDev && console.error('Failed to update expected revenue:', error);
          },
        }
      );
    } catch (error) {
      isDev && console.error('Failed to update expected revenue:', error);
    }
  };

  const handleCallClick = () => {
    if (lead) {
      handleCall(lead);
    }
  };

  if (!lead) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {/* {leadId && (
          <div className="shrink-0">
            <TicketCounter leadId={leadId} emailId={conversation?._id} />
          </div>
        )}
        {showCreateTaskButton && (
          <Button
            size="xs"
            variant="success"
            icon={<ApolloIcon name="plus" className="text-sm" />}
            title="Create Task"
            onClick={() => onCreateTaskClick?.()}
          >
            <span>Create Task</span>
          </Button>
        )} */}
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2  my-2">
        <div className="col-span-1">
          <ContactInfoCard
            lead={lead as any}
            onSendEmailClick={() => {}}
            onCallClick={handleCallClick}
            onContactUpdate={handleContactUpdate}
            onBatchContactUpdate={handleBatchContactUpdate}
            enableInlineEditing={true}
            disableInteractionLead={disableInteractionLead}
            className="border-none"
            // batchMode={true}
          />
        </div>
        <div className="col-span-1">
          <LeadInfoCard
            lead={lead}
            hideUpdateInfo={true}
            onExpectedRevenueUpdate={handleExpectedRevenueUpdate}
            allProjects={allProjects}
            negativeAndPrivatOptions={allStatus}
            todos={todos}
            className="border-none"
            showPartnerID={false}
          />
        </div>
      </div>
    </>
  );
};

export default ContactAndLeadInfoCards;
