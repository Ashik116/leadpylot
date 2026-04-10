import React, { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  validateNettoRates,
  calculateNettoPreview,
  formatCurrency,
  NettoRequestData,
} from '@/services/NettoService';
import { useNettoOperations } from '@/services/hooks/useNetto';
import { parseKNumber } from '@/utils/utils';

interface NettoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  offer?: {
    _id: string;
    title?: string;
    investment_volume: number;
    bonus_amount: number;
    bankerRate?: number;
    agentRate?: number;
  };
  loading?: boolean;
}

interface NettoOption {
  value: 'netto1' | 'netto2';
  label: string;
  description: string;
}

const NETTO_OPTIONS: NettoOption[] = [
  {
    value: 'netto1',
    label: 'Netto1',
    description: 'Send to Netto1 - Updates lead to Opening/Netto1',
  },
  {
    value: 'netto2',
    label: 'Netto2',
    description: 'Send to Netto2 - Updates lead to Opening/Netto2',
  },
];

const NettoModal: React.FC<NettoModalProps> = ({
  open,
  onClose,
  onSuccess,
  offer,
  loading: externalLoading = false,
}) => {
  // Default to netto2 option
  const netto2Option = NETTO_OPTIONS.find((opt) => opt.value === 'netto2') || NETTO_OPTIONS[1] || null;
  const [selectedNetto, setSelectedNetto] = useState<NettoOption | null>(netto2Option);
  const [bankerRate, setBankerRate] = useState<string>('');
  const [agentRate, setAgentRate] = useState<string>('');

  const { sendToNetto1, sendToNetto2, isLoading } = useNettoOperations({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  // Initialize rates from offer when dialog opens - use derived state
  const initialBankerRate = useMemo(() => {
    return offer?.bankerRate?.toString() || '';
  }, [offer?.bankerRate]);

  const initialAgentRate = useMemo(() => {
    return offer?.agentRate?.toString() || '';
  }, [offer?.agentRate]);

  // Update rates when dialog opens and offer changes
  React.useEffect(() => {
    if (open) {
      setBankerRate(initialBankerRate);
      setAgentRate(initialAgentRate);
    }
  }, [open, initialBankerRate, initialAgentRate]);

  // Calculate revenue preview
  const revenuePreview = useMemo(() => {
    if (!offer || !bankerRate || !agentRate) return null;

    const bankerRateNum = parseFloat(bankerRate);
    const agentRateNum = parseFloat(agentRate);

    if (isNaN(bankerRateNum) || isNaN(agentRateNum)) return null;

    return calculateNettoPreview(
      offer.investment_volume,
      offer.bonus_amount,
      agentRateNum,
      bankerRateNum
    );
  }, [offer, bankerRate, agentRate]);

  // Validate rates - use useMemo instead of useEffect
  const errors = useMemo(() => {
    const bankerRateNum = bankerRate ? parseFloat(bankerRate) : undefined;
    const agentRateNum = agentRate ? parseFloat(agentRate) : undefined;
    const validation = validateNettoRates(bankerRateNum, agentRateNum);
    return validation.errors;
  }, [bankerRate, agentRate]);

  const handleClose = () => {
    setBankerRate('');
    setAgentRate('');
    // Reset to netto2 (default) when closing
    setSelectedNetto(NETTO_OPTIONS.find((opt) => opt.value === 'netto2') || NETTO_OPTIONS[1] || null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!offer || errors?.length > 0) return;

    const data: NettoRequestData = {
      bankerRate: bankerRate ? parseFloat(bankerRate) : undefined,
      agentRate: agentRate ? parseFloat(agentRate) : undefined,
    };

    try {
      if (selectedNetto?.value === 'netto1') {
        await sendToNetto1.mutateAsync({ offerId: offer?._id, data });
      } else {
        await sendToNetto2.mutateAsync({ offerId: offer?._id, data });
      }
    } catch (error) {
      // Error handling is done in the hooks
      // eslint-disable-next-line no-console
      console.error('Netto submission error:', error);
    }
  };

  const isSubmitting = isLoading || externalLoading;

  return (
    <Dialog
      key={open ? 'netto-modal-open' : 'netto-modal-closed'}
      isOpen={open}
      onClose={handleClose}
      width={600}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Send Offer to Netto System</h2>
          {offer && (
            <p className="mt-2 text-sm text-gray-600">
              Offer: <span className="font-medium">{offer?.title}</span>
            </p>
          )}
        </div>

        {/* Netto System Selection */}
        <FormItem label="Select Netto System">
          <Select
            value={selectedNetto}
            onChange={(value) => setSelectedNetto(value as any)}
            options={NETTO_OPTIONS as any}
            placeholder="Choose Netto system"
            isDisabled={isSubmitting}
          />
        </FormItem>

        {/* Rate Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="Banker Rate (%)"
            invalid={errors?.some((err) => err.includes('Banker'))}
            errorMessage={errors?.find((err) => err.includes('Banker'))}
          >
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Enter banker rate"
                value={bankerRate}
                onChange={(e) => setBankerRate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </FormItem>

          <FormItem
            label="Agent Rate (%)"
            invalid={errors?.some((err) => err?.includes('Agent'))}
            errorMessage={errors?.find((err) => err?.includes('Agent'))}
          >
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Enter agent rate"
                value={agentRate}
                onChange={(e) => setAgentRate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </FormItem>
        </div>

        {/* Revenue Preview */}
        {revenuePreview && offer && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center font-medium text-gray-900">
              <ApolloIcon name="dollar" className="mr-2" />
              Revenue Calculation Preview
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(parseKNumber(offer?.investment_volume))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bonus Amount:</span>
                  <span className="font-medium">{formatCurrency(offer?.bonus_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium text-gray-900">Base Amount:</span>
                  <span className="font-medium">{formatCurrency(revenuePreview?.baseAmount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Agent Share ({agentRate}%):</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(revenuePreview?.agentShare)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank Share ({bankerRate}%):</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(revenuePreview?.bankShare)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium text-gray-900">Net Revenue:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(revenuePreview?.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 border-t pt-6">
          <Button variant="plain" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            icon={<ApolloIcon name="arrow-right" />}
          >
            Send to {selectedNetto?.value === 'netto1' ? 'Netto1' : 'Netto2'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default NettoModal;
