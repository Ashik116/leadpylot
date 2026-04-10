import React, { useMemo } from 'react';
import Avatar from '@/components/ui/Avatar';
import Tooltip from '@/components/ui/Tooltip';
import { getAgentColor } from '@/utils/utils';
import { AddMemberButton } from './AddMemberButton';

export interface Member {
  id: string;
  name: string;
  login?: string;
  email?: string;
}

interface MemberAvatarGroupProps {
  members: Member[];
  maxCount?: number;
  size?: number | 'sm' | 'md' | 'lg';
  onOmittedAvatarClick?: () => void;
  className?: string;
}

/**
 * Convert text color class to background color class
 * e.g., 'text-red-500' -> 'bg-red-500'
 */
const textColorToBgColor = (textColorClass: string): string => {
  return textColorClass.replace('text-', 'bg-');
};

/**
 * Get avatar background color for a member based on their name
 * Uses the same logic as getAgentColor but converts to background color
 */
const getAvatarBackgroundColor = (memberName: string): string => {
  try {
    if (!memberName || typeof memberName !== 'string') {
      return 'bg-gray-500';
    }

    // Use getAgentColor to get the text color class
    const textColorClass = getAgentColor(memberName);

    // Convert to background color class
    return textColorToBgColor(textColorClass);
  } catch {
    return 'bg-gray-500';
  }
};

export const MemberAvatarGroup: React.FC<MemberAvatarGroupProps> = ({
  members,
  maxCount = 5,
  size = 28,
  onOmittedAvatarClick,
  className = '',
}) => {
  // Pre-compute colors for all members (must be before early return)
  // Use member name (or login) for consistent color; use id when name is a placeholder so we don't get black/gray
  const memberColors = useMemo(() => {
    const isPlaceholder = (s: string) => !s || s === '…' || s === '?' || s.trim() === '';
    return members.reduce((acc, member) => {
      const displayName = member.name || member.login || member.id;
      const colorKey = isPlaceholder(String(displayName || '')) ? member.id : displayName;
      acc[member.id] = getAvatarBackgroundColor(colorKey);
      return acc;
    }, {} as Record<string, string>);
  }, [members]);

  if (members.length === 0) return null;

  return (
    <div className={`flex items-center ${className}`}>
      <Avatar.Group
        chained
        maxCount={maxCount}
        omittedAvatarTooltip
        omittedAvatarProps={{
          size,
          shape: 'circle',
          className: 'bg-gray-400 text-white',
        }}
      >
        {members.map((member) => {
          const displayName = member.name || member.login || member.id || '?';
          const initial = (displayName && String(displayName).charAt(0)) || '?';
          return (
            <Tooltip key={member.id} title={member.name || member.login || member.id || 'Unknown'}>
              <Avatar
                size={size}
                shape="circle"
                className={`${memberColors[member.id]} text-white`}
              >
                {initial.toUpperCase()}
              </Avatar>
            </Tooltip>
          );
        })}
      </Avatar.Group>

      {/* Additional "+" button at the end to open member list */}
      <AddMemberButton
        onClick={onOmittedAvatarClick}
        size={size}
        tooltip="Manage members"
      />
    </div>
  );
};
