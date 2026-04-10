'use client';

/**
 * CollisionWarning - Missive-Style
 * Warning banner when multiple users are replying to the same email
 */

import { PresenceUser } from '../../_types/presence.types';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';

interface CollisionWarningProps {
  users: PresenceUser[];
}

export default function CollisionWarning({ users }: CollisionWarningProps) {
  if (users.length === 0) return null;

  const userName = users[0].name;
  const otherCount = users.length - 1;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Warning Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200">
            <ApolloIcon name="alert-triangle" className="text-amber-700" />
          </div>

          {/* Message */}
          <div>
            <div className="text-sm font-medium text-amber-900">
              {userName} is currently replying to this email
              {otherCount > 0 && ` and ${otherCount} other${otherCount > 1 ? 's' : ''}`}
            </div>
            <div className="text-xs text-amber-700">
              To avoid sending duplicate replies, coordinate with your team
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="plain"
            className="text-amber-700 hover:bg-amber-100"
          >
            View Draft
          </Button>
        </div>
      </div>
    </div>
  );
}

