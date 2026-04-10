'use client';

/**
 * MentionAutocomplete - Missive-Style
 * Autocomplete dropdown for @mentions
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import AxiosBase from '@/services/axios/AxiosBase';

const FALLBACK_TEAM_MEMBERS: MentionUser[] = [
  { _id: 'fallback-1', name: 'Tom Chen', login: 'tom', avatar: null },
  { _id: 'fallback-2', name: 'Sarah Martinez', login: 'sarah', avatar: null },
  { _id: 'fallback-3', name: 'Jane Doe', login: 'jane', avatar: null },
  { _id: 'fallback-4', name: 'Elvis Presley', login: 'elvis', avatar: null },
];

export interface MentionUser {
  _id: string;
  name: string;
  login: string;
  avatar: string | null;
}

interface MentionAutocompleteProps {
  query: string;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  showAbove?: boolean; // New prop to control animation direction
}

async function fetchAgents(): Promise<MentionUser[]> {
  const response = await AxiosBase.get('/users/agents', { params: { limit: 1000 } });
  const agents = Array.isArray(response?.data?.data) ? response.data.data : [];

  const normalizedAgents: MentionUser[] = agents
    .map((agent: any) => ({
      _id: agent._id,
      name: agent.name || agent.full_name || agent.login || agent.email || 'Unnamed teammate',
      login: agent.login || agent.username || agent.email || '',
      avatar: agent.avatar || agent.profile_image || null,
    }))
    .filter((agent: MentionUser) => agent._id && agent.login);

  return normalizedAgents.length > 0 ? normalizedAgents : FALLBACK_TEAM_MEMBERS;
}

export default function MentionAutocomplete({
  query,
  onSelect,
  onClose,
  showAbove = false,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    data: teamMembers = FALLBACK_TEAM_MEMBERS,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['agents', 'mention-autocomplete'],
    queryFn: fetchAgents,
    // 5 minutes
    retry: 1,
  });

  const filteredUsers = useMemo(() => {
    const source = teamMembers || [];
    if (!query.trim()) {
      return source;
    }

    const lowered = query.toLowerCase();
    return source.filter(
      (user) =>
        user.login.toLowerCase().includes(lowered) || user.name.toLowerCase().includes(lowered)
    );
  }, [teamMembers, query]);

  const clampedSelectedIndex = useMemo(() => {
    if (filteredUsers.length === 0) {
      return 0;
    }
    return Math.min(Math.max(selectedIndex, 0), filteredUsers.length - 1);
  }, [filteredUsers, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentIndex = Math.min(
        Math.max(selectedIndex, 0),
        Math.max(filteredUsers.length - 1, 0)
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(Math.max(prev, 0) + 1, Math.max(filteredUsers.length - 1, 0))
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(Math.min(prev, filteredUsers.length - 1) - 1, 0));
      } else if (e.key === 'Enter' && filteredUsers[currentIndex]) {
        e.preventDefault();
        onSelect(filteredUsers[currentIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredUsers, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [handleKeyDown]);

  // Dynamic animation class based on position
  const animationClass = showAbove
    ? 'animate-in fade-in slide-in-from-bottom-2' // Slide up from bottom when shown above
    : 'animate-in fade-in slide-in-from-top-2'; // Slide down from top when shown below

  if (isLoading) {
    return (
      <div
        className={`${animationClass} rounded-lg border-2 border-blue-300 bg-white px-4 py-3 text-sm text-blue-700 shadow-2xl duration-200`}
      >
        Loading teammates…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`${animationClass} rounded-lg border-2 border-red-300 bg-white px-4 py-3 text-sm text-red-600 shadow-2xl duration-200`}
      >
        Unable to load teammates. Please try again later.
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div
        className={`${animationClass} rounded-lg border-2 border-blue-200 bg-white px-4 py-3 text-sm text-blue-700 shadow-2xl duration-200`}
      >
        No teammates found for "{query}".
      </div>
    );
  }

  return (
    <div
      className={`${animationClass} overflow-hidden rounded-lg border-2 border-blue-400 bg-white shadow-2xl duration-200`}
    >
      <div className="max-h-60 overflow-y-auto">
        {filteredUsers.map((user, index) => (
          <button
            key={user._id}
            onClick={() => onSelect(user)}
            className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
              index === clampedSelectedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
            } `}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-white">
              {user.name[0].toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">@{user.login}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Helper text */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
        Use <kbd className="rounded bg-gray-200 px-1">↑</kbd>{' '}
        <kbd className="rounded bg-gray-200 px-1">↓</kbd> to navigate,{' '}
        <kbd className="rounded bg-gray-200 px-1">Enter</kbd> to select
      </div>
    </div>
  );
}
