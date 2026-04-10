'use client';


import React, { useMemo } from 'react';
import { useLeadDetails } from '../../_hooks/useEmailData';
import { EmailConversation } from '../../_types/email.types';


import { TLead } from '@/services/LeadsService';
import ContactAndLeadInfoCards from './ContactAndLeadInfoCards';
import DocumentsSectionTable from './DocumentsSectionTable';
import LeadDetailsStateHandler from './LeadDetailsStateHandler';
import OfferSectionTable from './OfferSectionTable';
import SaleDetailsLeads from '../../../leads/[id]/_components/v2/SaleDetailsLeads';

interface LeadDetailsForMailProps {
  conversation: EmailConversation | null;
  showCreateTaskButton?: boolean;
  onCreateTaskClick?: () => void;
}

const LeadDetailsForMail: React.FC<LeadDetailsForMailProps> = ({
  conversation,
  showCreateTaskButton = false,
  onCreateTaskClick,
}) => {
  // Extract lead ID - can be string or object with _id
  const leadId =
    typeof conversation?.lead_id === 'string'
      ? conversation.lead_id
      : conversation?.lead_id?._id || null;
  const { data: leadData, isLoading, error } = useLeadDetails(leadId);

  // Extract all data from API response
  const lead = leadData?.lead || leadData?.data?.lead || ((leadData?.data || leadData) as TLead | null);

  // Extract offers and openings from leadData
  // Use API's offer order (new offer, old offer, next offer etc)
  const offers = useMemo(() => {
    return leadData?.offers || leadData?.data?.offers || [];
  }, [leadData?.offers, leadData?.data?.offers]);

  // Extract all openings from offers with their parent offer reference
  // Keep the API's offer order - don't re-sort

  // Collect all documents from all openings/offers
  // This combines documents from all offers into a single array
  const allDocuments = useMemo(() => {
    const allFiles: any[] = [];

    // Collect files from all offers
    offers.forEach((offer: any) => {
      if (offer?.files && Array.isArray(offer.files)) {
        allFiles.push(...offer.files);
      }
    });

    // Top-level documents
    const topLevelDocs = leadData?.documents?.all || leadData?.data?.documents?.all || [];
    if (Array.isArray(topLevelDocs)) {
      allFiles.push(...topLevelDocs);
    }

    // Deduplicate by _id
    const uniqueFiles = Array.from(
      new Map(allFiles.map((file) => [file?._id || file?.document?._id, file])).values()
    );

    return uniqueFiles;
  }, [offers, leadData]);





  return (
    <LeadDetailsStateHandler
      conversation={conversation}
      leadId={leadId}
      isLoading={isLoading}
      error={error}
      lead={lead}
    >
      <>
        <div className="flex max-h-[90dvh] overflow-y-auto flex-col">
          <div className="space-y-1.5 overflow-y-auto">
            <ContactAndLeadInfoCards
              lead={lead}
              leadId={leadId}
              conversation={conversation}
              showCreateTaskButton={showCreateTaskButton}
              onCreateTaskClick={onCreateTaskClick}
            />

            {/* Offers Section */}

            <OfferSectionTable offers={offers} />
            <SaleDetailsLeads lead={lead as any} className="max-h-[44dvh]" />

            {/* Sales Details Section */}


            {/* Documents Section - Show all documents from all openings */}
            {allDocuments.length > 0 && (
              <div className="">
                <h4 className="text-xl font-semibold">Documents</h4>
                <DocumentsSectionTable documents={allDocuments} />
              </div>
            )}
          </div>
        </div>

        {/* Document Preview Dialog */}


        {/* Delete Confirmation Dialog
        <ConfirmDialog
          type="warning"
          isOpen={documentHandler.deleteConfirmOpen}
          title="Delete Document"
          confirmText="Delete"
          onCancel={() => documentHandler.setDeleteConfirmOpen(false)}
          onConfirm={documentHandler.handleDeleteConfirm}
        >
          <p>
            Are you sure you want to delete{' '}
            <strong>{documentHandler.documentToDelete?.filename}</strong>? This action cannot be
            undone.
          </p>
        </ConfirmDialog> */}
      </>
    </LeadDetailsStateHandler>
  );
};

export default LeadDetailsForMail;
