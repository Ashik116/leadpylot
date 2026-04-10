'use client';

import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Pencil, Trash2 } from 'lucide-react';
import type { Board } from '@/services/BoardService';
import classNames from '@/utils/classNames';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface BoardDropdownItemProps {
  boardId: string;
  boardName: string;
  board: Board;
  isSelected: boolean;
  isEditing?: boolean;
  onSelect: (boardId: string) => void;
  onEdit: (board: Board, e: React.MouseEvent) => void;
  onDelete: (boardId: string) => void;
  isDeleting?: boolean;
}

export const BoardDropdownItem: React.FC<BoardDropdownItemProps> = ({
  boardId,
  boardName,
  board,
  isSelected,
  isEditing = false,
  onSelect,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const isSystemBoard = (board as any).is_system === true;
  const canEdit = true; // All boards can be edited
  const canDelete = !isSystemBoard; // Only custom boards can be deleted

  return (
    <Dropdown.Item
      eventKey={boardId}
      active={isSelected}
      onSelect={() => onSelect(boardId)}
      style={{ height: '32px' }}
      className={classNames(
        'group',
        isEditing && !isSelected && 'rounded border border-emerald-500 bg-emerald-50'
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="flex-1 truncate text-sm leading-tight">{boardName}</span>
        {(canEdit || canDelete) && !isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {canEdit && (
              <button
                type="button"
                onClick={(e) => onEdit(board, e)}
                className={classNames(
                  'rounded p-0.5 transition-colors hover:bg-gray-200',
                  isSelected && 'bg-white'
                )}
                title="Edit board"
              >
                <Pencil className="h-3.5 w-3.5 text-gray-600" />
              </button>
            )}
            {canDelete && (
              <ConfirmPopover
                title="Delete Board"
                description={`Are you sure you want to delete "${boardName}"? This cannot be undone.`}
                confirmText="Delete"
                onConfirm={() => onDelete(boardId)}
                isLoading={isDeleting}
                placement="left"
              >
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={classNames(
                    'rounded p-0.5 transition-colors hover:bg-red-100',
                    isSelected && 'bg-white'
                  )}
                  title="Delete board"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </button>
              </ConfirmPopover>
            )}
          </div>
        )}
      </div>
    </Dropdown.Item>
  );
};
