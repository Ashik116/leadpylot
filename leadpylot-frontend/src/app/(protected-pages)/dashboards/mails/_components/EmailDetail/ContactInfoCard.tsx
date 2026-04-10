'use client';

import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import CopyButton from '@/components/shared/CopyButton';
import { TLead } from '@/services/LeadsService';

interface ContactInfoCardProps {
  lead: TLead | null;
}

// Format revenue in "k" format (e.g., 23590 -> 23.59k)
const formatRevenue = (revenue: number | string | undefined): string => {
  if (revenue === null || revenue === undefined) return 'N/A';
  
  const numValue = typeof revenue === 'number' ? revenue : parseFloat(String(revenue));
  
  if (isNaN(numValue) || numValue < 1000) {
    return String(revenue);
  }

  const revenueInK = numValue / 1000;

  // If it's a whole number, show without decimals
  if (revenueInK % 1 === 0) {
    return `${revenueInK}k`;
  }

  // Otherwise, show with up to 2 decimal places, removing trailing zeros
  return `${parseFloat(revenueInK.toFixed(2))}k`;
};

const ContactInfoCard: React.FC<ContactInfoCardProps> = ({ lead }) => {
  if (!lead) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h6 className="mb-3 text-base font-bold text-gray-900">Contact Information</h6>
      <div className="space-y-1">
        {/* Contact Name */}
        <div className="flex min-h-6 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ApolloIcon name="user" className="shrink-0 text-sm text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Contact</span>
            <span className="flex-1 text-sm text-gray-900">{lead?.contact_name || 'N/A'}</span>
          </div>
          {lead?.contact_name && <CopyButton value={lead.contact_name} className="shrink-0" />}
        </div>

        {/* Email */}
        {lead?.email_from && (
          <div className="flex min-h-6 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ApolloIcon name="mail" className="shrink-0 text-sm text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Email</span>
              <span className="flex-1 text-sm text-gray-900">{lead.email_from}</span>
            </div>
            <CopyButton value={lead.email_from} className="shrink-0" />
          </div>
        )}

        {/* Phone */}
        {lead?.phone && (
          <div className="flex min-h-6 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ApolloIcon name="phone" className="shrink-0 text-sm text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Phone</span>
              <span className="flex-1 text-sm text-gray-900">{lead.phone}</span>
            </div>
            <CopyButton value={lead.phone} className="shrink-0" />
          </div>
        )}

        {/* Expected Revenue */}
        {lead?.expected_revenue !== undefined && (
          <div className="flex min-h-6 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ApolloIcon name="dollar" className="shrink-0 text-sm text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Revenue</span>
              <span className="flex-1 text-sm text-gray-900">
                {formatRevenue(lead.expected_revenue)}
              </span>
            </div>
            <CopyButton
              value={
                typeof lead.expected_revenue === 'number'
                  ? lead.expected_revenue.toString()
                  : String(lead.expected_revenue)
              }
              className="shrink-0"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfoCard;
