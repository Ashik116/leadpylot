import React, { useRef, useState, useEffect } from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '../../types';
import { MemberBadge } from '../MemberComponents';
import { UnifiedMemberAssignment } from '../MemberComponents/UnifiedMemberAssignment';
import { MemberProfileDropdown } from '../../_dropdowns/members/MemberProfileDropdown';
import { getMembersByIds } from '../../_data/members-data';
import { Plus } from 'lucide-react';

interface InlineMemberFieldProps {
  fieldDefinition: CustomFieldDefinition;
  fieldValue: CustomFieldValue;
  onUpdate: (value: string | string[]) => void;
  taskId: string;
  hideLabel?: boolean;
}

export const InlineMemberField: React.FC<InlineMemberFieldProps> = ({
  fieldDefinition,
  fieldValue,
  onUpdate,
  taskId,
  hideLabel = false,
}) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const memberBadgeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedMemberIds = Array.isArray(fieldValue.value)
    ? fieldValue.value
    : fieldValue.value
      ? [fieldValue.value]
      : [];
  const selectedMembers = getMembersByIds(selectedMemberIds);

  const handleToggleMember = (memberId: string) => {
    const newValue = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id: string) => id !== memberId)
      : [...selectedMemberIds, memberId];
    const finalValue = newValue.length === 1 ? newValue[0] : newValue;
    onUpdate(finalValue);
  };

  const handleMemberClick = (memberId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setSelectedMemberForProfile(memberId);
    setProfileDropdownOpen(true);
  };

  const handleRemoveMember = () => {
    if (selectedMemberForProfile) {
      handleToggleMember(selectedMemberForProfile);
      setSelectedMemberForProfile(null);
    }
  };

  const selectedMember = selectedMemberForProfile
    ? selectedMembers.find(m => m.id === selectedMemberForProfile)
    : null;

  const memberProfileTriggerRef = useRef<HTMLElement | null>(null);

  // Update trigger ref when selected member changes
  useEffect(() => {
    if (selectedMemberForProfile && memberBadgeRefs.current[selectedMemberForProfile]) {
      memberProfileTriggerRef.current = memberBadgeRefs.current[selectedMemberForProfile];
    } else {
      memberProfileTriggerRef.current = fieldRef.current;
    }
  }, [selectedMemberForProfile]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" ref={fieldRef}>
        {!hideLabel && (
          <span
            onClick={() => setMembersDropdownOpen(true)}
            className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-black transition-colors"
          >
            {fieldDefinition.title || 'Untitled'}
          </span>
        )}
        <button
          onClick={() => setMembersDropdownOpen(true)}
          className="flex h-6 w-6 items-center justify-center rounded-lg border border-ocean-2/50 bg-white text-gray-500 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
          title="Add member"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {selectedMembers.map((member) => (
            <button
              key={member.id}
              ref={(el) => {
                memberBadgeRefs.current[member.id] = el;
              }}
              type="button"
              onClick={(e) => handleMemberClick(member.id, e)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xxs font-bold text-white transition-all hover:ring-2 hover:ring-indigo-300 hover:ring-offset-2 cursor-pointer active:scale-95"
              title={member.name}
            >
              {member.avatar && member.avatar.trim().length > 0
                ? member.avatar
                : member.name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <UnifiedMemberAssignment
        isOpen={membersDropdownOpen}
        onClose={() => setMembersDropdownOpen(false)}
        triggerRef={fieldRef as React.RefObject<HTMLElement>}
        context="task"
        taskId={taskId}
        assignedMemberIds={selectedMemberIds}
        onAssign={(memberIds) => {
          const finalValue = memberIds.length === 1 ? memberIds[0] : memberIds;
          onUpdate(finalValue);
        }}
        title="Assign"
      />
      {selectedMember && (
        <MemberProfileDropdown
          isOpen={profileDropdownOpen}
          onClose={() => {
            setProfileDropdownOpen(false);
            setSelectedMemberForProfile(null);
          }}
          triggerRef={memberProfileTriggerRef as React.RefObject<HTMLElement>}
          member={selectedMember}
          onRemove={handleRemoveMember}
        />
      )}
    </>
  );
};
