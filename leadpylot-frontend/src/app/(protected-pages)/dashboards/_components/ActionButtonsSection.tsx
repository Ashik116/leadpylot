import React from 'react';
import ActionDropDown, {
  ActionButton,
  ActionDropDownContext,
} from '@/components/shared/ActionBar/ActionDropDown';
import type { ButtonProps } from '@/components/ui/Button';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { DashboardType } from './dashboardTypes';
import { usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
// import { DashboardType } from './dashboardTypes';
// import { DashboardType } from './dashboardTypes';

interface ActionButtonsSectionProps {
  config: any;
  selectedRows: any[];
  selectedItems?: any[]; // NEW: Full item objects for actions that need them
  session: any;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setCreateOpeningOpen: (open: boolean) => void;
  setCreateConfirmationDialogOpen: (open: boolean) => void;
  setIsPaymentVoucherDialogOpen: (open: boolean) => void;
  setIsNettoDialogOpen?: (open: boolean) => void;
  setIsBulkNettoDialogOpen?: (open: boolean) => void;
  setIsLostDialogOpen?: (open: boolean) => void;
  setIsSendToOutDialogOpen?: (open: boolean) => void;
  // NEW: allow actions for Agent in grouped offers route
  allowAgentGroupedActions?: boolean;
  // NEW: current progress filter to determine which netto actions to show
  selectedProgressFilter?: string;
  dashboardType?: string;
  // NEW: revert functionality - receives selectedItems when called (for openings revert)
  onRevertOffers?: (items?: any[]) => void;
  isReverting?: boolean;
  // NEW: ticket assignment callbacks (for offer_tickets dashboard)
  onSelfAssignTickets?: () => void;
  onAssignTicketsToOther?: () => void;
  offerId?: string;
  className?: string;
  dropdownButtonSize?: ButtonProps['size'];
  dropdownIconClassName?: string;
  hideSwitchTo?: boolean;
  /** When false: selecting an option runs action immediately (1 click). When true: select then click Switch (2 clicks). */
  switchMode?: boolean;
  /** Override pathname-based detection for Out Offers (e.g. when on lead details tab) */
  isOutOffersPageResolved?: boolean;
  /** Edit selected item(s) - when provided, adds Edit to dropdown (enabled when exactly 1 selected) */
  onEditSelected?: (items: any[]) => void;
  /** Delete selected item(s) - when provided, adds Delete to dropdown. Single: calls this. Multiple: uses setIsBulkDeleteDialogOpen */
  onDeleteSelected?: (items: any[]) => void;
  setIsBulkDeleteDialogOpen?: (open: boolean) => void;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  config,
  selectedRows,
  selectedItems, // NEW: Full item objects
  session,
  setIsBulkUpdateDialogOpen,
  setCreateOpeningOpen,
  setCreateConfirmationDialogOpen,
  setIsPaymentVoucherDialogOpen,
  setIsNettoDialogOpen,
  setIsBulkNettoDialogOpen,
  setIsLostDialogOpen,
  setIsSendToOutDialogOpen,
  allowAgentGroupedActions = false,
  selectedProgressFilter,
  dashboardType,
  onRevertOffers,
  isReverting = false,
  onSelfAssignTickets,
  onAssignTicketsToOther,
  offerId,
  className,
  dropdownButtonSize,
  dropdownIconClassName,
  hideSwitchTo,
  switchMode = true,
  isOutOffersPageResolved,
  onEditSelected,
  onDeleteSelected,
  setIsBulkDeleteDialogOpen,
}) => {
  const pathname = usePathname() as string;
  const isOutOffersPage =
    isOutOffersPageResolved ?? pathname.includes('out-offers');
  const isInActionDropdown = React.useContext(ActionDropDownContext);
  const [selectedActionKey, setSelectedActionKey] = React.useState<string | null>(null);
  const isOpeningDashboard = dashboardType === DashboardType?.OPENING;
  const isOfferDashboard = dashboardType === DashboardType?.OFFER;
  const shouldColorActions = isOpeningDashboard || isOfferDashboard;
  const menuLayoutClassName = shouldColorActions ? 'w-full rounded-none justify-start' : '';

  const actionColorClasses: Record<
    string,
    {
      button: string;
      menuIcon?: string;
    }
  > = {
    // Contract == Openings
    'create-opening': {
      button: '!bg-yellow-300 !text-gray-900 hover:!bg-yellow-300 !border-transparent',
      menuIcon: 'text-yellow-600',
    },
    'create-confirmation': {
      button: '!bg-sky-200 !text-sky-900 hover:!bg-sky-200 !border-transparent',
      menuIcon: 'text-sky-600',
    },
    'create-payment-voucher': {
      button: '!bg-emerald-200 !text-emerald-900 hover:!bg-emerald-200 !border-transparent',
      menuIcon: 'text-emerald-600',
    },
    'sent-to-netto': {
      button: '!bg-green-500 !text-white hover:!bg-green-500 !border-transparent',
      menuIcon: 'text-green-600',
    },
    'bulk-sent-to-netto': {
      button: '!bg-emerald-600 !text-white hover:!bg-emerald-600 !border-transparent',
      menuIcon: 'text-emerald-700',
    },
    'create-lost': {
      button: '!bg-red-500 !text-white hover:!bg-red-500 !border-transparent',
      menuIcon: 'text-red-600',
    },
    'edit-selected': {
      button: '!bg-gray-200 !text-gray-800 hover:!bg-gray-300 !border-transparent',
      menuIcon: 'text-gray-600',
    },
    'delete-selected': {
      button: '!bg-red-100 !text-red-700 hover:!bg-red-200 !border-transparent',
      menuIcon: 'text-red-600',
    },
  };

  const actions: Array<{
    key: string;
    label: React.ReactNode;
    labelText?: string;
    icon?: string;
    iconClassName?: string;
    onClick: () => void;
    disabled?: boolean;
  }> = [];
  const isAdmin = session?.user?.role === Role?.ADMIN;
  const isAgent = session?.user?.role === Role?.AGENT;
  const canShowActions = isAdmin || allowAgentGroupedActions;
  if (config.showRevert && isAdmin) {
    actions.push({
      key: 'revert-options',
      icon: 'ban',
      iconClassName: 'text-rust',
      onClick: () => onRevertOffers && onRevertOffers(selectedItems || []),
      disabled: !selectedRows || selectedRows?.length === 0 || isReverting,
      label: isReverting ? 'Reverting...' : 'Revert',
    });
  }
  // For Agent role: show only "Create Opening" and nothing else
  if (isAgent) {
    if (config?.showCreateOpening) {
      actions.push({
        key: 'create-opening',
        icon: 'folder-open',
        onClick: () => setCreateOpeningOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Create Opening',
      });
    }
    if (dashboardType === DashboardType?.OFFER) {
      actions.push({
        key: isOutOffersPage ? 'revert-from-out' : 'send-to-out-offers',
        icon: 'log-out',
        iconClassName: 'text-rust',
        onClick: () => setIsSendToOutDialogOpen && setIsSendToOutDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        labelText: isOutOffersPage ? 'Revert from Out' : 'Send to Out',
        label: isOutOffersPage ? (
          <div>
            <span className="text-green-500">Revert</span> from Out
          </div>
        ) : (
          <div className="">
            Send to <span className="text-rust">Out</span>
          </div>
        ),
      });
    }
  } else if (canShowActions) {
    if (config?.showBulkUpdate) {
      actions.push({
        key: 'bulk-update',
        icon: 'gift',
        onClick: () => setIsBulkUpdateDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Bulk Update',
      });
    }
    if (config?.showCreateOpening) {
      actions.push({
        key: 'create-opening',
        icon: 'folder-open',
        onClick: () => setCreateOpeningOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Create Opening',
      });
    }
    if (
      dashboardType === DashboardType?.OPENING
        ? selectedProgressFilter === DashboardType?.CONFIRMATION
          ? false
          : selectedProgressFilter === DashboardType?.PAYMENT
            ? false
            : selectedProgressFilter === DashboardType?.NETTO1
              ? false
              : selectedProgressFilter === DashboardType?.NETTO2
                ? false
                : true
        : config?.showCreateConfirmation
    ) {
      actions.push({
        key: 'create-confirmation',
        icon: 'thumbs-up',
        onClick: () => setCreateConfirmationDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Send to Confirmation',
      });
    }

    if (
      dashboardType === DashboardType?.OPENING
        ? selectedProgressFilter === DashboardType?.PAYMENT
          ? false
          : selectedProgressFilter === DashboardType?.NETTO1
            ? false
            : selectedProgressFilter === DashboardType?.NETTO2
              ? false
              : true
        : config?.showCreatePaymentVoucher
    ) {
      actions.push({
        key: 'create-payment-voucher',
        icon: 'money-bag',
        onClick: () => setIsPaymentVoucherDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Send to Payment Vouchers',
      });
    }
    // Show "Send to Lost" based on config flag (hide for offer_tickets dashboard)
    if (config.showLost !== false && dashboardType !== DashboardType?.OFFER_TICKETS) {
      actions.push({
        key: 'create-lost',
        icon: 'ban',
        onClick: () => setIsLostDialogOpen && setIsLostDialogOpen(true),
        label: 'Send to Lost',
      });
    }

    // Show ticket assignment buttons for offer_tickets dashboard
    if (dashboardType === DashboardType?.OFFER_TICKETS) {
      actions.push({
        key: 'self-assign-tickets',
        icon: 'user-check',
        onClick: () => onSelfAssignTickets && onSelfAssignTickets(),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Assign to Me',
      });
      actions.push({
        key: 'assign-tickets-to-other',
        icon: 'users',
        onClick: () => onAssignTicketsToOther && onAssignTicketsToOther(),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Assign to Other',
      });
    }
    // Determine which netto actions to show based on current tab/filter
    // const shouldShowBulkNetto =
    //   (dashboardType === DashboardType.NETTO && selectedProgressFilter === DashboardType.NETTO) || // Netto page "All" tab
    //   dashboardType === DashboardType.OFFER; // Offers page (always show both)

    // const shouldShowSingleNetto =
    //   dashboardType === DashboardType.NETTO || // All netto tabs
    //   (dashboardType === DashboardType.OPENING &&
    //     (selectedProgressFilter === DashboardType.NETTO1 || selectedProgressFilter === DashboardType.NETTO2)) || // Openings Netto 1/2 tabs
    //   dashboardType === DashboardType.OFFER; // Offers page (always show both)

    if (config?.showNetto) {
      actions.push({
        key: 'sent-to-netto',
        icon: 'true-false',
        onClick: () => setIsNettoDialogOpen && setIsNettoDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: 'Send to Netto',
      });
    }
    if (dashboardType === DashboardType?.OFFER) {
      actions.push({
        key: isOutOffersPage ? 'revert-from-out' : 'send-to-out-offers',
        icon: 'log-out',
        iconClassName: 'text-rust',
        onClick: () => setIsSendToOutDialogOpen && setIsSendToOutDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        labelText: isOutOffersPage ? 'Revert from Out' : 'Send to Out',
        label: isOutOffersPage ? (
          <div>
            <span className="text-green-500">Revert</span> from Out
          </div>
        ) : (
          <div className="">
            Send to <span className="text-rust">Out</span>
          </div>
        ),
      });
    }
    if (config?.showBulkNetto) {
      actions.push({
        key: 'bulk-sent-to-netto',
        icon: 'share',
        onClick: () => setIsBulkNettoDialogOpen && setIsBulkNettoDialogOpen(true),
        disabled: !selectedRows || selectedRows?.length === 0,
        label: `Bulk Send to Netto (${selectedRows?.length || 0})`,
      });
    }
    // Edit and Delete in dropdown (lead details offers/out-offers tables)
    if (onEditSelected) {
      actions.push({
        key: 'edit-selected',
        icon: 'pen',
        onClick: () => {
          const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedRows;
          if (Array.isArray(items) && items.length === 1) onEditSelected(items);
        },
        disabled: !selectedRows || selectedRows?.length !== 1,
        label: 'Edit',
      });
    }
    if (onDeleteSelected && isAdmin) {
      actions.push({
        key: 'delete-selected',
        icon: 'trash',
        onClick: () => {
          const items = selectedItems && selectedItems.length > 0 ? selectedItems : selectedRows;
          if (!items?.length) return;
          if (items.length === 1) {
            onDeleteSelected(items);
          } else if (setIsBulkDeleteDialogOpen) {
            setIsBulkDeleteDialogOpen(true);
          }
        },
        disabled: !selectedRows || selectedRows?.length === 0,
        label: selectedRows?.length > 1 ? `Delete (${selectedRows?.length})` : 'Delete',
      });
    }
  }

  const actionKeys = actions.map((action) => action.key).join('|');

  React.useEffect(() => {
    if (!selectedActionKey) {
      return;
    }
    const availableKeys = actionKeys ? actionKeys.split('|') : [];
    if (!availableKeys.includes(selectedActionKey)) {
      setSelectedActionKey(null);
    }
  }, [selectedActionKey, actionKeys]);

  const renderActions = () => {
    if (actions.length === 0) {
      return null;
    }

    if (isInActionDropdown) {
      return (
        <>
          {actions.map((action) => {
            const menuBaseClassName = shouldColorActions
              ? 'text-gray-700 hover:bg-transparent'
              : '';
            const menuClassName = [menuLayoutClassName, menuBaseClassName]
              .filter(Boolean)
              .join(' ')
              .trim();
            const menuIconClassName = shouldColorActions
              ? actionColorClasses[action.key]?.menuIcon || action.iconClassName
              : action.iconClassName;
            return (
              <ActionButton
                key={action.key}
                icon={action.icon}
                iconClassName={menuIconClassName}
                onClick={action.onClick}
                disabled={action.disabled}
                className={menuClassName ? `${menuClassName} disabled:opacity-60` : undefined}
              >
                {action.label}
              </ActionButton>
            );
          })}
        </>
      );
    }

    const containerClassName =
      `${isAgent ? '' : ''}flex min-w-0 items-center gap-2 ${className || ''}`.trim();

    if (hideSwitchTo) {
      return (
        <div className={containerClassName}>
          {actions.map((action) => {
            const buttonClassName = shouldColorActions
              ? actionColorClasses[action.key]?.button
              : undefined;
            return (
              <Button
                key={action.key}
                size={dropdownButtonSize || 'xs'}
                variant="default"
                icon={<ApolloIcon name={action.icon as any} className="text-sm" />}
                onClick={action.onClick}
                disabled={action.disabled}
                className={buttonClassName}
                title={
                  action.labelText || (typeof action.label === 'string' ? action.label : undefined)
                }
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      );
    }

    const selectedActionItems =
      selectedItems && selectedItems.length > 0 ? selectedItems : selectedRows || [];

    const selectedAction = actions.find((action) => action.key === selectedActionKey) || null;
    const selectLabel = selectedAction
      ? selectedAction.labelText ||
        (typeof selectedAction.label === 'string' ? selectedAction.label : 'Select')
      : 'Select';
    const selectIconName = selectedAction?.icon || 'repeat';
    const selectIconClassName = selectedAction?.iconClassName || dropdownIconClassName;
    const selectedButtonClassName =
      shouldColorActions && selectedActionKey
        ? actionColorClasses[selectedActionKey]?.button
        : undefined;

    return (
      <div className={containerClassName}>
        <span className="text-xs text-gray-600">Switch To</span>
        <ActionDropDown
          deleteButton={false}
          setDeleteConfirmDialogOpen={() => {}}
          selectedItems={selectedActionItems}
          buttonSize={dropdownButtonSize || 'xs'}
          buttonIconClassName={`${selectIconClassName} z-50`}
          buttonIconName={selectIconName}
          buttonLabel={typeof selectLabel === 'string' ? selectLabel : undefined}
          buttonClassName={selectedButtonClassName}
        >
          {actions.map((action) => {
            const menuBaseClassName = shouldColorActions
              ? 'text-gray-700 hover:bg-transparent'
              : '';
            const menuClassName = [menuLayoutClassName, menuBaseClassName]
              .filter(Boolean)
              .join(' ')
              .trim();
            const menuIconClassName = shouldColorActions
              ? actionColorClasses[action.key]?.menuIcon || action.iconClassName
              : action.iconClassName;
            return (
              <ActionButton
                key={action.key}
                icon={action.icon}
                iconClassName={menuIconClassName}
                onClick={() => {
                  if (action.disabled) return;
                  if (switchMode) {
                    setSelectedActionKey(action.key);
                  } else {
                    action.onClick();
                  }
                }}
                disabled={action.disabled}
                className={menuClassName ? `${menuClassName} disabled:opacity-60` : undefined}
              >
                {action.label}
              </ActionButton>
            );
          })}
        </ActionDropDown>
        {switchMode && (
          <>
            <Button
              size={dropdownButtonSize || 'xs'}
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
                size={dropdownButtonSize || 'xs'}
                variant="default"
                onClick={() => setSelectedActionKey(null)}
                title="Clear selection"
              >
                <ApolloIcon name="cross" className={dropdownIconClassName || 'text-sm'} />
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  return renderActions();
};

export default ActionButtonsSection;
