'use client';

import React, { useState } from 'react';
import ActionDropDown, { ActionButton } from '@/components/shared/ActionBar/ActionDropDown';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface MeetingActionButtonsProps {
  selectedItems: any[];
  onEdit: () => void;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function MeetingActionButtons({
  selectedItems,
  onEdit,
  onDelete,
  isDeleting,
}: MeetingActionButtonsProps) {
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const actions = [
    {
      key: 'edit',
      label: 'Edit',
      icon: 'pen',
      iconClassName: 'text-blue-600',
      disabled: selectedItems.length !== 1,
      onClick: () => {
        if (selectedItems.length === 1) onEdit();
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'trash',
      iconClassName: 'text-red-600',
      disabled: selectedItems.length === 0,
      onClick: () => setShowDeleteConfirm(true),
    },
  ];

  const selectedAction = actions.find((a) => a.key === selectedActionKey) || null;
  const selectLabel = selectedAction?.label ?? 'Select';
  const selectIconName = selectedAction?.icon ?? 'repeat';
  const selectIconClassName = selectedAction?.iconClassName ?? 'text-sm';

  const handleSwitchClick = () => {
    if (!selectedAction || selectedAction.disabled) return;
    if (selectedAction.key === 'delete') {
      setShowDeleteConfirm(true);
    } else {
      selectedAction.onClick();
    }
  };

  const handleDeleteConfirm = async () => {
    await onDelete();
    setShowDeleteConfirm(false);
    setSelectedActionKey(null);
  };

  if (selectedItems.length === 0) return null;

  return (
    <>
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
        <span className="text-sm text-gray-600">Actions</span>
        <ActionDropDown
          deleteButton={false}
          setDeleteConfirmDialogOpen={() => {}}
          selectedItems={selectedItems}
          buttonSize="xs"
          buttonIconClassName={`${selectIconClassName} z-50`}
          buttonIconName={selectIconName}
          buttonLabel={selectLabel}
        >
          {actions.map((action) => (
            <ActionButton
              key={action.key}
              icon={action.icon}
              iconClassName={action.iconClassName}
              onClick={() => {
                if (action.disabled) return;
                setSelectedActionKey(action.key);
              }}
              disabled={action.disabled}
              className="text-gray-700 hover:bg-transparent disabled:opacity-60"
            >
              {action.label}
            </ActionButton>
          ))}
        </ActionDropDown>
        <Button
          size="xs"
          variant="default"
          icon={<ApolloIcon name="arrow-right" className="text-sm" />}
          iconAlignment="end"
          disabled={!selectedAction || selectedAction.disabled}
          onClick={handleSwitchClick}
        >
          Action
        </Button>
        {selectedAction && (
          <Button
            size="xs"
            variant="default"
            onClick={() => setSelectedActionKey(null)}
            title="Clear selection"
          >
            <ApolloIcon name="cross" className="text-sm" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete appointment(s)"
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        portalClassName="!z-[100010]"
        confirmButtonProps={{
          loading: isDeleting,
          disabled: isDeleting,
          className: 'bg-red-500 hover:bg-red-600 text-white',
        }}
      >
        <p className="text-sm text-gray-600">
          {selectedItems.length === 1
            ? 'Are you sure you want to delete this appointment? This cannot be undone.'
            : `Are you sure you want to delete ${selectedItems.length} appointments? This cannot be undone.`}
        </p>
      </ConfirmDialog>
    </>
  );
}
