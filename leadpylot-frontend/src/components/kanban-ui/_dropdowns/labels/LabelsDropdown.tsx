import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Plus, Search, X } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { LabelItem } from '../../_components/LabelComponents';
import { Label } from '../../types';
import { useUpdateTask } from '@/hooks/useTasks';
import { useKanban } from '../../_contexts';
import Button from '@/components/ui/Button';

interface LabelsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  taskId: string; // Task ID to update
  currentLabels: any[]; // Current labels array from API
  onCreateLabel: () => void; // Opens CreateLabelDropdown
  onEditLabel?: (label: Label) => void; // Opens CreateLabelDropdown in edit mode
  // Optional: Stop event propagation to prevent parent click handlers (e.g., prevent modal opening)
  stopPropagation?: boolean;
}

export const LabelsDropdown: React.FC<LabelsDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  taskId,
  currentLabels,
  onCreateLabel,
  onEditLabel,
  stopPropagation = false,
}) => {
  const { mutate: updateTask } = useUpdateTask();
  const { boardLabels, selectedBoardId } = useKanban();
  const [searchQuery, setSearchQuery] = useState('');

  // Get selected label IDs from currentLabels (where isSelected is true)
  const selectedLabelIds = useMemo(() => {
    return currentLabels
      .filter((l: any) => l.isSelected !== false)
      .map((l: any) => l._id || l.id)
      .filter(Boolean);
  }, [currentLabels]);

  // Filter labels based on search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return boardLabels;
    const query = searchQuery.toLowerCase();
    return boardLabels.filter((label: any) => {
      const title = (label.title || label.name || '').toLowerCase();
      return title.includes(query);
    });
  }, [boardLabels, searchQuery]);

  const handleToggleLabel = (labelId: string) => {
    if (!selectedBoardId) return;

    // Toggle the label
    const isCurrentlySelected = selectedLabelIds.includes(labelId);
    const newSelectedLabelIds = isCurrentlySelected
      ? selectedLabelIds.filter((id: string) => id !== labelId)
      : [...selectedLabelIds, labelId];

    // Update task with new payload format: { labels: [id1, id2], board_id }
    updateTask({
      id: taskId,
      data: {
        labels: newSelectedLabelIds as string[],
        board_id: selectedBoardId as string,
      },
    });
  };


  const handleEdit = (label: Label) => {
    if (onEditLabel) {
      onEditLabel(label);
    }
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={320}
      dropdownHeight={500}
    >
      <div 
        className="rounded-xl border border-ocean-2/50 bg-white shadow-xl"
        onClick={stopPropagation ? (e) => {
          e.stopPropagation();
          e.preventDefault();
        } : undefined}
        onMouseDown={stopPropagation ? (e) => {
          e.stopPropagation();
          e.preventDefault();
        } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-1">
          <h3 className="text-sm font-bold text-black">Labels</h3>
          <Button
            onClick={(e) => {
              if (stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
              }
              onClose();
            }}
            onMouseDown={stopPropagation ? (e) => {
              e.stopPropagation();
              e.preventDefault();
            } : undefined}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            size="xs"
            variant="plain"
            icon={<X className="h-4 w-4" />}
          >
          </Button>
        </div>

        {/* Search */}
        <div className=" border-ocean-2/50 px-2 py-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                }
                setSearchQuery(e.target.value);
              }}
              onClick={stopPropagation ? (e) => {
                e.stopPropagation();
                // Don't preventDefault - we want the input to receive focus
              } : undefined}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                // Don't preventDefault - we want the input to receive focus
              } : undefined}
              onFocus={stopPropagation ? (e) => {
                e.stopPropagation();
                // Don't preventDefault - we want the input to receive focus
              } : undefined}
              placeholder="Search labels..."
              className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 py-1 pl-10 pr-3 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Labels List */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredLabels?.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {searchQuery ? 'No labels found' : 'No labels available'}
            </div>
          ) : (
            filteredLabels?.map((label: any) => {
              const labelId = label._id || label.id;
              const isSelected = selectedLabelIds.includes(labelId);

              return (
                <div
                  key={labelId}
                  onClick={stopPropagation ? (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  } : undefined}
                  onMouseDown={stopPropagation ? (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  } : undefined}
                >
                  <LabelItem
                    label={label}
                    isSelected={isSelected}
                    onToggle={() => handleToggleLabel(labelId)}
                    onEdit={() => handleEdit(label as Label)}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Create Label Button */}
        <div className="border-t border-ocean-2/50 p-3">
          <Button
            onClick={(e) => {
              if (stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
              }
              onCreateLabel();
            }}
            onMouseDown={stopPropagation ? (e) => {
              e.stopPropagation();
              e.preventDefault();
            } : undefined}
            size="xs"
            variant="plain"
            icon={<Plus className="h-4 w-4" />}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
          >
            <span>Create a new label</span>
          </Button>
        </div>
      </div>
    </SmartDropdown>
  );
};
