'use client';

import { useEmailStore } from '../../_stores/emailStore';
import ComposeButton from '../Sidebar/ComposeButton';
import FolderList from '../Sidebar/FolderList';
import SyncButton from '../Sidebar/SyncButton';
import FilterSection from '../Sidebar/FilterSection';

interface SidebarProps {
  width: number;
}

export default function Sidebar({ width }: SidebarProps) {
  const { setComposeOpen } = useEmailStore();
  const isCompact = width < 120;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Compose Button */}
      <div className={`space-y-2 ${isCompact ? 'p-2' : 'p-4'}`}>
        <ComposeButton onClick={() => setComposeOpen(true)} isCompact={isCompact} />
        <SyncButton isCompact={isCompact} />
      </div>

      {/* Folders */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'px-1' : 'px-2'}`}>
        <FolderList isCompact={isCompact} />

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        <FilterSection isCompact={isCompact} />
      </div>

      {/* Footer (optional) */}
      {!isCompact && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-[0.698775rem] text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Online</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
