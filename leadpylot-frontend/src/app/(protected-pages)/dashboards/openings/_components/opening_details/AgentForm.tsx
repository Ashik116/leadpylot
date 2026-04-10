'use client';

import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface AgentFormProps {
  agentType: 'split' | 'inbound';
  agentOptions: { value: string; label: string }[];
  existingAgent: any;
  existingAgentsList?: any[]; // List of agents already in the target list (split or inbound)
  defaultValues?: {
    agent_id?: string;
    percentage?: string;
    reason?: string;
  };
  onSubmit: (data: { agent_id: string; percentage: number; reason?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isDeleteLoading?: boolean;
  isUpdateLoading?: boolean;
}

const agentSchema = z.object({
  agent_id: z.string().min(1, 'Agent is required'),
  percentage: z.coerce.number().min(0, 'Percentage must be between 0 and 100').max(100, 'Percentage must be between 0 and 100'),
  reason: z.string().optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function AgentForm({
  agentType,
  agentOptions,
  existingAgent,
  existingAgentsList = [],
  defaultValues,
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
  isDeleteLoading = false,
  isUpdateLoading = false,
}: AgentFormProps) {
  // Filter out agents that are already in the list, except the currently selected one (if editing)
  const filteredAgentOptions = useMemo(() => {
    const currentAgentId = defaultValues?.agent_id;
    const existingAgentIds = new Set(
      existingAgentsList.map((agent: any) => agent.agent_id || agent._id)
    );

    return agentOptions.filter((option) => {
      // Always include the currently selected agent (when editing)
      if (currentAgentId && option.value === currentAgentId) {
        return true;
      }
      // Filter out agents that are already in the list
      return !existingAgentIds.has(option.value);
    });
  }, [agentOptions, existingAgentsList, defaultValues?.agent_id]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema) as any,
    defaultValues: {
      agent_id: defaultValues?.agent_id || '',
      percentage: defaultValues?.percentage ? Number(defaultValues.percentage) : 0,
      reason: defaultValues?.reason || '',
    },
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset({
        agent_id: defaultValues.agent_id || '',
        percentage: defaultValues.percentage ? Number(defaultValues.percentage) : 0,
        reason: defaultValues.reason || '',
      });
    }
  }, [defaultValues, reset]);

  const onFormSubmit = async (data: AgentFormData) => {
    await onSubmit({
      agent_id: data.agent_id,
      percentage: data.percentage,
      reason: data.reason || undefined,
    });
  };

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-3">
      <form onSubmit={handleSubmit(onFormSubmit as any)}>
        <div className="grid grid-cols-1 gap-3  lg:grid-cols-2 xl:grid-cols-4">
          {/* Agent Select */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Agent
            </label>
            <Controller
              name="agent_id"
              control={control}
              render={({ field: { onChange, value }, fieldState }) => (
                <div>
                  <Select
                    value={
                      value
                        ? filteredAgentOptions.find((opt: { value: string; label: string }) => opt.value === value) ||
                        agentOptions.find((opt: { value: string; label: string }) => opt.value === value) || null
                        : null
                    }
                    onChange={(selected: any) => onChange(selected?.value || '')}
                    options={filteredAgentOptions}
                    placeholder="Select agent"
                    className="w-full"
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                    styles={{
                      menuPortal: (base: any) => ({ ...base, zIndex: 10000 }),
                      menu: (base: any) => ({ ...base, zIndex: 10000 }),
                    }}
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Percentage Input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Percentage (0-100)
            </label>
            <Controller
              name="percentage"
              control={control}
              render={({ field: { onChange, value }, fieldState }) => (
                <div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={value === undefined || value === null ? '' : String(value)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        onChange(undefined);
                      } else {
                        const num = parseFloat(inputValue);
                        if (!isNaN(num)) {
                          onChange(num);
                        }
                      }
                    }}
                    placeholder="0-100"
                    className="w-full"
                    invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Reason (Optional)
            </label>
            <Input
              {...register('reason')}
              type="text"
              placeholder="Enter reason"
              className="w-full"
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-end flex-wrap gap-2 pb-1">
            {existingAgent ? (
              <>
                <Button
                  size="sm"
                  variant="solid"
                  type="submit"
                  disabled={isLoading || isUpdateLoading}
                  loading={isLoading || isUpdateLoading}
                >
                  Update
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="plain"
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleteLoading}
                    loading={isDeleteLoading}
                    icon={<ApolloIcon name="trash" />}
                  />
                )}
              </>
            ) : (
              <Button
                size="sm"
                variant="solid"
                type="submit"
                disabled={isLoading}
                loading={isLoading}
              >
                Add
              </Button>
            )}
            <Button
              size="sm"
              variant="plain"
              type="button"
              onClick={onCancel}
              disabled={isLoading || isDeleteLoading || isUpdateLoading}
              icon={<ApolloIcon name="cross" />}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
