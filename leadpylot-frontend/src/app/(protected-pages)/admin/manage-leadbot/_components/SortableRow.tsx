'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Checkbox from '@/components/ui/Checkbox';
import Switcher from '@/components/ui/Switcher';
import { StatusBadge, AvailableBadge } from './QuickActionBadges';
import { leadbotRichTooltipTitle } from '@/components/leadbot/LeadbotChat/leadbotRichTooltip';
import Tooltip from '@/components/ui/Tooltip';
import type { QuickActionAdminItem } from './quickActions.types';

interface SortableRowProps {
  item: QuickActionAdminItem;
  index: number;
  isSelected: boolean;
  isReorderMode: boolean;
  isItemMutating: boolean;
  onEdit: (item: QuickActionAdminItem) => void;
  onHardDelete: (id: string) => void;
  onToggleAvailable: (item: QuickActionAdminItem) => void;
  onToggleActive: (item: QuickActionAdminItem) => void;
  onSelectOne: (id: string) => void;
}

export function SortableRow({
  item,
  index,
  isSelected,
  isReorderMode,
  isItemMutating,
  onEdit,
  onHardDelete,
  onToggleAvailable,
  onToggleActive,
  onSelectOne,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      {/* Checkbox */}
      <td className="px-2 py-1.5">
        <Checkbox
          checked={isSelected}
          onChange={() => onSelectOne(item._id)}
          disabled={isItemMutating}
        />
      </td>

      {/* Drag handle / Order */}
      <td className="px-2 py-1.5 w-12">
        {isReorderMode ? (
          <div className="flex items-center gap-1">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-0.5"
              {...attributes}
              {...listeners}
            >
              <ApolloIcon name="drag-and-sort" className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-500">
              {index + 1}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{index + 1}</span>
        )}
      </td>

      {/* Label + Slug */}
      <td className="px-2 py-1.5">
        <p className="text-xs font-medium text-gray-900 truncate">{item.label}</p>
        <p className="text-[10px] text-gray-400 font-mono">{item.slug}</p>
      </td>

      {/* Message preview */}
      <td className="px-2 py-1.5 max-w-xs">
        <Tooltip
          title={leadbotRichTooltipTitle(item.label, item.message)}
          placement="top"
        >
          <p className="text-xs text-gray-600 truncate cursor-help">{item.message}</p>
        </Tooltip>
      </td>

      {/* Available toggle */}
      <td className="px-2 py-1.5">
        <Tooltip
          title={leadbotRichTooltipTitle(
            'Available',
            item.available
              ? 'Button enabled. Users can click this action in chat. Click to disable (gray out).'
              : 'Button disabled. Action appears grayed out and cannot be clicked. Click to enable.'
          )}
          placement="top"
        >
          <button
            onClick={() => onToggleAvailable(item)}
            disabled={isItemMutating || isReorderMode}
          >
            <AvailableBadge available={item.available} />
          </button>
        </Tooltip>
      </td>

      {/* Active toggle */}
      <td className="px-2 py-1.5">
        <Tooltip
          title={leadbotRichTooltipTitle(
            'Status',
            item.is_active
              ? 'Active. Action is shown in chat quick actions menu. Click to hide.'
              : 'Inactive. Action is completely hidden from chat. Click to show.'
          )}
          placement="top"
        >
          <button
            onClick={() => onToggleActive(item)}
            disabled={isItemMutating || isReorderMode}
          >
            <StatusBadge active={item.is_active} />
          </button>
        </Tooltip>
      </td>

      {/* Row actions */}
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="plain"
            size="xs"
            icon={<ApolloIcon name="pen" className="h-3 w-3" />}
            onClick={() => onEdit(item)}
            disabled={isItemMutating || isReorderMode}
            title="Edit"
          />

          <Button
            variant="plain"
            size="xs"
            icon={
              item.available ? (
                <ApolloIcon name="check-circle-fill" className="text-emerald-500 h-3 w-3" />
              ) : (
                <ApolloIcon name="circle" className="text-gray-300 h-3 w-3" />
              )
            }
            onClick={() => onToggleAvailable(item)}
            disabled={isItemMutating || isReorderMode}
            title={item.available ? 'Make Unavailable' : 'Make Available'}
          />

          <div className="flex items-center justify-center h-4 w-7">
            <Switcher
              checked={item.is_active}
              onChange={() => onToggleActive(item)}
              disabled={isReorderMode}
              className="scale-75 origin-center"
            />
          </div>

          <Button
            variant="plain"
            size="xs"
            icon={<ApolloIcon name="trash" className="text-red-500 h-3 w-3" />}
            onClick={() => onHardDelete(item._id)}
            disabled={isReorderMode}
            title="Delete Permanently"
          />
        </div>
      </td>
    </tr>
  );
}
