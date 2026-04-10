'use client';
import '@/components/kanban-ui/kanban-theme.css';
import { KanbanContainer } from '@/components/kanban-ui/KanbanContainer';
import { BoardData, Task } from '@/components/kanban-ui/types';
import { useEffect, useState } from 'react';

const KANBAN_THEME_KEY = 'kanban-theme';

function getInitialKanbanDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KANBAN_THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}
// test commit 

// Empty initial data - will be loaded from API
const emptyBoardData: BoardData = {
  cards: {},
  columns: {},
  columnOrder: [],
};

const emptyInboxCards: Task[] = [];

export default function KanbanPage() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialKanbanDarkMode);

  useEffect(() => {
    const body = document.body;
    body.classList.add('kanban-theme');
    if (isDarkMode) body.classList.add('kanban-dark');
    else body.classList.remove('kanban-dark');
    return () => {
      body.classList.remove('kanban-theme');
      body.classList.remove('kanban-dark');
    };
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KANBAN_THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className={`kanban-scope h-full w-full ${isDarkMode ? 'kanban-dark' : ''}`}>
      <KanbanContainer
        initialBoardData={emptyBoardData}
        initialInboxCards={emptyInboxCards}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleTheme}
      />
    </div>
  );
}
