'use client';

import { useState, useEffect, useRef } from 'react';
import Select from '@/components/ui/Select';
import { useUsersByRole } from '@/services/hooks/useUsers';

type Option = {
  value: string;
  label: string;
  isFixed?: boolean;
  isDisabled?: boolean;
};

type Props = {
  allowedAgentIds: string[];
  restrictedAgentIds: string[];
  onAllowedChange: (value: string[]) => void;
  onRestrictedChange: (value: string[]) => void;
  onAllAgentsLoaded?: (allAgentIds: string[]) => void;
};

const DualAgentSelection = ({
  allowedAgentIds,
  restrictedAgentIds,
  onAllowedChange,
  onRestrictedChange,
  onAllAgentsLoaded,
}: Props) => {
  const { data: agents, isLoading: isAgentsLoading } = useUsersByRole('agent', { limit: 1000 });
  const [options, setOptions] = useState<Option[]>([]);
  const hasCalledOnAgentsLoaded = useRef(false);

  const allowedOptions = options?.filter((opt) => allowedAgentIds?.includes(opt?.value));
  const restrictedOptions = options?.filter((opt) => restrictedAgentIds?.includes(opt?.value));

  // Process agents data and set options
  useEffect(() => {
    if (agents) {
      const agentsData = Array.isArray(agents) ? agents : (agents as any)?.data || [];

      // Filter to only include users with role 'Agent' (case-sensitive)
      const filteredAgents = agentsData?.filter((user: any) => user.role === 'Agent');

      const userOptions =
        filteredAgents?.length > 0 &&
        filteredAgents?.map((user: any) => ({
          value: user?._id,
          label: `${user.info?.name || user?.login}`,
        }));
      setOptions(userOptions || []);
    }
  }, [agents]);

  // Call onAllAgentsLoaded when options are available (only once)
  useEffect(() => {
    if (options?.length > 0 && onAllAgentsLoaded && !hasCalledOnAgentsLoaded.current) {
      const allAgentIds = options?.map((option: Option) => option?.value);
      onAllAgentsLoaded(allAgentIds);
      hasCalledOnAgentsLoaded.current = true;
    }
  }, [options, onAllAgentsLoaded]);

  // Auto-populate restricted agents when agents load and we have allowed agents from DB
  useEffect(() => {
    // Only auto-populate when:
    // 1. All agents are loaded
    // 2. We have some allowed agents (from database)
    // 3. Restricted agents are empty (initial state)
    if (options?.length > 0 && allowedAgentIds?.length > 0 && restrictedAgentIds?.length === 0) {
      const allAgentIds = options?.map((option: Option) => option?.value);

      // Calculate which agents should be restricted (all agents NOT in allowed list)
      const calculatedRestrictedIds = allAgentIds?.filter(
        (agentId) => !allowedAgentIds?.includes(agentId)
      );

      // Only update if we actually have some agents to restrict
      if (calculatedRestrictedIds?.length > 0) {
        onRestrictedChange(calculatedRestrictedIds);
      }
    }
  }, [options, allowedAgentIds, restrictedAgentIds, onRestrictedChange]);

  // Move agents between lists
  const moveToAllowed = (agentIds: string[]) => {
    const newAllowed = [...new Set([...allowedAgentIds, ...agentIds])];
    const newRestricted = restrictedAgentIds?.filter((id) => !agentIds?.includes(id));
    onAllowedChange(newAllowed);
    onRestrictedChange(newRestricted);
  };

  const moveToRestricted = (agentIds: string[]) => {
    const newRestricted = [...new Set([...restrictedAgentIds, ...agentIds])];
    const newAllowed = allowedAgentIds?.filter((id) => !agentIds?.includes(id));
    onAllowedChange(newAllowed);
    onRestrictedChange(newRestricted);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Allowed Agents */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-green-700">
              Allowed Agents ({allowedAgentIds?.length > 0 && allowedAgentIds?.length})
              <span className="block text-xs text-gray-500">
                These agents can see and use this bank
              </span>
            </label>
          </div>
          <Select
            instanceId="allowedAgents"
            isMulti
            options={options}
            isLoading={isAgentsLoading}
            value={allowedOptions}
            placeholder="Select agents who can access this bank..."
            onChange={(selected) => {
              const selectedIds =
                (selected?.length > 0 && selected?.map((s: Option) => s?.value)) || [];

              // Find agents that were added (from restricted to allowed)
              const addedIds = selectedIds?.filter((id) => !allowedAgentIds?.includes(id));

              // Find agents that were removed (from allowed to restricted)
              const removedIds = allowedAgentIds?.filter((id) => !selectedIds?.includes(id));

              // If user is completely clearing the allowed field, don't auto-move to restricted
              if (selectedIds?.length === 0 && allowedAgentIds?.length > 0) {
                // User wants to clear all allowed agents - just clear without moving to restricted
                // eslint-disable-next-line no-console
                console.log('Clearing all allowed agents without auto-moving to restricted');
                onAllowedChange([]);
              } else if (addedIds?.length > 0) {
                // Move from restricted to allowed
                moveToAllowed(addedIds);
              } else if (removedIds?.length > 0) {
                // Move from allowed to restricted (only for partial removals)
                moveToRestricted(removedIds);
              } else {
                // Just update allowed list
                onAllowedChange(selectedIds);
              }
            }}
            className="border-green-200 focus:border-green-400"
          />
        </div>

        {/* Restricted Agents */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-red-700">
              Restricted Agents ({restrictedAgentIds.length > 0 && restrictedAgentIds.length || 0})
              <span className="block text-xs text-gray-500">
                These agents cannot see or use this bank
              </span>
            </label>
          </div>
          <Select
            instanceId="restrictedAgents"
            isMulti
            options={options}
            isLoading={isAgentsLoading}
            value={restrictedOptions}
            placeholder="Select agents to restrict from this bank..."
            onChange={(selected) => {
              const selectedIds =
                (selected?.length > 0 && selected?.map((s: Option) => s?.value)) || [];

              // Find agents that were added (from allowed to restricted)
              const addedIds = selectedIds?.filter((id: any) => !restrictedAgentIds?.includes(id));

              // Find agents that were removed (from restricted to allowed)
              const removedIds = restrictedAgentIds?.filter((id) => !selectedIds?.includes(id));

              // If user is completely clearing the restricted field, don't auto-move to allowed
              if (selectedIds?.length === 0 && restrictedAgentIds?.length > 0) {
                // User wants to clear all restricted agents - just clear without moving to allowed
                // eslint-disable-next-line no-console
                console.log('Clearing all restricted agents without auto-moving to allowed');
                onRestrictedChange([]);
              } else if (addedIds?.length > 0) {
                // Move from allowed to restricted
                moveToRestricted(addedIds);
              } else if (removedIds?.length > 0) {
                // Move from restricted to allowed (only for partial removals)
                moveToAllowed(removedIds);
              } else {
                // Just update restricted list
                onRestrictedChange(selectedIds);
              }
            }}
            className="border-red-200 focus:border-red-400"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">
        <strong>Summary:</strong> {allowedAgentIds?.length > 0 && allowedAgentIds?.length} agent(s)
        can access this bank, {restrictedAgentIds?.length > 0 && restrictedAgentIds?.length}{' '}
        agent(s) are restricted.
        {allowedAgentIds?.length + restrictedAgentIds?.length < options?.length && (
          <span className="ml-1 text-amber-600">
            ({options?.length - allowedAgentIds?.length - restrictedAgentIds?.length} agent(s) not
            yet categorized)
          </span>
        )}
      </div>
    </div>
  );
};

export default DualAgentSelection;
