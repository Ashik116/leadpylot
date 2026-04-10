'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface AgentPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { agent_id: string; amount: number }) => Promise<void>;
    agentOptions: { value: string; label: string }[];
    isLoading?: boolean;
    title: string;
    agentType: 'split' | 'inbound';
}

const paymentSchema = z.object({
    agent_id: z.string().min(1, 'Agent is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
});

export default function AgentPaymentModal({
    isOpen,
    onClose,
    onSubmit,
    agentOptions,
    isLoading = false,
    title,
    agentType,
}: AgentPaymentModalProps) {
    const paymentForm = useForm<{ agent_id: string; amount: number }>({
        resolver: zodResolver(paymentSchema) as any,
        defaultValues: {
            agent_id: '',
            amount: 0,
        },
    });

    const handleSubmit = async (data: { agent_id: string; amount: number }) => {
        await onSubmit(data);
        paymentForm.reset();
    };

    const handleClose = () => {
        paymentForm.reset();
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={500}>
            <div className="flex flex-col">
                <div className="mb-4 border-b pb-3">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-gray-500">Select an agent and enter the payment amount</p>
                </div>

                <form onSubmit={paymentForm.handleSubmit(handleSubmit as any)} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Agent <span className="text-red-500">*</span>
                        </label>
                        <Controller
                            name="agent_id"
                            control={paymentForm.control}
                            render={({ field, fieldState }) => (
                                <div>
                                    <Select
                                        value={
                                            field.value
                                                ? agentOptions.find((opt: { value: string; label: string }) => opt.value === field.value) || null
                                                : null
                                        }
                                        onChange={(selected: any) => field.onChange(selected?.value || '')}
                                        options={agentOptions}
                                        placeholder="Select agent"
                                        className="w-full"
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                        menuPosition="fixed"
                                        styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 10000 }),
                                            menu: (base) => ({ ...base, zIndex: 10000 }),
                                        }}
                                    />
                                    {fieldState.error && (
                                        <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>
                                    )}
                                </div>
                            )}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <Controller
                            name="amount"
                            control={paymentForm.control}
                            render={({ field, fieldState }) => (
                                <div>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full"
                                    />
                                    {fieldState.error && (
                                        <p className="mt-1 text-xs text-red-500">{fieldState.error.message}</p>
                                    )}
                                </div>
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="plain"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="solid"
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Submit Payment
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
