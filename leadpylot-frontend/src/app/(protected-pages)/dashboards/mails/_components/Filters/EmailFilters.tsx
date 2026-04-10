'use client';

/**
 * EmailFilters Component
 * Advanced filtering UI for emails - Project, Mailserver, Status, etc.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEmailStore, getFiltersFromView } from '../../_stores/emailStore';
import { EmailFilters as EmailFiltersType } from '../../_types/email.types';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { GetAllProjectsResponse, apiGetProjects } from '@/services/ProjectsService';
import { useSettings } from '@/services/hooks/useSettings';
import type { MailServerInfo } from '@/services/SettingsService';

interface Option {
  label: string;
  value: string;
}

// Status options constant
const STATUS_OPTIONS: Option[] = [
  { label: 'All', value: 'all' },
  { label: 'Incoming', value: 'incoming' },
  { label: 'Outgoing', value: 'outgoing' },
  { label: 'Pending Approval', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function EmailFilters() {
  const { filters, setFilters, currentView, agent_id, stage, resetFiltersToDefault } =
    useEmailStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [projects, setProjects] = useState<Option[]>([]);

  // Calculate default filters for the current view
  const defaultFilters = useMemo(
    () => getFiltersFromView(currentView, agent_id, stage),
    [currentView, agent_id, stage]
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Fetch mailservers using hook
  const { data: mailServersResponse, isLoading: isLoadingMailServers } = useSettings(
    'mailservers',
    {
      page: 1,
      limit: 100,
    }
  );

  // Memoize mail servers data
  const mailServersData: MailServerInfo[] = useMemo(
    () => mailServersResponse?.data || [],
    [mailServersResponse?.data]
  );

  // Fetch projects when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await apiGetProjects({ page: 1, limit: 1000 });
        const data = (response as unknown as GetAllProjectsResponse).data || [];
        setProjects(data.map((p) => ({ label: p.name, value: p._id })));
      } catch {
        // Silently handle error - projects will remain empty
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isExpanded]);

  // Filter change handler
  const handleSelectChange = useCallback(
    (key: keyof EmailFiltersType) => (option: Option | null) => {
      setFilters({
        ...filters,
        [key]: option?.value === 'all' ? undefined : option?.value,
      });
    },
    [filters, setFilters]
  );

  // Checkbox filter handler
  const handleCheckboxChange = useCallback(
    (key: keyof EmailFiltersType) => (checked: boolean) => {
      setFilters({
        ...filters,
        [key]: checked || undefined,
      });
    },
    [filters, setFilters]
  );

  // Clear all filters
  const clearFilters = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      resetFiltersToDefault();
      setIsExpanded(false);
    },
    [resetFiltersToDefault]
  );

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Count active filters (excluding search and defaults)
  const activeFilterCount = useMemo(
    () =>
      Object.keys(filters).filter((key) => {
        if (key === 'search') return false;
        const val = filters[key as keyof EmailFiltersType];
        const def = defaultFilters[key as keyof EmailFiltersType];
        // Filter is active if it has a value AND that value is different from the default
        return val !== undefined && val !== def;
      }).length,
    [filters, defaultFilters]
  );

  // Memoized options with "All" option
  const projectOptions = useMemo(
    () => [{ label: 'All Projects', value: 'all' }, ...projects],
    [projects]
  );

  const mailServerOptions = useMemo(
    () => [
      { label: 'All Mail Servers', value: 'all' },
      ...mailServersData.map((s) => ({
        label: typeof s.name === 'string' ? s.name : s.name.en_US,
        value: s._id,
      })),
    ],
    [mailServersData]
  );

  // Get selected value for a filter
  const getSelectedValue = useCallback(
    (key: keyof EmailFiltersType, allOptions: Option[]) => {
      const value = filters[key];
      return allOptions.find((opt) => opt.value === value) || allOptions[0] || null;
    },
    [filters]
  );

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
      {/* Toggle Button */}
      <div className="flex cursor-pointer items-center justify-between" onClick={toggleExpanded}>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none hover:text-gray-900">
          <ApolloIcon name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'} />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full text-xs font-semibold w-4 h-4 bg-blue-500 text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>


        {activeFilterCount > 0 && (
          <Button
            size="xs"
            onClick={clearFilters}
            variant="destructive"
            icon={<ApolloIcon name="cross" />}
            className="shrink-0 h-5"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Expanded Filter Options */}
      {isExpanded && (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {/* Project Filter */}
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Project</label>
            <Select<Option>
              options={projectOptions}
              value={getSelectedValue('project_id', projectOptions)}
              onChange={handleSelectChange('project_id')}
              isLoading={isLoadingProjects}
              placeholder="Select project..."
              isClearable
              size="sm"
            />
          </div>

          {/* Mail Server Filter */}
          <div className="max-w-1/2 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Mail Server</label>
            <Select<Option>
              options={mailServerOptions}
              value={getSelectedValue('mailserver_id', mailServerOptions)}
              onChange={handleSelectChange('mailserver_id')}
              isLoading={isLoadingMailServers}
              placeholder="Select mail server..."
              isClearable
              size="sm"
            />
          </div>

          {/* Status Filter */}
          <div className="max-w-1/2 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <Select<Option>
              options={STATUS_OPTIONS}
              value={getSelectedValue('status', STATUS_OPTIONS)}
              onChange={handleSelectChange('status')}
              placeholder="Select status..."
              isClearable
              size="sm"
            />
          </div>

          {/* Additional Filters - Now properly responsive */}
          <div className="max-w-1/2 flex-1 h-full">
            <label className="mb-1 block text-xs font-medium text-gray-700">Additional</label>
            <div className="flex flex-wrap gap-2 md:gap-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 transition-colors hover:text-gray-900 md:text-sm">
                <input
                  type="checkbox"
                  checked={filters.has_attachments || false}
                  onChange={(e) => handleCheckboxChange('has_attachments')(e.target.checked)}
                  className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="select-none">Has Attachments</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 transition-colors hover:text-gray-900 md:text-sm">
                <input
                  type="checkbox"
                  checked={filters.is_snoozed || false}
                  onChange={(e) => handleCheckboxChange('is_snoozed')(e.target.checked)}
                  className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="select-none">Snoozed</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 transition-colors hover:text-gray-900 md:text-sm">
                <input
                  type="checkbox"
                  checked={filters.is_starred || false}
                  onChange={(e) => handleCheckboxChange('is_starred')(e.target.checked)}
                  className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="select-none">Starred</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 transition-colors hover:text-gray-900 md:text-sm">
                <input
                  type="checkbox"
                  checked={filters.has_assigned_agent || false}
                  onChange={(e) => handleCheckboxChange('has_assigned_agent')(e.target.checked)}
                  className="cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="select-none">Assigned</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
