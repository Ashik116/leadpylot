import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Label } from '../../types';
import { LabelColorPicker } from '../../_components/LabelComponents';
import { ArrowLeft, Check, X } from 'lucide-react';
import { LABEL_COLOR_PALETTE } from '../../_data/labels-data';
import { useCreateLabel, useUpdateLabel } from '@/hooks/useLabels';
import { useKanban } from '../../_contexts';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface CreateLabelDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  taskId: string; // Task ID to update
  editingLabel?: Label; // If editing existing label
  onCreate: (label: { name: string; color: string }) => void;
  onUpdate?: (id: string, label: { name: string; color: string }) => void;
  onBack?: () => void; // Go back to LabelsDropdown
  // Optional: Stop event propagation to prevent parent click handlers (e.g., prevent modal opening)
  stopPropagation?: boolean;
}

export const CreateLabelDropdown: React.FC<CreateLabelDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  taskId,
  editingLabel,
  onCreate,
  onUpdate,
  onBack,
  stopPropagation = false,
}) => {
  const queryClient = useQueryClient();
  const createLabelMutation = useCreateLabel();
  const updateLabelMutation = useUpdateLabel();
  const { selectedBoardId } = useKanban();

  // Derive initial values from props
  const initialLabelName = editingLabel?.name || editingLabel?.title || '';
  const initialColor = editingLabel?.color || LABEL_COLOR_PALETTE[0];

  const [labelName, setLabelName] = useState(initialLabelName);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Update state when editingLabel or isOpen changes, but only if values actually changed
  useEffect(() => {
    if (!isOpen) {
      // Reset when dropdown closes
      setLabelName('');
      setSelectedColor(LABEL_COLOR_PALETTE[0]);
      return;
    }

    if (editingLabel) {
      // Handle both 'name' (from local storage) and 'title' (from API)
      const newName = editingLabel.name || editingLabel.title || '';
      const newColor = editingLabel.color || LABEL_COLOR_PALETTE[0];

      // Only update if values changed to avoid unnecessary renders
      if (labelName !== newName) {
        setLabelName(newName);
      }
      if (selectedColor !== newColor) {
        setSelectedColor(newColor);
      }
    } else {
      // Reset for new label creation
      if (labelName !== '') {
        setLabelName('');
      }
      if (selectedColor !== LABEL_COLOR_PALETTE[0]) {
        setSelectedColor(LABEL_COLOR_PALETTE[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLabel, isOpen]);

  // Force position recalculation when dropdown opens after transition
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      // Trigger a resize event to force SmartDropdown to recalculate position
      // This helps fix positioning issues when transitioning from LabelsDropdown
      const timeoutId = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, triggerRef]);

  const handleRemoveColor = () => {
    setSelectedColor(LABEL_COLOR_PALETTE[0]);
  };

  const handleSubmit = async () => {
    const name = labelName.trim();
    if (!name || !selectedBoardId) return;

    if (editingLabel && onUpdate) {
      // Update existing label
      const labelId = editingLabel._id || editingLabel.id;
      if (!labelId) {
        toast.push(
          <Notification title="Error" type="danger">
            Label ID is required for update
          </Notification>
        );
        return;
      }

      try {
        await updateLabelMutation.mutateAsync({
          id: labelId,
          data: {
            title: name,
            color: selectedColor,
          },
          boardId: selectedBoardId,
        });

        // Invalidate the specific task's query to refetch updated labels
        queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });

        toast.push(
          <Notification title="Success" type="success">
            Label updated successfully
          </Notification>
        );

        onUpdate(labelId, { name, color: selectedColor });
        onClose();
      } catch (error: any) {
        console.error('Error updating label:', error);
        toast.push(
          <Notification title="Error" type="danger">
            {error?.message || 'Failed to update label. Please try again.'}
          </Notification>
        );
      }
      return;
    }

    // Create new label using the API
    try {
      await createLabelMutation.mutateAsync({
        title: name,
        color: selectedColor,
        board_id: selectedBoardId,
      });

      toast.push(
        <Notification title="Success" type="success">
          Label created successfully
        </Notification>
      );

      onCreate({ name, color: selectedColor });
      onClose();
    } catch (error: any) {
      console.error('Error creating label:', error);
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to create label. Please try again.'}
        </Notification>
      );
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
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                onClick={(e) => {
                  if (stopPropagation) {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                  onBack();
                }}
                onMouseDown={stopPropagation ? (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                } : undefined}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
                size="xs"
                variant="plain"
                icon={<ArrowLeft className="h-4 w-4" />}
              >
              </Button>
            )}
            <h3 className="text-sm font-bold text-black">
              {editingLabel ? 'Edit label' : 'Create label'}
            </h3>
          </div>
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
            size="xs"
            variant="plain"
            icon={<X className="h-4 w-4" />}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
          >
          </Button>
        </div>

        <div className="px-2 py-1 space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-black/80 uppercase tracking-widest">
              Preview
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm truncate"
                style={{ backgroundColor: selectedColor }}
              >
                {labelName || 'New Level'}
              </span>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
              Title
            </label>
            <input
              type="text"
              value={labelName}
              name="title"
              onChange={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                }
                setLabelName(e.target.value);
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
              placeholder="New Level"
              className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                }
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Color Picker */}
          <div
            onClick={stopPropagation ? (e) => {
              e.stopPropagation();
              e.preventDefault();
            } : undefined}
            onMouseDown={stopPropagation ? (e) => {
              e.stopPropagation();
              e.preventDefault();
            } : undefined}
          >
            <LabelColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pb-2">
            <Button
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                handleRemoveColor();
              }}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                e.preventDefault();
              } : undefined}
              size="xs"
              variant="plain"
              icon={<X className="h-4 w-4" />}
              className="flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
            >
              Remove color
            </Button>
            <Button
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                handleSubmit();
              }}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                e.preventDefault();
              } : undefined}
              disabled={!labelName.trim() || (editingLabel ? updateLabelMutation.isPending : createLabelMutation.isPending) || !selectedBoardId}
              size="xs"
              variant="solid"
              icon={<Check className="h-4 w-4" />}
            >
              {editingLabel
                ? updateLabelMutation.isPending
                  ? 'Updating...'
                  : 'Save'
                : createLabelMutation.isPending
                  ? 'Creating...'
                  : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </SmartDropdown>
  );
};
