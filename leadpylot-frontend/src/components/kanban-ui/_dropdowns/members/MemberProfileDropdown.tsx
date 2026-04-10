import React from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Member } from '../../types';
import { X } from 'lucide-react';

interface MemberProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  member: Member;
  onRemove: () => void;
  onEditProfile?: () => void;
}

const getInitials = (member: Member) => {
  if (member.avatar && member.avatar.trim().length > 0) return member.avatar;
  const parts = member.name.split(' ').filter(Boolean);
  return parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase();
};

const getUsername = (member: Member) => {
 
  if (member.email) {
    const emailPart = member.email.split('@')[0].toLowerCase();
    return '@' + emailPart;
  }
 
  const username = member.name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return '@' + username;
};

export const MemberProfileDropdown: React.FC<MemberProfileDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  member,
  onRemove,
  onEditProfile,
}) => {
  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={280}
      dropdownHeight={200}
    >
      <div className="rounded-xl overflow-hidden border border-ocean-2/50 bg-gray-800 shadow-xl">
        {/* Blue Header */}
        <div className="bg-indigo-600 px-4 py-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-700 text-sm font-bold text-white">
              {getInitials(member)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-white truncate">{member.name}</div>
              <div className="text-sm text-white/80 truncate">{getUsername(member)}</div>
            </div>
          </div>
        </div>

        {/* Dark Gray Panel */}
        <div className="bg-gray-800">
          <button
            onClick={() => {
              onEditProfile?.();
              onClose();
            }}
            className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors"
          >
            Edit profile info
          </button>
          <div className="border-t border-gray-700"></div>
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors"
          >
            Remove from card
          </button>
        </div>
      </div>
    </SmartDropdown>
  );
};
