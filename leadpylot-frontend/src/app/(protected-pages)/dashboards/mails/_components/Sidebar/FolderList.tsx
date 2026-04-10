'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import { useCallback, useEffect, useRef, useState } from 'react';
import { updateUrlHash } from '../../_hooks/useUrlSync';
import { useAgentMailServers } from '../../_hooks/useAgentMailServers';
import { useSelectedMailServerDisplay } from '../../_hooks/useSelectedMailServerDisplay';
import { useEmailStore } from '../../_stores/emailStore';
import FolderItem from './FolderItem';
import MailServerSubMenu from './MailServerSubMenu';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import type { MailServerInfo } from '@/services/SettingsService';


const SYSTEM_FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: 'mail-download-colored' },
  { id: 'sent', name: 'Sent', icon: 'sequence' },
  { id: 'drafts', name: 'Drafts', icon: 'file' },
  { id: 'starred', name: 'Starred', icon: 'star-empty' },
  // { id: 'snoozed', name: 'Snoozed', icon: 'clock-eight' },
  { id: 'all', name: 'All Mail', icon: 'mail' },
  // { id: 'trash', name: 'Archive', icon: 'trash' },
] as const;

type FolderId = (typeof SYSTEM_FOLDERS)[number]['id'] | 'pending';

const ADMIN_FOLDERS = new Set<FolderId>(['inbox', 'sent']);

interface FolderListProps {
  isCompact?: boolean;
}

export default function FolderList({ isCompact }: FolderListProps) {
  const { currentView, selectConversation, setCurrentView, setFilters } = useEmailStore();
  const { selectedProject, allProjects } = useSelectedProjectStore();
  const { servers: allServers, setSelectedMailServer } = useSelectedMailServerDisplay();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState<Record<'inbox' | 'sent', boolean>>({
    inbox: false,
    sent: false,
  });
  const prevProjectIdRef = useRef<string | undefined>(selectedProject?._id ?? selectedProject?.value ?? undefined);

  const isAdmin = session?.user?.role === Role.ADMIN;
  const currentUserId = session?.user?.id ?? (session?.user as any)?._id;
  const agentServerMenu = useAgentMailServers(
    selectedProject,
    allProjects ?? [],
    currentUserId,
    allServers
  );
  const hasMailServerSubMenu =
    isAdmin || (Array.isArray(agentServerMenu) && agentServerMenu.length > 0);
  const effectiveServers = isAdmin ? allServers : agentServerMenu;
  const hasSingleServer = effectiveServers.length === 1;
  const firstServer = hasSingleServer ? effectiveServers[0] : null;
  const hasMultipleServersForSubmenu = effectiveServers.length > 1;

  // Auto-select first server when on inbox/sent with 1 server and no selection
  useEffect(() => {
    if (!currentView || !ADMIN_FOLDERS.has(currentView as FolderId)) return;
    if (effectiveServers.length !== 1) return;
    const currentFilters = useEmailStore.getState().filters;
    if (currentFilters.mailserver_id) return;
    setSelectedMailServer(effectiveServers[0]._id);
  }, [currentView, effectiveServers, setSelectedMailServer]);

  // Clear mailserver_id when project changes so view resets to "All Inbox" / "All Sent"
  useEffect(() => {
    const currentProjectId = selectedProject?._id ?? selectedProject?.value;
    if (prevProjectIdRef.current !== currentProjectId) {
      const currentFilters = useEmailStore.getState().filters;
      setFilters({ ...currentFilters, mailserver_id: undefined });
      prevProjectIdRef.current = currentProjectId;
    }
  }, [selectedProject, setFilters]);

  const toggleExpanded = useCallback((folder: 'inbox' | 'sent') => {
    setExpanded((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }, []);

  const handleFolderClick = useCallback(
    (folderId: FolderId, mailserverId?: string, clearFilter = false) => {
      selectConversation(null);
      // If clearFilter is true or mailserverId is explicitly undefined for admin folders, clear the filter
      const extraFilters = clearFilter || (ADMIN_FOLDERS.has(folderId) && mailserverId === undefined)
        ? { mailserver_id: undefined }
        : mailserverId
          ? { mailserver_id: mailserverId }
          : undefined;
      setCurrentView(folderId as any, extraFilters);
      updateUrlHash(folderId as any);
    },
    [selectConversation, setCurrentView]
  );

  return (
    <div>
      {!isCompact && (
        <div className="mb-2 px-2 text-[0.698775rem] font-semibold tracking-wide text-gray-500 uppercase">
          Folders
        </div>
      )}

      <div className="space-y-0.5">
        {SYSTEM_FOLDERS.map((folder) =>
          ADMIN_FOLDERS.has(folder.id as FolderId) ? (
            <AdminFolder
              key={folder.id}
              folder={folder}
              isAdmin={isAdmin}
              isActive={currentView === folder.id}
              expanded={expanded[folder.id as 'inbox' | 'sent']}
              currentView={currentView}
              isCompact={isCompact}
              agentServerMenu={agentServerMenu}
              hasMailServerSubMenu={hasMailServerSubMenu}
              hasSingleServer={hasSingleServer}
              hasMultipleServersForSubmenu={hasMultipleServersForSubmenu}
              onToggle={() => {
                if (hasSingleServer && firstServer) {
                  handleFolderClick(folder.id as FolderId, firstServer._id, false);
                } else {
                  handleFolderClick(folder.id as FolderId, undefined, true);
                  if (hasMailServerSubMenu) toggleExpanded(folder.id as 'inbox' | 'sent');
                }
              }}
            />
          ) : (
            <FolderItem
              key={folder.id}
              folder={folder as any}
              isActive={currentView === folder.id}
              isCompact={isCompact}
              onClick={() => handleFolderClick(folder.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

type AdminFolderProps = {
  folder: (typeof SYSTEM_FOLDERS)[number];
  isAdmin?: boolean;
  isActive: boolean;
  expanded: boolean;
  currentView: string | null;
  isCompact?: boolean;
  agentServerMenu: MailServerInfo[];
  hasMailServerSubMenu: boolean;
  hasSingleServer: boolean;
  hasMultipleServersForSubmenu: boolean;
  onToggle: () => void;
};

function AdminFolder({
  folder,
  isAdmin,
  isActive,
  expanded,
  currentView,
  isCompact,
  agentServerMenu,
  hasMailServerSubMenu,
  hasSingleServer,
  hasMultipleServersForSubmenu,
  onToggle,
}: AdminFolderProps) {
  const { id: selectedMailServerId, name: selectedMailServerName } =
    useSelectedMailServerDisplay();

  const [showServerMenu, setShowServerMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showServerMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the menu or the button
      if (
        (buttonRef.current && buttonRef.current.contains(e.target as Node)) ||
        (menuRef.current && menuRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setShowServerMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showServerMenu]);

  const displayName =
    isActive && selectedMailServerId && selectedMailServerName
      ? `${folder.name} > ${selectedMailServerName}`
      : folder.name;

  const serverMenu = isAdmin ? undefined : agentServerMenu;

  // Compact mode with toggle behavior for admin, or agent with mail servers
  if (isCompact && hasMailServerSubMenu) {
    const handleClick = () => {
      if (hasSingleServer) {
        onToggle();
      } else if (isActive) {
        setShowServerMenu(!showServerMenu);
      } else {
        setShowServerMenu(false);
        onToggle();
      }
    };

    return (
      <div className="relative">
        <Tooltip title={displayName} placement="right">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleClick}
            className={` group flex w-full items-center justify-center rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <ApolloIcon
              name={folder.icon as any}
              className={`text-[1.164625rem] ${isActive ? 'text-white' : 'text-white group-hover:text-gray-700'
                }`}
            />
          </button>
        </Tooltip>

        {/* Mail server dropdown menu - only when multiple servers */}
        {showServerMenu && hasMultipleServersForSubmenu && (
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[220px] rounded-md bg-white shadow-xl border border-gray-200"
            style={{
              // eslint-disable-next-line react-hooks/refs
              left: `${(buttonRef.current?.getBoundingClientRect().right ?? 0) + 8}px`,
              // eslint-disable-next-line react-hooks/refs
              top: `${buttonRef.current?.getBoundingClientRect().top ?? 0}px`,
            }}
          >
            <div className="py-1 max-h-[400px] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onToggle();
                  setShowServerMenu(false);
                }}
                className={` flex w-full items-center gap-2 px-4  py-2 text-sm transition-colors ${!selectedMailServerId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <ApolloIcon name={folder.icon as any} className="text-[0.9317rem]" />
                <span>All {folder.name}</span>
              </button>
              <div className="my-1 border-t border-gray-200" />
              <MailServerSubMenu
                isExpanded={true}
                isInboxActive={currentView === folder.id}
                isCompactDropdown={true}
                onAfterSelect={() => setShowServerMenu(false)}
                serversOverride={serverMenu}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact mode without admin (icon only)
  if (isCompact) {
    return (
      <Tooltip title={folder.name} placement="right">
        <button
          type="button"
          onClick={onToggle}
          className={`group flex w-full items-center justify-center rounded-md p-2 transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          <ApolloIcon
            name={folder.icon as any}
            className={`text-[1.164625rem] ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
              }`}
          />
        </button>
      </Tooltip>
    );
  }

  // Normal mode
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`group min-h-6.5 flex w-full items-center justify-between rounded-md px-3 text-[0.8152375rem] font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        <div className="flex items-center gap-3">
          <ApolloIcon
            name={folder.icon as any}
            className={`text-[0.9317rem] ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`}
          />
          <span className="truncate whitespace-nowrap">{displayName}</span>
        </div>
        {hasMultipleServersForSubmenu && (
          <ApolloIcon
            name={expanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
            className={`transition-transform duration-200 text-[1.164625rem] ${isActive ? 'text-white' : 'text-gray-400'}`}
          />
        )}
      </button>

      {hasMultipleServersForSubmenu && (
        <MailServerSubMenu
          isExpanded={expanded}
          isInboxActive={currentView === folder.id}
          serversOverride={serverMenu}
        />
      )}
    </div>
  );
}

