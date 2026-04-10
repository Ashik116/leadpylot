import React, { useRef, useState } from 'react';
import { Checklist as ChecklistType, ReminderOption } from '../../types';
import {
  ChecklistHeader,
  ChecklistItem,
  ChecklistItemInput,
} from './index';
import { ChecklistItemDueDateDropdown } from '../../_dropdowns/checklists/ChecklistItemDueDateDropdown';
import { UnifiedMemberAssignment } from '../MemberComponents/UnifiedMemberAssignment';


interface ChecklistProps {
  checklist: ChecklistType;
  onUpdateTitle: (title: string) => void;
  onToggleHideChecked: () => void;
  onDelete: () => void;
  onAddItem: (text: string, metadata?: { assignedMembers?: string[]; dueDate?: string; dueTime?: string; reminder?: ReminderOption }) => string | void;
  onUpdateItem: (itemId: string, text: string) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleItemCompletion: (itemId: string) => void;
  onSetItemDueDate: (itemId: string, date?: string, time?: string, reminder?: ReminderOption) => void;
  onRemoveItemDueDate: (itemId: string) => void;
  onAssignMembers: (itemId: string, memberIds: string[]) => void;
  onAssignChecklist?: (memberIds: string[]) => void;
  onSetChecklistDueDate?: (date?: string, time?: string) => void;
  onToggleChecklistComplete?: (nextValue: boolean) => void;
  taskMemberIds?: string[]; // Members assigned to the task
  boardId?: string | string[] | Array<{ _id?: string;[key: string]: any }>; // Board ID for validation
  progress: number;
}

export const Checklist: React.FC<ChecklistProps> = ({
  checklist,
  onUpdateTitle,
  onToggleHideChecked,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleItemCompletion,
  onSetItemDueDate,
  onRemoveItemDueDate,
  onAssignMembers,
  onAssignChecklist,
  onSetChecklistDueDate,
  onToggleChecklistComplete,
  taskMemberIds = [],
  boardId,
  progress,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Collapsed by default
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [dueDateDropdownOpen, setDueDateDropdownOpen] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

  // Checklist-level dropdowns
  const [checklistAssignDropdownOpen, setChecklistAssignDropdownOpen] = useState(false);
  const [checklistDueDateDropdownOpen, setChecklistDueDateDropdownOpen] = useState(false);
  const checklistAssignButtonRef = useRef<HTMLButtonElement>(null);
  const checklistDueDateButtonRef = useRef<HTMLButtonElement>(null);

  // Input-level dropdowns and state
  const [inputAssignDropdownOpen, setInputAssignDropdownOpen] = useState(false);
  const [inputDueDateDropdownOpen, setInputDueDateDropdownOpen] = useState(false);
  const [tempAssignedMembers, setTempAssignedMembers] = useState<string[]>([]);
  const [tempDueDate, setTempDueDate] = useState<{ date?: string; time?: string; reminder?: ReminderOption } | null>(null);
  const inputAssignButtonRef = useRef<HTMLButtonElement>(null);
  const inputDueDateButtonRef = useRef<HTMLButtonElement>(null);

  const checklistItems = Array.isArray(checklist.items) ? checklist.items : [];
  const hasTodos = checklistItems.length > 0;

  const visibleItems = checklist.hideCheckedItems
    ? checklistItems.filter((item) => !item.completed)
    : checklistItems;

  const activeItem = activeItemId
    ? checklistItems.find((item) => item.id === activeItemId)
    : null;

  // Create refs for each item
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleAddItem = (text: string, assignedMembers?: string[], dueDate?: { date?: string; time?: string; reminder?: ReminderOption }) => {
    // Create the item with all metadata in ONE state update to avoid stale closure issues
    // This prevents the race condition where subsequent updates overwrite the new item
    onAddItem(text, {
      assignedMembers: assignedMembers && assignedMembers.length > 0 ? assignedMembers : undefined,
      dueDate: dueDate?.date,
      dueTime: dueDate?.time,
      reminder: dueDate?.reminder,
    });

    // Reset temporary state but KEEP the input open for adding more items
    setTempAssignedMembers([]);
    setTempDueDate(null);
    // Keep isAddingItem true so the input stays open for continuous adding
  };

  const handleCancelAddItem = () => {
    setIsAddingItem(false);
    setTempAssignedMembers([]);
    setTempDueDate(null);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handleHeaderAddItem = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsAddingItem(true);
  };

  // Handle click on checklist area to auto-open add item input
  const handleChecklistClick = (e: React.MouseEvent) => {
    // Don't open if clicking on interactive elements (buttons, inputs, items)
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, input, [data-item-id], [data-no-auto-open]');
    if (!isInteractiveElement && !isAddingItem) {
      setIsAddingItem(true);
    }
  };

  const handleInputAssignMembers = (memberIds: string[]) => {
    setTempAssignedMembers(memberIds);
    setInputAssignDropdownOpen(false);
  };

  const handleInputSetDueDate = (date?: string, time?: string, reminder?: ReminderOption) => {
    if (date) {
      setTempDueDate({ date, time, reminder });
    } else {
      setTempDueDate(null);
    }
    setInputDueDateDropdownOpen(false);
  };

  const handleInputRemoveDueDate = () => {
    setTempDueDate(null);
    setInputDueDateDropdownOpen(false);
  };

  const handleDueDateClick = (itemId: string, event?: React.MouseEvent) => {
    setActiveItemId(itemId);
    // Get the trigger element from the event (badge click) or find the item container
    let element: HTMLElement | null = null;

    if (event?.currentTarget) {
      // If clicked from badge, use the badge element or its parent
      element = event.currentTarget as HTMLElement;
      // Try to find the badge container
      const badgeContainer = element.closest('[data-badge-type="due-date"]') as HTMLElement;
      if (badgeContainer) {
        element = badgeContainer;
      }
    } else {
      // Fallback to item container
      element = itemRefs.current[itemId] || document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
    }

    if (element) {
      setTriggerElement(element);
      setDueDateDropdownOpen(true);
    } else {
      // Retry after a bit more time
      setTimeout(() => {
        const retryElement = itemRefs.current[itemId] || document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
        if (retryElement) {
          setTriggerElement(retryElement);
          setDueDateDropdownOpen(true);
        }
      }, 50);
    }
  };

  const handleAssignClick = (itemId: string, event?: React.MouseEvent) => {
    setActiveItemId(itemId);
    // Get the trigger element from the event (badge click) or find the item container
    let element: HTMLElement | null = null;

    if (event?.currentTarget) {
      // If clicked from badge, use the badge element or its parent
      element = event.currentTarget as HTMLElement;
      // Try to find the badge container
      const badgeContainer = element.closest('[data-badge-type="assign"]') as HTMLElement;
      if (badgeContainer) {
        element = badgeContainer;
      }
    } else {
      // Fallback to item container
      element = itemRefs.current[itemId] || document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
    }

    if (element) {
      setTriggerElement(element);
      setAssignDropdownOpen(true);
    } else {
      // Retry after a bit more time
      setTimeout(() => {
        const retryElement = itemRefs.current[itemId] || document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
        if (retryElement) {
          setTriggerElement(retryElement);
          setAssignDropdownOpen(true);
        }
      }, 50);
    }
  };

  const handleSaveDueDate = (date?: string, time?: string, reminder?: ReminderOption) => {
    if (activeItemId) {
      onSetItemDueDate(activeItemId, date, time, reminder);
    }
    setDueDateDropdownOpen(false);
    setActiveItemId(null);
  };

  const handleRemoveDueDate = () => {
    if (activeItemId) {
      onRemoveItemDueDate(activeItemId);
    }
    setDueDateDropdownOpen(false);
    setActiveItemId(null);
  };

  const handleAssignMembers = (memberIds: string[]) => {
    if (activeItemId) {
      onAssignMembers(activeItemId, memberIds);
    }
    setAssignDropdownOpen(false);
    setActiveItemId(null);
  };

  // Checklist-level handlers
  const handleChecklistAssignClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setChecklistAssignDropdownOpen(true);
  };

  const handleChecklistDueDateClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setChecklistDueDateDropdownOpen(true);
  };

  const handleChecklistAssign = (memberIds: string[]) => {
    if (onAssignChecklist) {
      onAssignChecklist(memberIds);
    }
    setChecklistAssignDropdownOpen(false);
  };

  const handleChecklistSetDueDate = (date?: string, time?: string) => {
    if (onSetChecklistDueDate) {
      onSetChecklistDueDate(date, time);
    }
    setChecklistDueDateDropdownOpen(false);
  };

  const handleChecklistRemoveDueDate = () => {
    if (onSetChecklistDueDate) {
      onSetChecklistDueDate(undefined, undefined);
    }
    setChecklistDueDateDropdownOpen(false);
  };

  return (
    <div
      className="rounded-xl border border-ocean-2/50 bg-white px-1.5 py-1 space-y-1 cursor-pointer hover:border-indigo-300 transition-colors"
      onClick={handleChecklistClick}
    >
      <div data-no-auto-open>
        <ChecklistHeader
          title={checklist.title}
          progress={progress}
          hideCheckedItems={checklist.hideCheckedItems || false}
          onTitleChange={onUpdateTitle}
          onToggleHideChecked={onToggleHideChecked}
          onDelete={onDelete}
          onToggleCollapse={hasTodos ? handleToggleCollapse : undefined}
          isCollapsed={hasTodos ? isCollapsed : false}
          showProgress={hasTodos}
          rightContent={
            !hasTodos ? (
              <button
                onClick={handleHeaderAddItem}
                className="rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-black transition-colors hover:bg-gray-100"
              >
                Add an item
              </button>
            ) : null
          }
          assignedMemberId={checklist.assignedMemberId}
          dueDate={checklist.dueDate}
          dueTime={checklist.dueTime}
          isCompleted={checklist.isCompleted || false}
          onToggleComplete={onToggleChecklistComplete}
          onAssignClick={onAssignChecklist ? handleChecklistAssignClick : undefined}
          onDueDateClick={onSetChecklistDueDate ? handleChecklistDueDateClick : undefined}
          assignButtonRef={checklistAssignButtonRef as React.RefObject<HTMLButtonElement>}
          dueDateButtonRef={checklistDueDateButtonRef as React.RefObject<HTMLButtonElement>}
        />
      </div>

      {/* Checklist Items - Only show when expanded */}
      {(!isCollapsed || !hasTodos) && (
        <>
           
          <div className="space-y-0 pl-[22px]" data-no-auto-open onClick={(e) => e.stopPropagation()}>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                data-item-id={item.id}
                ref={(el) => {
                  itemRefs.current[item.id] = el;
                }}
              >
                <ChecklistItem
                  item={item}
                  onToggle={() => onToggleItemCompletion(item.id)}
                  onUpdate={(text) => onUpdateItem(item.id, text)}
                  onDelete={() => onDeleteItem(item.id)}
                  onDueDateClick={(e) => handleDueDateClick(item.id, e)}
                  onAssignClick={(e) => handleAssignClick(item.id, e)}
                />
              </div>
            ))}
          </div>

          {/* Click hint - show when no items and not adding */}
          {visibleItems.length === 0 && !isAddingItem && hasTodos && (
            <div className="py-1 text-center text-xs text-gray-400">
              Click anywhere to add an item
            </div>
          )}

          {/* Add Item Input */}
          {isAddingItem ? (
            <div data-no-auto-open onClick={(e) => e.stopPropagation()}>
              <ChecklistItemInput
                onAdd={handleAddItem}
                onCancel={handleCancelAddItem}
              />
              {/* Input-level Assign Dropdown */}
              <UnifiedMemberAssignment
                isOpen={inputAssignDropdownOpen}
                onClose={() => setInputAssignDropdownOpen(false)}
                triggerRef={inputAssignButtonRef as React.RefObject<HTMLElement>}
                context="checklist-item"
                boardId={boardId}
                assignedMemberIds={tempAssignedMembers}
                taskMemberIds={taskMemberIds}
                onAssign={handleInputAssignMembers}
                title="Assign"
              />
              {/* Input-level Due Date Dropdown */}
              <ChecklistItemDueDateDropdown
                isOpen={inputDueDateDropdownOpen}
                onClose={() => setInputDueDateDropdownOpen(false)}
                triggerRef={inputDueDateButtonRef as React.RefObject<HTMLElement>}
                dueDate={tempDueDate?.date}
                dueTime={tempDueDate?.time}
                reminder={tempDueDate?.reminder}
                onSave={handleInputSetDueDate}
                onRemove={handleInputRemoveDueDate}
              />
            </div>
          ) : hasTodos ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingItem(true);
              }}
              className="rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-black transition-colors hover:bg-gray-100"
            >
              Add an item
            </button>
          ) : null}
        </>
      )}

      {/* Due Date Dropdown */}
      {activeItem && activeItemId && triggerElement && (
        <ChecklistItemDueDateDropdown
          isOpen={dueDateDropdownOpen}
          onClose={() => {
            setDueDateDropdownOpen(false);
            setActiveItemId(null);
            setTriggerElement(null);
          }}
          triggerRef={{ current: triggerElement } as React.RefObject<HTMLElement>}
          dueDate={activeItem.dueDate}
          dueTime={activeItem.dueTime}
          reminder={activeItem.reminder}
          onSave={handleSaveDueDate}
          onRemove={handleRemoveDueDate}
        />
      )}

      {/* Assign Dropdown */}
      {activeItem && activeItemId && triggerElement && (
        <UnifiedMemberAssignment
          isOpen={assignDropdownOpen}
          onClose={() => {
            setAssignDropdownOpen(false);
            setActiveItemId(null);
            setTriggerElement(null);
          }}
          triggerRef={{ current: triggerElement } as React.RefObject<HTMLElement>}
          context="checklist-item"
          boardId={boardId}
          assignedMemberIds={activeItem.assignedMembers}
          taskMemberIds={taskMemberIds}
          onAssign={handleAssignMembers}
          title="Assign"
        />
      )}

      {/* Checklist-level Assign Dropdown */}
      {onAssignChecklist && (
        <UnifiedMemberAssignment
          isOpen={checklistAssignDropdownOpen}
          onClose={() => setChecklistAssignDropdownOpen(false)}
          triggerRef={checklistAssignButtonRef as React.RefObject<HTMLElement>}
          context="checklist"
          boardId={boardId}
          assignedMemberIds={
            checklist.assignedMemberId
              ? Array.isArray(checklist.assignedMemberId)
                ? checklist.assignedMemberId // Already an array
                : [checklist.assignedMemberId] // Wrap single value in array
              : []
          }
          taskMemberIds={taskMemberIds}
          onAssign={handleChecklistAssign}
          title="Assign"
        />
      )}

      {/* Checklist-level Due Date Dropdown */}
      {onSetChecklistDueDate && (
        <ChecklistItemDueDateDropdown
          isOpen={checklistDueDateDropdownOpen}
          onClose={() => setChecklistDueDateDropdownOpen(false)}
          triggerRef={checklistDueDateButtonRef as React.RefObject<HTMLElement>}
          dueDate={checklist.dueDate}
          dueTime={checklist.dueTime}
          onSave={handleChecklistSetDueDate}
          onRemove={handleChecklistRemoveDueDate}
        />
      )}

    </div>
  );
};
