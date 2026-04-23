'use client';

/**
 * ConversationListHeader - Single-row header with centered search
 * Layout: [Checkbox][Title][Count] | [flex] [Search + AdvancedSearch] [flex] | [MailServer][Calendar][DateFilter]
 */

import { useEffect, useRef, useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useEmailStore } from '../../_stores/emailStore';
import { useAgentMailServers, useDeduplicatedServers } from '../../_hooks/useAgentMailServers';
import {
  useSelectedMailServerDisplay,
  getMailServerDisplayName,
} from '../../_hooks/useSelectedMailServerDisplay';

const ADMIN_VIEWS = new Set(['inbox', 'sent']);

export interface ConversationListHeaderProps {
  conversationsCount: number;
  headerTitle: string;
  isAllSelected: boolean;
  toggleSelectAll: () => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onOpenCalendarFilter: () => void;
  onOpenAdvancedSearch: () => void;
  dateFilterLabel: string | null;
  onClearDateFilter: () => void;
}

export default function ConversationListHeader({
  conversationsCount,
  headerTitle,
  isAllSelected,
  toggleSelectAll,
  searchTerm,
  onSearch,
  onClearSearch,
  onOpenCalendarFilter,
  onOpenAdvancedSearch,
  dateFilterLabel,
  onClearDateFilter,
}: ConversationListHeaderProps) {
  const currentView = useEmailStore((s) => s.currentView);
  const {
    id: selectedMailServerId,
    name: selectedMailServerName,
    servers: allServers,
    isLoading,
    setSelectedMailServer,
  } = useSelectedMailServerDisplay();
  const { data: session } = useSession();
  const { selectedProject, allProjects } = useSelectedProjectStore();

  const isAdmin = session?.user?.role === Role.ADMIN;
  const currentUserId = session?.user?.id ?? (session?.user as any)?._id;
  const agentServerMenu = useAgentMailServers(
    selectedProject,
    allProjects ?? [],
    currentUserId,
    allServers
  );
  const effectiveServers = isAdmin ? allServers : agentServerMenu;
  const servers = useDeduplicatedServers(effectiveServers);

  const [showMailServerDropdown, setShowMailServerDropdown] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showMailServerBadge = currentView && ADMIN_VIEWS.has(currentView);

  useEffect(() => {
    if (!showMailServerDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        badgeRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setShowMailServerDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMailServerDropdown]);

  return (
    <div className="shrink-0 border-b border-gray-200 p-2">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {/* Left: Checkbox, Title, Count */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {conversationsCount > 0 && (
            <span title={isAllSelected ? 'Deselect all' : 'Select all'}>
              <Checkbox checked={isAllSelected} onChange={() => toggleSelectAll()} className="" />
            </span>
          )}
          <h2 className="truncate text-[0.9317rem] font-semibold text-gray-900">{headerTitle}</h2>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[0.698775rem] text-gray-500">
            {conversationsCount}
          </span>
        </div>

        {/* Center: Search + Advanced Search (centered with space on left/right) */}
        <div className="flex min-w-0 flex-1 basis-0 items-center justify-center">
          <div className="flex w-full max-w-md items-center gap-1.5 px-2">
            <div className="relative min-w-0 flex-1 ">
              <ApolloIcon
                name="search"
                className="pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2 text-gray-400 text-sm"
              />
              <Input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-7 pr-10 text-[0.8152375rem] max-h-7"
                data-email-search
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="absolute top-1/2 right-3 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <ApolloIcon name="cross" className="text-[0.8152375rem]" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              variant="plain"
              onClick={onOpenAdvancedSearch}
              title="Advanced Search"
              className="shrink-0 -mt-1"
              icon={<ApolloIcon name="filter-slider" />}
            />
          </div>
        </div>

        {/* Right: Mail Server, Calendar, DateFilter */}
        <div className="flex shrink-0 items-center gap-0">
          {/* {showMailServerBadge && (
            <div className="relative" ref={badgeRef}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => servers.length > 0 ? setShowMailServerDropdown((v) => !v) : null}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && setShowMailServerDropdown((v) => !v)
                }
                className={`flex max-w-[160px] lg:max-w-[250px] items-center gap-1 truncate rounded-sm px-2 py-0.5 text-sm border border-evergreen/50 cursor-pointer ${selectedMailServerId
                  ? 'bg-evergreen/10 text-evergreen hover:bg-evergreen/20'
                  : 'bg-sand-5 text-sand-1 hover:bg-sand-6'
                  }`}
                title={selectedMailServerId ? selectedMailServerName ?? undefined : 'Click to select mail server'}
              >
                <ApolloIcon name="world" className="shrink-0 text-sm" />
                <span className="min-w-0 truncate select-none">
                  {selectedMailServerId && selectedMailServerName && currentView
                    ? `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} > ${selectedMailServerName}`
                    : selectedMailServerName ?? 'Select Server'}
                </span>
                {servers.length > 0 && (
                  <ApolloIcon
                    name={showMailServerDropdown ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                    className="shrink-0 text-sm"
                  />
                )}
              </div>

              {showMailServerDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 top-full z-[9999] mt-1 max-h-[300px] min-w-[200px] overflow-y-auto rounded-md border border-border bg-white shadow-xl"
                >
                  <div className="py-1">
                    {isLoading ? (
                      <div className="px-4 py-2 text-sm text-sand-2">Loading...</div>
                    ) : (
                      servers.map((server) => {
                        const isActive = selectedMailServerId === server._id;
                        return (
                          <button
                            key={server._id}
                            type="button"
                            onClick={() => {
                              setSelectedMailServer(server._id);
                              setShowMailServerDropdown(false);
                            }}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-evergreen/10 ' : 'text-sand-1 hover:bg-sand-5'
                              }`}
                          >
                            <ApolloIcon
                              name="world"
                              className={`text-sm ${isActive ? 'text-black/70' : 'text-black'}`}
                            />
                            <span className="truncate">{getMailServerDisplayName(server)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )} */}
          <Button
          
            size="sm"
            variant="plain"
            onClick={onOpenCalendarFilter}
            title="Calendar Filter"
            className="shrink-0 cursor-pointer mr-1"
            icon={<ApolloIcon name="calendar" />}
          />
          {dateFilterLabel && (
            <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[0.698775rem] text-blue-700">
              <span>{dateFilterLabel}</span>
              <button
                type="button"
                onClick={onClearDateFilter}
                className="text-blue-600 transition-colors hover:text-blue-800"
                aria-label="Clear date filter"
              >
                <ApolloIcon name="cross" className="text-[0.698775rem]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
