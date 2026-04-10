import { useState, useCallback, useMemo } from 'react';
import { Member } from '../types';
import { getMembers, getMembersByIds, searchMembers } from '../_data/members-data';

interface UseMembersOptions {
  initialMembers?: string[];
  onUpdate?: (members: string[]) => void;
}

export const useMembers = (options?: UseMembersOptions) => {
  const [members] = useState<Member[]>(getMembers());
  const [searchQuery, setSearchQuery] = useState('');
  const [cardMembers, setCardMembers] = useState<string[]>(options?.initialMembers || []);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    return searchMembers(searchQuery);
  }, [members, searchQuery]);

  const getMembersForCard = useCallback((memberIds: string[]) => {
    return getMembersByIds(memberIds);
  }, []);

  const toggleMemberOnCard = useCallback((currentMemberIds: string[], memberId: string) => {
    if (currentMemberIds.includes(memberId)) {
      return currentMemberIds.filter((id) => id !== memberId);
    }
    return [...currentMemberIds, memberId];
  }, []);

  const updateCardMembers = useCallback(
    (newMembers: string[]) => {
      setCardMembers(newMembers);
      options?.onUpdate?.(newMembers);
    },
    [options]
  );

  const syncMembers = useCallback((memberIds?: string[]) => {
    setCardMembers(memberIds || []);
  }, []);

  return {
    members,
    filteredMembers,
    searchQuery,
    setSearchQuery,
    cardMembers,
    updateCardMembers,
    toggleMemberOnCard,
    getMembersForCard,
    syncMembers,
  };
};
