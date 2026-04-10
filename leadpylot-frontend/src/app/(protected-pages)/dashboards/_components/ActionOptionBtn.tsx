import { ActionButton } from '@/components/shared/ActionBar/ActionDropDown';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';

type TActionOptionBtnProps = {
  config: any;
  selectedRows: any;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setCreateOpeningOpen: (open: boolean) => void;
  setCreateConfirmationDialogOpen: (open: boolean) => void;
  setIsPaymentVoucherDialogOpen: (open: boolean) => void;
};
const ActionOptionBtn = ({
  config,
  selectedRows,
  setIsBulkUpdateDialogOpen,
  setCreateOpeningOpen,
  setCreateConfirmationDialogOpen,
  setIsPaymentVoucherDialogOpen,
}: TActionOptionBtnProps) => {
  const { data: session } = useSession();
  const buttons = [];
  if (config?.showCreateConfirmation && session?.user?.role === Role?.ADMIN) {
    buttons.push(
      <ActionButton
        key="bulk-update"
        icon="gift"
        onClick={() => setIsBulkUpdateDialogOpen(true)}
        disabled={!selectedRows || selectedRows?.length === 0}
      >
        Bulk Update
      </ActionButton>
    );
  }

  if (config?.showCreateOpening) {
    buttons.push(
      <ActionButton
        key="create-opening"
        icon="folder-open"
        onClick={() => setCreateOpeningOpen(true)}
        disabled={!selectedRows || selectedRows?.length === 0}
      >
        Create Opening
      </ActionButton>
    );
  }

  if (config?.showCreateConfirmation && session?.user?.role === Role?.ADMIN) {
    buttons.push(
      <ActionButton
        key="create-confirmation"
        icon="thumbs-up"
        onClick={() => setCreateConfirmationDialogOpen(true)}
        disabled={!selectedRows || selectedRows?.length === 0}
      >
        Send to Confirmation
      </ActionButton>
    );
  }

  if (config?.showCreatePaymentVoucher && session?.user?.role === Role?.ADMIN) {
    buttons.push(
      <ActionButton
        key="create-payment-voucher"
        icon="money-bag"
        onClick={() => setIsPaymentVoucherDialogOpen(true)}
        disabled={!selectedRows || selectedRows?.length === 0}
      >
        Send to Payment Vouchers
      </ActionButton>
    );
  }
  return buttons;
};

export default ActionOptionBtn;
