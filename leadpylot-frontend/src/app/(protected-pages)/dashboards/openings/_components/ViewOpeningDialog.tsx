'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { OpeningItem } from './types';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

interface ViewOpeningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  opening: OpeningItem;
}

const ViewOpeningDialog = ({ isOpen, onClose, opening }: ViewOpeningDialogProps) => {
  const router = useRouter();

  const handleViewLead = () => {
    router.push(`/dashboards/leads/${opening?.leadId}`);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="sm:max-w-lg">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Opening Details</h3>
        </div>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">PROJECT</p>
              <p className="font-medium">{opening?.projectName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">AGENT</p>
              <p className="font-medium">{opening?.agentLogin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CONTACT NAME</p>
              <p className="font-medium">{opening?.contactName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">INVESTMENT AMOUNT</p>
              <p className="font-medium">{opening?.amount?.toLocaleString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">RATE</p>
              <p className="font-medium">{opening?.interestRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">BONUS AMOUNT</p>
              <p className="font-medium">{opening?.bonusAmount?.toLocaleString() || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">BANK</p>
              <p className="font-medium">{opening?.bankName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">PAYMENT TERMS</p>
              <p className="font-medium">{opening?.paymentTerms || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CREATED AT</p>
              <p className="font-medium">
                {dayjs(opening?.offerDate).format('DD/MM/YYYY HH:mm:ss')}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleViewLead}>View Lead</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ViewOpeningDialog;
