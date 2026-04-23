'use client';

import React, { useState } from 'react';
import ActionDropDown, { ActionButton } from '@/components/shared/ActionBar/ActionDropDown';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useLeadsDashboardContext } from '../context/LeadsDashboardContext';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { useShallow } from 'zustand/react/shallow';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

/**
 * Switch To section for leads dashboards - same pattern as offers/openings.
 * Renders a dropdown to select an action, then "Switch" to execute.
 *
 * @param switchMode - When true: select option then click Switch to execute (2 clicks).
 *                     When false: selecting an option executes immediately (1 click).
 */
export function LeadsSwitchToSection({ switchMode = true }: { switchMode?: boolean }) {
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);

  const {
    selectedGroupDetails,
    pendingLeadsComponent,
    closeProjectId,
    pageTitle,
    isArchivedPage,
    selectedLeads,
    selectedGroupBy,
    groupedLeadsTransformLeads,
    transformLeads,
    leadsData,
    isSubmitting,
    clearGroupDetails,
    setUpdateConfirmDialogOpen,
    handleAssignLeads,
    handleBulkUpdate,
    setIsReclamationDialogOpen,
    setArchiveConfirmDialogOpen,
    setRestoreConfirmDialogOpen,
    handleMakeFreshLeads,
    handleRevertClosedProjectLeads,
    setSelectedLeads,
  } = useLeadsDashboardContext();

  const selectedIdsFromStore = useSelectedItemsStore(
    useShallow((s) => (s.getCurrentPage() === 'leads' ? s.getSelectedIds('leads') : []))
  );
  const hasSelection = (selectedIdsFromStore?.length ?? selectedLeads?.length ?? 0) > 0;

  const closeDropdown = () => {
    setTimeout(() => {
      document.body.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })
      );
    }, 100);
  };

  const separateFreshAndRestrictedLeads = () => {
    const currentSelectedIds = selectedIdsFromStore?.length
      ? selectedIdsFromStore
      : selectedLeads || [];
    const closedLeadsData = closeProjectId ? leadsData : null;
    if (!closeProjectId || !currentSelectedIds.length || !closedLeadsData?.data) {
      return { freshLeadIds: currentSelectedIds, restrictedLeads: [] };
    }
    const freshLeadIds: string[] = [];
    const restrictedLeads: Array<{ leadId: string; contactName: string; status: string }> = [];
    currentSelectedIds.forEach((leadId: string) => {
      const lead = closedLeadsData.data.find((l: any) => l._id?.toString() === leadId.toString());
      if (lead) {
        const closeLeadStatus = lead?.closeLeadStatus?.toLowerCase();
        if (closeLeadStatus === 'fresh') freshLeadIds.push(leadId);
        else if (closeLeadStatus === 'revert' || closeLeadStatus === 'assigned') {
          restrictedLeads.push({
            leadId,
            contactName: lead.contact_name || 'Unknown',
            status: closeLeadStatus,
          });
        }
      } else {
        freshLeadIds.push(leadId);
      }
    });
    return { freshLeadIds, restrictedLeads };
  };

  const handleAssignWithValidation = () => {
    if (!closeProjectId) {
      handleAssignLeads();
      closeDropdown();
      return;
    }
    const { freshLeadIds, restrictedLeads } = separateFreshAndRestrictedLeads();
    if (restrictedLeads.length > 0) {
      const revertLeads = restrictedLeads.filter((l) => l.status === 'revert');
      const assignedLeads = restrictedLeads.filter((l) => l.status === 'assigned');
      let message = `Skipped ${restrictedLeads.length} lead${restrictedLeads.length > 1 ? 's' : ''} that cannot be assigned: `;
      const reasons: string[] = [];
      if (revertLeads.length > 0) reasons.push(`${revertLeads.length} already reverted`);
      if (assignedLeads.length > 0) reasons.push(`${assignedLeads.length} already assigned`);
      message += reasons.join(' and ') + '.';
      toast.push(<Notification title="Some Leads Skipped" type="warning">{message}</Notification>);
    }
    if (freshLeadIds.length === 0) {
      closeDropdown();
      return;
    }
    setSelectedLeads(freshLeadIds);
    handleAssignLeads();
    closeDropdown();
  };

  const handleRevertWithValidation = async () => {
    if (!closeProjectId) {
      await handleRevertClosedProjectLeads();
      closeDropdown();
      return;
    }
    const { freshLeadIds, restrictedLeads } = separateFreshAndRestrictedLeads();
    if (restrictedLeads.length > 0) {
      const revertLeads = restrictedLeads.filter((l) => l.status === 'revert');
      const assignedLeads = restrictedLeads.filter((l) => l.status === 'assigned');
      let message = `Skipped ${restrictedLeads.length} lead${restrictedLeads.length > 1 ? 's' : ''} that cannot be reverted: `;
      const reasons: string[] = [];
      if (revertLeads.length > 0) reasons.push(`${revertLeads.length} already reverted`);
      if (assignedLeads.length > 0)
        reasons.push(`${assignedLeads.length} already assigned to another project`);
      message += reasons.join(' and ') + '.';
      toast.push(<Notification title="Some Leads Skipped" type="warning">{message}</Notification>);
    }
    if (freshLeadIds.length === 0) {
      closeDropdown();
      return;
    }
    const originalSelectedLeads = [...(selectedLeads || [])];
    setSelectedLeads(freshLeadIds);
    try {
      await handleRevertClosedProjectLeads();
    } catch {
      setSelectedLeads(originalSelectedLeads);
    }
    closeDropdown();
  };

  const actions: Array<{
    key: string;
    label: string;
    icon: string;
    onClick: () => void;
    disabled: boolean;
    show: boolean;
  }> = [];

  if (selectedGroupDetails) {
    actions.push({
      key: 'back-to-groups',
      label: 'Back to Groups',
      icon: 'arrow-left',
      onClick: () => {
        clearGroupDetails?.();
        closeDropdown();
      },
      disabled: false,
      show: true,
    });
  }

  if (pendingLeadsComponent) {
    actions.push({
      key: 'check',
      label: 'Check',
      icon: 'check',
      onClick: () => {
        setUpdateConfirmDialogOpen?.(true);
        closeDropdown();
      },
      disabled: !hasSelection,
      show: true,
    });
  }

  if (closeProjectId) {
    actions.push({
      key: 'assign',
      label: 'Assign',
      icon: 'exchange',
      onClick: handleAssignWithValidation,
      disabled: !hasSelection || !!isSubmitting,
      show: true,
    });
    actions.push({
      key: 'revert',
      label: 'Revert',
      icon: 'refresh',
      onClick: () => handleRevertWithValidation(),
      disabled: !hasSelection || !!isSubmitting,
      show: true,
    });
  } else {
    if (pageTitle === 'Project Leads') {
      actions.push({
        key: 'make-fresh',
        label: 'Make Fresh Leads',
        icon: 'cog',
        onClick: () => {
          handleMakeFreshLeads?.();
          closeDropdown();
        },
        disabled: !hasSelection,
        show: true,
      });
    }
    if (pageTitle !== 'Project Leads') {
      actions.push({
        key: 'assign',
        label:
          selectedGroupBy?.length > 0
            ? groupedLeadsTransformLeads
              ? 'Transfer'
              : 'Assign'
            : transformLeads
              ? 'Transfer'
              : 'Assign',
        icon: 'exchange',
        onClick: () => {
          handleAssignLeads?.();
          closeDropdown();
        },
        disabled: !hasSelection,
        show: true,
      });
      actions.push({
        key: 'bulk-update',
        label: 'Bulk Update',
        icon: 'refresh',
        onClick: () => {
          handleBulkUpdate?.();
          closeDropdown();
        },
        disabled: !hasSelection,
        show: true,
      });
    }
    actions.push({
      key: 'reclamation',
      label: 'Reclamation',
      icon: 'user-exclamation',
      onClick: () => {
        setIsReclamationDialogOpen?.(true);
        closeDropdown();
      },
      disabled: !hasSelection,
      show: true,
    });
    actions.push({
      key: isArchivedPage ? 'restore' : 'archive',
      label: isArchivedPage ? 'Restore' : 'Archive',
      icon: isArchivedPage ? 'refresh' : 'server-database',
      onClick: () => {
        if (isArchivedPage) setRestoreConfirmDialogOpen?.(true);
        else setArchiveConfirmDialogOpen?.(true);
        closeDropdown();
      },
      disabled: !hasSelection,
      show: true,
    });
  }

  const visibleActions = actions.filter((a) => a.show);
  const selectedAction = visibleActions.find((a) => a.key === selectedActionKey) || null;

  if (visibleActions.length === 0) return null;

  const selectedActionItems =
    selectedIdsFromStore?.length > 0
      ? selectedIdsFromStore.map((id) => ({ _id: id }))
      : selectedLeads?.length
        ? selectedLeads.map((id) => ({ _id: id }))
        : [];

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-xs text-gray-600 dark:text-[var(--dm-text-secondary)]">Switch To</span>
      <ActionDropDown
        deleteButton={false}
        setDeleteConfirmDialogOpen={() => {}}
        selectedItems={selectedActionItems}
        actionShowOptions={false}
        buttonSize="xs"
        buttonIconClassName="text-sm"
        buttonIconName={selectedAction?.icon || 'repeat'}
        buttonLabel={selectedAction?.label || 'Select'}
      >
        {visibleActions.map((action) => (
          <ActionButton
            key={action.key}
            icon={action.icon}
            onClick={() => {
              if (action.disabled) return;
              if (switchMode) {
                setSelectedActionKey(action.key);
              } else {
                action.onClick();
              }
            }}
            disabled={action.disabled}
            className="disabled:opacity-60"
          >
            {action.label}
          </ActionButton>
        ))}
      </ActionDropDown>
      {switchMode && (
        <>
          <Button
            size="xs"
            variant="default"
            icon={<ApolloIcon name="arrow-right" className="text-sm" />}
            iconAlignment="end"
            disabled={!selectedAction || selectedAction.disabled}
            onClick={() => selectedAction?.onClick()}
          >
            Switch
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
        </>
      )}
    </div>
  );
}
