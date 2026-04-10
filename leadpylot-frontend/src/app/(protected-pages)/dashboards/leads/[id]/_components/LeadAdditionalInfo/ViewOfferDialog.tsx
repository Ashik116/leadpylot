'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import OfferDocument from './OfferDocument';
import { TLead, Offer } from '@/services/LeadsService';
import { LuDownload } from 'react-icons/lu';

// Define the Offer interface

// No need to import Lead again as it's already imported at the top

interface ViewOfferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  lead: TLead;
}

const ViewOfferDialog = ({ isOpen, onClose, offer, lead }: ViewOfferDialogProps) => {
  if (!offer) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={viewportWidth * 0.5}
      height={viewportHeight * 0.8}
    >
      <div className="flex h-full flex-col">
        <h6 className="mb-4 text-lg font-semibold">Offer Preview</h6>
        <div className="mb-4 grow overflow-hidden">
          {isOpen && (
            <PDFViewer className="h-full w-full rounded border border-gray-200" showToolbar={false}>
              <OfferDocument offer={offer} lead={lead} />
            </PDFViewer>
          )}
        </div>
        <div className="flex justify-end gap-4 border-t border-gray-200 pt-4">
          <Button onClick={onClose}>Close</Button>{' '}
          {offer && (
            <PDFDownloadLink
              document={<OfferDocument offer={offer} lead={lead} />}
              fileName={`offer-${offer?._id}.pdf`}
              className="bg-sand-1 hover:bg-sand-2 focus:ring-sand-1 inline-flex items-center rounded-lg border border-transparent px-4 text-sm font-semibold text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              {({ loading }) =>
                loading ? (
                  <div className="flex items-center gap-2">
                    <span>Preparing document...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LuDownload size={20} />
                    <span>Download PDF</span>
                  </div>
                )
              }
            </PDFDownloadLink>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default ViewOfferDialog;
