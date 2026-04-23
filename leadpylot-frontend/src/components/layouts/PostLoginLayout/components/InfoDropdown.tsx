'use client';

import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dropdown from '@/components/ui/Dropdown';
import Switcher from '@/components/ui/Switcher';
import useTheme from '@/utils/hooks/useTheme';
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant';
import type { Mode } from '@/@types/theme';

const INFO_ITEMS = ['Test', 'Panda', 'Rasin', 'Alianz'];

const InfoDropdown = () => {
  const [search, setSearch] = useState('');
  const { mode, setMode } = useTheme((s) => s);
  const isDark = mode === MODE_DARK;

  const handleModeToggle = () => {
    const nextMode: Mode = isDark ? MODE_LIGHT : MODE_DARK;
    setMode(nextMode);
  };

  const filtered = useMemo(
    () =>
      INFO_ITEMS.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <Dropdown
      trigger="click"
      placement="bottom-end"
      menuClass="p-0"
      renderTitle={
        <Button
          variant="plain"
          size="sm"
          icon={<ApolloIcon name="info-circle" className="text-lg" />}
          className="px-2 border-none shadow-none"
          
        >
          Info
        </Button>
      }
    >
      {/* Dark / Light mode toggle */}
      <div
        className="flex items-center justify-between gap-3 px-2 py-1 border-b border-gray-100"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-[var(--dm-text-secondary)]">
          <ApolloIcon
            name={isDark ? 'moon' : 'sun'}
            className="text-base text-gray-500 dark:text-[var(--dm-text-muted)]"
          />
          <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
        </div>
        <Switcher
          checked={isDark}
          onChange={handleModeToggle}
        />
      </div>

      {/* Search box */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-[var(--dm-border)] dark:bg-[var(--dm-bg-input)]">
          <ApolloIcon name="search" className="shrink-0 text-sm text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="w-full min-w-[160px] bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-[var(--dm-text-primary)] dark:placeholder:text-[var(--dm-text-muted)]"
          />
        </div>
      </div>

      {/* List items */}
      <div className="py-1">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <Dropdown.Item
              key={item}
              eventKey={item}
              className="min-w-[180px] rounded-md border-none px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-[var(--dm-bg-hover)]"
              variant="custom"
            >
              <span className="text-sm text-gray-700 dark:text-[var(--dm-text-primary)]">{item}</span>
            </Dropdown.Item>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
        )}
      </div>
    </Dropdown>
  );
};

export default InfoDropdown;
