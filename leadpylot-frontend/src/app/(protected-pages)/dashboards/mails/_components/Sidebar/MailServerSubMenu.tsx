'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import type { MailServerInfo } from '@/services/SettingsService';
import {
  getMailServerDisplayName,
  useSelectedMailServerDisplay,
} from '../../_hooks/useSelectedMailServerDisplay';

interface MailServerSubMenuProps {
  isExpanded: boolean;
  isInboxActive: boolean;
  isCompactDropdown?: boolean;
  onAfterSelect?: () => void;
  /** Override servers list (e.g. for Agent role - agent-specific mail servers only) */
  serversOverride?: MailServerInfo[];
}

export default function MailServerSubMenu({
  isExpanded,
  isInboxActive,
  isCompactDropdown,
  onAfterSelect,
  serversOverride,
}: MailServerSubMenuProps) {
  const { id: selectedMailServerId, servers: hookServers, isLoading, setSelectedMailServer } = useSelectedMailServerDisplay();

  const servers = serversOverride ?? hookServers;

  const handleServerClick = (serverId: string) => {
    setSelectedMailServer(serverId);
    onAfterSelect?.();
  };

  // For compact dropdown mode, render as simple buttons
  if (isCompactDropdown) {
    if (!serversOverride && isLoading) {
      return <div className="px-4 py-2 text-sm text-sand-2">Loading...</div>;
    }

    if (servers.length === 0) {
      return <div className="px-4 py-2 text-sm text-sand-2">No mail servers</div>;
    }

    return (
      <>
        {servers.map((server) => {
          const isActive = selectedMailServerId === server._id;
          return (
            <button
              key={server._id}
              type="button"
              onClick={() => handleServerClick(server._id)}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-evergreen/10 font-medium text-white' : 'text-sand-1 hover:bg-sand-5'
                }`}
            >
              <ApolloIcon
                name="world"
                className={`text-[0.8152375rem] ${isActive ? 'text-white' : 'text-sand-3'}`}
              />
              <span className="truncate">{getMailServerDisplayName(server)}</span>
            </button>
          );
        })}
      </>
    );
  }

  // Normal collapsible mode
  return (
    <div
      className={`mt-0.5 ml-4 space-y-0.5 border-l-2 border-border pl-2 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
    >
      {!serversOverride && isLoading ? (
        <div className="px-3 py-2 text-[0.698775rem] text-sand-2">Loading...</div>
      ) : servers.length === 0 ? (
        <div className="px-3 py-2 text-[0.698775rem] text-sand-2">No mail servers</div>
      ) : (
        servers.map((server) => {
          const isActive = isInboxActive && selectedMailServerId === server._id;
          return (
            <button
              key={server._id}
              onClick={() => handleServerClick(server._id)}
              className={`group flex w-full items-center gap-3 rounded-sm px-1 py-0.5 text-[0.698775rem] font-medium transition-colors ${isActive ? 'bg-evergreen/10 text-evergreen' : ' hover:bg-sand-5'
                }`}
            >
              <ApolloIcon
                name="world"
                className={`text-sm ${isActive ? 'text-evergreen' : 'text-black'}`}
              />
              <span className="truncate">{getMailServerDisplayName(server)}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
