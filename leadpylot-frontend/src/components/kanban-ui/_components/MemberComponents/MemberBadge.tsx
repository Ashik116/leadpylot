import React from 'react';
import { Member } from '../../types';

interface MemberBadgeProps {
  member: Member;
  showName?: boolean;
  onClick?: () => void;
  className?: string;
}

const getInitials = (member: Member) => {
  if (member.avatar && member.avatar.trim().length > 0) return member.avatar;
  const parts = member.name.split(' ').filter(Boolean);
  const initials = parts.map((part) => part[0]).join('').slice(0, 2);
  return initials.toUpperCase();
};

export const MemberBadge: React.FC<MemberBadgeProps> = ({
  member,
  showName = true,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border border-ocean-2/50 bg-white px-1.5 py-1 text-xs font-semibold text-black transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
        } ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
        {getInitials(member)}
      </span>
      {showName && <span className="truncate">{member.name}</span>}
    </button>
  );
};
