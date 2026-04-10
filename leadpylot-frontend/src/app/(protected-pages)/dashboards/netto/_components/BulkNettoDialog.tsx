import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import FormItem from '@/components/ui/Form/FormItem';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { validateNettoRates, NettoRequestData } from '@/services/NettoService';
import { useBulkNettoOperations } from '@/services/hooks/useNetto';

interface BulkNettoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedOffers: Array<{
    _id: string;
    title?: string;
    investment_volume: number;
    bonus_amount: number;
  }>;
}

const BulkNettoDialog: React.FC<BulkNettoDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedOffers,
}) => {
  const [selectedNetto, setSelectedNetto] = useState<'netto1' | 'netto2'>('netto1');
  const [bankerRate, setBankerRate] = useState<string>('30');
  const [agentRate, setAgentRate] = useState<string>('25');
  const [errors, setErrors] = useState<string[]>([]);

  const { bulkSendToNetto1, bulkSendToNetto2, isLoading } = useBulkNettoOperations({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  // Validate rates
  React.useEffect(() => {
    const bankerRateNum = bankerRate ? parseFloat(bankerRate) : undefined;
    const agentRateNum = agentRate ? parseFloat(agentRate) : undefined;

    const validation = validateNettoRates(bankerRateNum, agentRateNum);
    setErrors(validation.errors);
  }, [bankerRate, agentRate]);

  const handleClose = () => {
    setBankerRate('30');
    setAgentRate('25');
    setErrors([]);
    setSelectedNetto('netto1');
    onClose();
  };

  const handleSubmit = async () => {
    if (errors.length > 0 || selectedOffers.length === 0) return;

    const data: NettoRequestData = {
      bankerRate: bankerRate ? parseFloat(bankerRate) : undefined,
      agentRate: agentRate ? parseFloat(agentRate) : undefined,
    };

    const requests = selectedOffers.map((offer) => ({
      offerId: offer?._id,
      data,
    }));

    try {
      if (selectedNetto === 'netto1') {
        await bulkSendToNetto1.mutateAsync(requests);
      } else {
        await bulkSendToNetto2.mutateAsync(requests);
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Bulk Netto submission error:', error);
      // Error handling is done in the hooks
    }
  };

  const isFormValid = !errors?.length && bankerRate && agentRate && selectedOffers?.length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Send to Netto System</h2>
          <p className="mt-2 text-sm text-gray-600">
            Send {selectedOffers?.length} offer{selectedOffers?.length !== 1 ? 's' : ''} to Netto
            system
          </p>
        </div>

        {/* Selected Offers Summary */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 flex items-center font-medium text-gray-900">
            Selected Offers ({selectedOffers?.length})
          </h3>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {selectedOffers?.slice(0, 5).map((offer, index) => (
              <div key={offer?._id} className="flex justify-between text-sm">
                <span className="truncate">{offer?.title || `Offer ${index + 1}`}</span>
                <span className="font-medium">{offer?.investment_volume} €</span>
              </div>
            ))}
            {selectedOffers?.length > 5 && (
              <div className="pt-2 text-center text-xs text-gray-500">
                ... and {selectedOffers?.length - 5} more offers
              </div>
            )}
          </div>
        </div>

        {/* Netto System Selection */}
        <FormItem label="Select Netto System">
          <Select
            value={selectedNetto}
            onChange={(value) => setSelectedNetto(value as 'netto1' | 'netto2')}
            options={
              [
                { value: 'netto1', label: 'Netto1' },
                { value: 'netto2', label: 'Netto2' },
              ] as any
            }
            placeholder="Choose Netto system"
            isDisabled={isLoading}
          />
        </FormItem>

        {/* Rate Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="Banker Rate (%)"
            invalid={errors?.some((err) => err?.includes('Banker'))}
            errorMessage={errors?.find((err) => err?.includes('Banker'))}
          >
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="Enter banker rate"
                value={bankerRate}
                onChange={(e) => setBankerRate(e.target.value)}
                disabled={isLoading}
              />
              <span className="absolute top-2 right-3 text-gray-400">%</span>
            </div>
          </FormItem>

          <FormItem
            label="Agent Rate (%)"
            invalid={errors?.some((err) => err?.includes('Agent'))}
            errorMessage={errors?.find((err) => err?.includes('Agent'))}
          >
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="Enter agent rate"
                value={agentRate}
                onChange={(e) => setAgentRate(e.target.value)}
                disabled={isLoading}
              />
              <span className="absolute top-2 right-3 text-gray-400">%</span>
            </div>
          </FormItem>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 border-t pt-6">
          <Button variant="plain" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            icon={<ApolloIcon name="arrow-right" />}
          >
            Send {selectedOffers?.length} offer{selectedOffers?.length !== 1 ? 's' : ''} to{' '}
            {selectedNetto === 'netto1' ? 'Netto1' : 'Netto2'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default BulkNettoDialog;
