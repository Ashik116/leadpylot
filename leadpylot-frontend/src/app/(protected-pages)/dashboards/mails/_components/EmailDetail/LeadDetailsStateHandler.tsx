'use client';

import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailConversation } from '../../_types/email.types';

interface LeadDetailsStateHandlerProps {
  conversation: EmailConversation | null;
  leadId: string | null;
  isLoading: boolean;
  error: any;
  lead: any;
  children: React.ReactNode;
}

const LeadDetailsStateHandler: React.FC<LeadDetailsStateHandlerProps> = ({
  conversation,
  leadId,
  isLoading,
  error,
  lead,
  children,
}) => {
  if (!conversation) {
    return (
      <div className="flex h-full flex-col">
        <h4 className="mb-4 border-b border-gray-300 pb-3 text-lg font-semibold">Lead Details</h4>
        <div className="flex flex-1 items-center justify-center text-gray-500">
          No email selected
        </div>
      </div>
    );
  }

  if (!leadId) {
    return (
      <div className="flex h-full flex-col">
        <h4 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Lead Details</h4>

        <p className="text-sm text-gray-500">No lead associated with this email</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <h4 className="mb-4 border-b border-gray-200 pb-3 text-lg font-semibold">Lead Details</h4>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-sm text-gray-500">Loading lead details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <h4 className="mb-4 text-lg font-semibold">Lead Details</h4>
        <div className="flex flex-1 items-center justify-center text-red-500">
          <div className="text-center">
            <ApolloIcon name="alert-circle" className="mx-auto mb-2 text-4xl" />
            <p className="text-sm">Failed to load lead details</p>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-full flex-col">
        <h4 className="mb-4 border-b border-gray-300 pb-3 text-lg font-semibold">Lead Details</h4>
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <p className="text-sm">No lead data available</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LeadDetailsStateHandler;
