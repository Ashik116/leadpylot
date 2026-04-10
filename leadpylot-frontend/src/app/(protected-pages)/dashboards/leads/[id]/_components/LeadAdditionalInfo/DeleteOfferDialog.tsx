import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { useDeleteOffer } from '@/services/hooks/useLeads';

interface DeleteOfferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offer: { id: string; amount: string | number } | null;
}

const DeleteOfferDialog = ({ isOpen, onClose, offer }: DeleteOfferDialogProps) => {
  const deleteOfferMutation = useDeleteOffer();
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  const handleDelete = () => {
    if (offer) {
      setDeletingOfferId(offer?.id);
      deleteOfferMutation.mutate(offer?.id, {
        onSettled: () => {
          setDeletingOfferId(null);
          onClose();
        },
      });
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div>
        <h6 className="mb-4 text-lg font-semibold">Delete Offer</h6>
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete this offer with investment Amount of{' '}
          <span className="font-medium">{offer?.amount}</span>?
          <br />
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="red-600"
            onClick={handleDelete}
            loading={!!deletingOfferId}
          >
            Delete
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteOfferDialog;
