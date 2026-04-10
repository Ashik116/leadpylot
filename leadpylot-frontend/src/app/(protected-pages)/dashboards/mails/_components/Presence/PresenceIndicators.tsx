'use client';

/**
 * PresenceIndicators - Missive-Style
 * Show avatars of users currently viewing the email
 */

import { PresenceUser } from '../../_types/presence.types';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface PresenceIndicatorsProps {
  viewers: PresenceUser[];
}

export default function PresenceIndicators({ viewers }: PresenceIndicatorsProps) {
  if (viewers.length === 0) return null;

  const visibleViewers = viewers.slice(0, 3);
  const hiddenCount = viewers.length - 3;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <ApolloIcon name="eye-filled" className="text-gray-400" />
      
      <span>Viewing now:</span>

      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {visibleViewers.map((viewer, index) => (
          <div
            key={viewer._id}
            className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-300 text-xs font-semibold text-white"
            style={{ zIndex: visibleViewers.length - index }}
            title={viewer.name}
          >
            {viewer.name[0].toUpperCase()}
            
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-green-500" />
          </div>
        ))}

        {hiddenCount > 0 && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-400 text-xs font-semibold text-white"
            title={`${hiddenCount} more`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Names */}
      <span className="text-xs">
        {visibleViewers.map(v => v.name).join(', ')}
        {hiddenCount > 0 && ` and ${hiddenCount} more`}
      </span>
    </div>
  );
}

