'use client';

import React, { useEffect, useRef, useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Plus, ChevronDown, X } from 'lucide-react';
import { BoardDropdownItem } from './BoardDropdownItem';
import type { Board } from '@/services/BoardService';

interface BoardOption {
  value: string;
  label: string;
  board: Board;
}

interface BoardDropdownProps {
  currentLabel: string;
  boardOptions: BoardOption[];
  selectedBoardId: string | null;
  isLoading: boolean;
  onBoardSelect: (boardId: string) => void;
  onCreateBoard: (payload: { name: string; description?: string; onlyMe: boolean }) => Promise<void>;
  isCreatingBoard?: boolean;
  onUpdateBoard: (payload: {
    id: string;
    name: string;
    description?: string;
    onlyMe: boolean;
  }) => Promise<void>;
  isUpdatingBoard?: boolean;
  updatingBoardId?: string | null;
  onDeleteBoard: (boardId: string) => void;
  deletingBoardId?: string | null;
  totalBoardTaskCount?: number;
}

export const BoardDropdown: React.FC<BoardDropdownProps> = ({
  currentLabel,
  boardOptions,
  selectedBoardId,
  isLoading,
  onBoardSelect,
  onCreateBoard,
  isCreatingBoard = false,
  onUpdateBoard,
  isUpdatingBoard = false,
  updatingBoardId = null,
  onDeleteBoard,
  deletingBoardId = null,
  totalBoardTaskCount,
}) => {
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');
  const [description, setDescription] = useState('');
  const [onlyMe, setOnlyMe] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panelMode) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [panelMode]);

  const handleSubmit = async () => {
    const name = boardName.trim();
    if (!name) return;

    if (panelMode === 'create') {
      if (isCreatingBoard) return;
      await onCreateBoard({
        name,
        description: description.trim() || undefined,
        onlyMe,
      });
    } else if (panelMode === 'edit' && editingBoardId) {
      if (isUpdatingBoard) return;
      await onUpdateBoard({
        id: editingBoardId,
        name,
        description: description.trim() || undefined,
        onlyMe,
      });
    }

    setBoardName('');
    setDescription('');
    setOnlyMe(false);
    setEditingBoardId(null);
    setPanelMode(null);
  };

  const handleCancel = () => {
    if (isCreatingBoard || isUpdatingBoard) return;
    setBoardName('');
    setDescription('');
    setOnlyMe(false);
    setEditingBoardId(null);
    setPanelMode(null);
  };

  const isSubmitting = panelMode === 'edit' ? isUpdatingBoard : isCreatingBoard;

  const startCreate = () => {
    setBoardName('');
    setDescription('');
    setOnlyMe(false);
    setEditingBoardId(null);
    setPanelMode('create');
  };

  const startEdit = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoardName(board.name || '');
    setDescription((board as any).description || '');
    setOnlyMe(!!(board as any).onlyMe);
    setEditingBoardId(board._id);
    setPanelMode('edit');
  };

  return (
    <Dropdown
      title={currentLabel}
      menuClass="w-[320px] max-w-[calc(100vw-24px)] p-0"
      renderTitle={
        <div className="border-ocean-2/30 hover:border-ocean-2/50 group flex max-w-[200px] sm:max-w-[250px] items-center gap-2 rounded-lg border bg-white px-2.5 py-1 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm">
          <span className="truncate flex-1 min-w-0">{currentLabel}</span>
          {totalBoardTaskCount !== undefined && totalBoardTaskCount > 0 && (
            <span className="size-5 flex items-center justify-center text-xxs bg-indigo-500 rounded-full text-white">
              {totalBoardTaskCount > 99 ? '99+' : totalBoardTaskCount}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-gray-500 transition-transform duration-200 group-hover:text-gray-700" />
        </div>
      }
    >
      {/* Add Board (inline form like task create) */}
      <li className="px-1.5 py-1">
        {panelMode ? (
          <div
            className="space-y-1.5 rounded-md border border-gray-200 bg-white p-1.5"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDownCapture={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              placeholder={panelMode === 'edit' ? 'Update board name...' : 'Enter board name...'}
              disabled={isSubmitting}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancel();
                }
              }}
              placeholder="Enter board description (optional)"
              disabled={isSubmitting}
              rows={2}
              className="w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={onlyMe}
                onChange={(e) => setOnlyMe(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-gray-300"
                disabled={isSubmitting}
              />
              Private board
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting || !boardName.trim()}
                onClick={() => void handleSubmit()}
                className="rounded-md bg-[#F0E502] px-2.5 py-0.5 text-xs font-medium text-gray-900 transition-colors hover:bg-[#e0d502] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : panelMode === 'edit' ? 'Update Board' : 'Add Board'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cancel board form"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCreate}
            className="flex w-full items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-left text-xs text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="leading-tight">Add board</span>
          </button>
        )}
      </li>

      {/* Divider between create section and board list */}
      {boardOptions.length > 0 && <div className="mx-1.5 my-2 border-t-2 border-gray-300" />}

      {/* Loading State */}
      {isLoading && (
        <Dropdown.Item eventKey="loading" disabled>
          <span className="text-xs text-gray-500">Loading boards...</span>
        </Dropdown.Item>
      )}

      {/* Empty State */}
      {!isLoading && boardOptions.length === 0 && (
        <Dropdown.Item eventKey="no-boards" disabled>
          <span className="text-xs text-gray-500">No boards available</span>
        </Dropdown.Item>
      )}

      {/* Board List */}
      {!isLoading &&
        boardOptions.map((option) => (
          <BoardDropdownItem
            key={option.value}
            boardId={option.value}
            boardName={option.label}
            board={option.board}
            isSelected={selectedBoardId === option.value}
            isEditing={panelMode === 'edit' && editingBoardId === option.value}
            onSelect={onBoardSelect}
            onEdit={startEdit}
            onDelete={onDeleteBoard}
            isDeleting={deletingBoardId === option.value}
          />
        ))}
    </Dropdown>
  );
};
