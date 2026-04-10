'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../../Sidebar';
import { Board } from '../../Board';
import { KanbanViewHeader } from '../KanbanViewHeader';
import { KanbanTableView } from '../KanbanTableView';
import { CardDetailsModal } from '../../CardDetailsModal';
import { BoardSelectionGrid } from '../BoardSelectionGrid';
import { Task } from '../../types';
import { useKanban } from '../../_contexts';
import { Role } from '@/configs/navigation.config/auth.route.config';
import RoleGuard from '@/components/shared/RoleGuard';

interface KanbanLayoutProps {
  viewType: 'board' | 'table';
  activeCardId: string | null;
  onViewTypeChange: (view: 'board' | 'table') => void;
  onCardClick: (card: Task) => void;
  onCloseCardModal: () => void;
  getAllCards: () => Task[];
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// Animation variants for view transitions
const viewTransitionVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

const viewTransition = {
  duration: 0.25,
  ease: 'easeInOut' as const,
};

/**
 * Main layout component for Kanban board
 * Handles Sidebar, Board/TableView, BoardSelectionGrid, and CardDetailsModal rendering
 */
export const KanbanLayout: React.FC<KanbanLayoutProps> = ({
  viewType,
  activeCardId,
  onViewTypeChange,
  onCardClick,
  onCloseCardModal,
  getAllCards,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { isBoardSelectionMode } = useKanban();
  return (
    <div className="flex h-full w-full overflow-hidden">

      <Sidebar />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Only show header when not in board selection mode */}
        <AnimatePresence mode="wait">
          {!isBoardSelectionMode && (
            <motion.div
              key="header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <KanbanViewHeader
                viewType={viewType}
                onViewTypeChange={onViewTypeChange}
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated view transitions */}
        <AnimatePresence mode="wait">
          {isBoardSelectionMode ? (
            <motion.div
              key="board-selection"
              className="flex-1 overflow-hidden"
              variants={viewTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={viewTransition}
            >
              <BoardSelectionGrid />
            </motion.div>
          ) : viewType === 'board' ? (
            <motion.div
              key="board-view"
              className="flex-1 overflow-hidden"
              variants={viewTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={viewTransition}
            >
              <Board />
            </motion.div>
          ) : (
            <motion.div
              key="table-view"
              className="flex-1 overflow-hidden"
              variants={viewTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={viewTransition}
            >
              <KanbanTableView cards={getAllCards()} onCardClick={onCardClick} loading={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {activeCardId && <CardDetailsModal taskId={activeCardId} onClose={onCloseCardModal} />}
    </div>
  );
};
