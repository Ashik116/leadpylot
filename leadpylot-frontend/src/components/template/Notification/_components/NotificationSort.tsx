'use client';

import React from 'react';
import FloatingSelect from './FloatingSelect';

export type SortOption = 'newest' | 'oldest' | 'unread';

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest' },
  { value: 'oldest' as const, label: 'Oldest' },
  { value: 'unread' as const, label: 'Unread first' },
];

interface NotificationSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  portalRoot?: HTMLElement | null;
}

const NotificationSort: React.FC<NotificationSortProps> = ({ value, onChange, portalRoot }) => (
  <FloatingSelect<SortOption>
    value={value}
    options={SORT_OPTIONS}
    onChange={onChange}
    ariaLabel="Sort notifications"
    listLabel="Sort by"
    fallbackLabel="Newest"
    portalRoot={portalRoot}
  />
);

export default NotificationSort;
