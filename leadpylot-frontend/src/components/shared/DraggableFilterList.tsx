'use client';
import React, { useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface FilterItem {
  key: string;
  label: string;
  value: string | number;
  isVisible: boolean;
}

interface DraggableFilterListProps {
  filters: FilterItem[];
  onFilterVisibilityChange: (key: string, isVisible: boolean) => void;
  onFilterSelect: (value: string | number) => void;
  selectedValue?: string | number;
  onClose: () => void;
  filterType: 'import' | 'status' | 'groupBy';
  title: string;
}

export const DraggableFilterList: React.FC<DraggableFilterListProps> = ({
  filters,
  onFilterVisibilityChange,
  onFilterSelect,
  selectedValue,
  onClose,
  filterType,
  title,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Get filter order from localStorage
  const getFilterOrder = (): string[] => {
    try {
      const stored = localStorage.getItem(`filter-order-${filterType}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save filter order to localStorage
  const saveFilterOrder = (order: string[]) => {
    try {
      localStorage.setItem(`filter-order-${filterType}`, JSON.stringify(order));
    } catch (error) {
      console.error('Failed to save filter order:', error);
    }
  };

  // Get filter visibility from localStorage
  const getFilterVisibility = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem(`filter-visibility-${filterType}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Save filter visibility to localStorage
  const saveFilterVisibility = (visibility: Record<string, boolean>) => {
    try {
      localStorage.setItem(`filter-visibility-${filterType}`, JSON.stringify(visibility));
    } catch (error) {
      console.error('Failed to save filter visibility:', error);
    }
  };

  // Get ordered filters based on stored order
  const getOrderedFilters = () => {
    const filterOrder = getFilterOrder();
    const filterVisibility = getFilterVisibility();

    // Merge visibility settings with filters
    const filtersWithVisibility = filters?.map((filter) => ({
      ...filter,
      isVisible: filterVisibility[filter?.key] !== undefined ? filterVisibility[filter?.key] : true,
    }));

    if (filterOrder?.length === 0) {
      return filtersWithVisibility;
    }

    const orderedFilters = [...filtersWithVisibility];
    orderedFilters?.sort?.((a, b) => {
      const aIndex = filterOrder?.indexOf(a?.key);
      const bIndex = filterOrder?.indexOf(b?.key);

      // If both are in the order, sort by position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in the order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is in the order, maintain original order
      return 0;
    });

    return orderedFilters;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const orderedFilters = getOrderedFilters();
    const items = Array.from(orderedFilters);
    const [reorderedItem] = items?.splice(result?.source?.index, 1);
    items?.splice(result?.destination?.index, 0, reorderedItem);

    const newOrder = items?.map((item) => item?.key);
    saveFilterOrder(newOrder);
  };

  const handleVisibilityChange = (key: string, isVisible: boolean) => {
    const currentVisibility = getFilterVisibility();
    const newVisibility = { ...currentVisibility, [key]: isVisible };
    saveFilterVisibility(newVisibility);
    onFilterVisibilityChange(key, isVisible);
  };

  const handleReset = () => {
    setIsResetting(true);
    // Clear localStorage for this filter type
    localStorage.removeItem(`filter-order-${filterType}`);
    localStorage.removeItem(`filter-visibility-${filterType}`);

    // Force a re-render by briefly setting a reset state
    setTimeout(() => {
      setIsResetting(false);
    }, 100);
  };

  const orderedFilters = getOrderedFilters();

  return (
    <div
      ref={dropdownRef}
      className="relative flex max-h-[60dvh] w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-xl sm:w-96 sm:p-4 md:max-h-[70vh]"
    >
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
        <Button
          variant="plain"
          size="sm"
          onClick={onClose}
          icon={<ApolloIcon name="cross" className="text-lg" />}
          className="p-1 sm:p-2"
        />
      </div>

      <div className="mb-3 sm:mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          icon={<ApolloIcon name="repeat" className="text-sm" />}
          className="w-full text-sm sm:w-auto"
          disabled={isResetting}
        >
          {isResetting ? 'Resetting...' : 'Reset to Default'}
        </Button>
      </div>

      <div className="mb-2 text-xs text-gray-600 sm:mb-3 sm:text-sm">
        <span className="hidden sm:inline">Drag filters to reorder them:</span>
        <span className="sm:hidden">Tap and hold to drag filters:</span>
      </div>

      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="filters">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[200px] space-y-2 rounded border-2 border-dashed p-2 transition-colors sm:space-y-3 sm:p-3 ${
                  snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {!isResetting &&
                  orderedFilters?.map?.((filter, index) => (
                    <Draggable key={filter?.key} draggableId={filter?.key} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided?.innerRef}
                          {...provided?.draggableProps}
                          className={`flex touch-manipulation items-center justify-between rounded-lg border bg-white p-3 shadow-sm transition-all sm:p-4 ${
                            snapshot.isDragging
                              ? 'rotate-2 border-blue-300 bg-blue-50 shadow-lg'
                              : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-2 sm:gap-3">
                            <div
                              {...provided?.dragHandleProps}
                              className="cursor-grab touch-manipulation p-1 text-gray-400 hover:cursor-grabbing hover:text-gray-600 sm:p-0"
                            >
                              <ApolloIcon name="drag-and-sort" className="text-lg sm:text-xl" />
                            </div>
                            <Checkbox
                              checked={filter?.isVisible}
                              onChange={(isChecked) =>
                                handleVisibilityChange(filter?.key, isChecked)
                              }
                              className="mr-0 touch-manipulation"
                            />
                            <button
                              onClick={() => onFilterSelect(filter?.value)}
                              className={`flex-1 truncate text-left text-sm font-medium transition-colors sm:text-base ${
                                selectedValue === filter?.value
                                  ? 'rounded bg-blue-50 px-2 py-1 text-blue-700'
                                  : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {filter?.label}
                            </button>
                          </div>
                          {selectedValue === filter?.value && (
                            <ApolloIcon name="check" className="text-sm text-blue-600" />
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Mobile-specific instruction */}
      <div className="mt-3 text-xs text-gray-500 sm:hidden">
        💡 Tip: Tap and hold the drag handle to reorder filters
      </div>
    </div>
  );
};
