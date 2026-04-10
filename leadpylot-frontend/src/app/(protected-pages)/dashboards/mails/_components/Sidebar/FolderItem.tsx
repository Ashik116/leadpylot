'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import { EmailFolder } from '../../_types/email.types';

interface FolderItemProps {
  folder: Pick<EmailFolder, 'id' | 'name' | 'icon' | 'count' | 'unread_count'>;
  isActive: boolean;
  isCompact?: boolean;
  onClick: () => void;
}

export default function FolderItem({ folder, isActive, isCompact, onClick }: FolderItemProps) {
  // Compact mode - icon only with tooltip
  if (isCompact) {
    return (
      <Tooltip title={folder.name} placement="right">
        <button
          onClick={onClick}
          className={`
            group flex w-full items-center justify-center rounded-md p-2 relative
            transition-colors
            ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
          `}
        >
          <ApolloIcon
            name={folder.icon as any}
            className={`text-[1.164625rem] ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
              }`}
          />
          {folder.unread_count > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.582075rem] font-semibold text-white">
              {folder.unread_count > 9 ? '9+' : folder.unread_count}
            </span>
          )}
        </button>
      </Tooltip>
    );
  }

  // Normal mode
  return (
    <button
      onClick={onClick}
      className={`
        group flex w-full items-center justify-between rounded-md px-3 py-1
        text-[0.8152375rem] font-medium transition-colors
        ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
      `}
    >
      <div className="flex items-center gap-3">
        <ApolloIcon
          name={folder.icon as any}
          className={`text-[0.9317rem] ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`}
        />
        <span>{folder.name}</span>
      </div>

      {folder.unread_count > 0 && (
        <span
          className={`
            flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5
            text-[0.698775rem] font-semibold
            ${isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}
          `}
        >
          {folder.unread_count}
        </span>
      )}
    </button>
  );
}

