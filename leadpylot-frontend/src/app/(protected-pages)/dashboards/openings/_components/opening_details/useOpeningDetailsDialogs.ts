import { useState, useCallback } from 'react';
import type { DialogStates, DialogSetters } from './types';

interface UseOpeningDetailsDialogsProps {
  setCreateConfirmationDialogOpenProp?: (open: boolean) => void;
  setIsPaymentVoucherDialogOpenProp?: (open: boolean) => void;
  setIsNettoDialogOpenProp?: (open: boolean) => void;
  setIsBulkNettoDialogOpenProp?: (open: boolean) => void;
  setIsLostDialogOpenProp?: (open: boolean) => void;
  setIsBulkUpdateDialogOpenProp?: (open: boolean) => void;
}

export function useOpeningDetailsDialogs(props: UseOpeningDetailsDialogsProps = {}) {
  const {
    setCreateConfirmationDialogOpenProp,
    setIsPaymentVoucherDialogOpenProp,
    setIsNettoDialogOpenProp,
    setIsBulkNettoDialogOpenProp,
    setIsLostDialogOpenProp,
    setIsBulkUpdateDialogOpenProp,
  } = props;

  // Dialog states
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [createConfirmationDialogOpen, setCreateConfirmationDialogOpenLocal] = useState(false);
  const [isPaymentVoucherDialogOpen, setIsPaymentVoucherDialogOpenLocal] = useState(false);
  const [isNettoDialogOpen, setIsNettoDialogOpenLocal] = useState(false);
  const [isBulkNettoDialogOpen, setIsBulkNettoDialogOpenLocal] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpenLocal] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpenLocal] = useState(false);
  const [isSendToOutDialogOpen, setIsSendToOutDialogOpen] = useState(false);
  const [isCreateOpeningDialogOpen, setIsCreateOpeningDialogOpen] = useState(false);
  const [isSplitPaymentModalOpen, setIsSplitPaymentModalOpen] = useState(false);
  const [isInboundPaymentModalOpen, setIsInboundPaymentModalOpen] = useState(false);
  const [shouldOpenAddForm, setShouldOpenAddForm] = useState(false);

  // Handlers that sync with parent props if provided
  const setCreateConfirmationDialogOpen = useCallback(
    (open: boolean) => {
      setCreateConfirmationDialogOpenLocal(open);
      setCreateConfirmationDialogOpenProp?.(open);
    },
    [setCreateConfirmationDialogOpenProp]
  );

  const setIsPaymentVoucherDialogOpen = useCallback(
    (open: boolean) => {
      setIsPaymentVoucherDialogOpenLocal(open);
      setIsPaymentVoucherDialogOpenProp?.(open);
    },
    [setIsPaymentVoucherDialogOpenProp]
  );

  const setIsNettoDialogOpen = useCallback(
    (open: boolean) => {
      setIsNettoDialogOpenLocal(open);
      setIsNettoDialogOpenProp?.(open);
    },
    [setIsNettoDialogOpenProp]
  );

  const setIsBulkNettoDialogOpen = useCallback(
    (open: boolean) => {
      setIsBulkNettoDialogOpenLocal(open);
      setIsBulkNettoDialogOpenProp?.(open);
    },
    [setIsBulkNettoDialogOpenProp]
  );

  const setIsLostDialogOpen = useCallback(
    (open: boolean) => {
      setIsLostDialogOpenLocal(open);
      setIsLostDialogOpenProp?.(open);
    },
    [setIsLostDialogOpenProp]
  );

  const setIsBulkUpdateDialogOpen = useCallback(
    (open: boolean) => {
      setIsBulkUpdateDialogOpenLocal(open);
      setIsBulkUpdateDialogOpenProp?.(open);
    },
    [setIsBulkUpdateDialogOpenProp]
  );

  const dialogStates: DialogStates = {
    isTicketModalOpen,
    createConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    isNettoDialogOpen,
    isBulkNettoDialogOpen,
    isLostDialogOpen,
    isPaymentHistoryModalOpen,
    isBulkUpdateDialogOpen,
    isSendToOutDialogOpen,
    isCreateOpeningDialogOpen,
    isSplitPaymentModalOpen,
    isInboundPaymentModalOpen,
    shouldOpenAddForm,
  };

  const dialogSetters: DialogSetters = {
    setIsTicketModalOpen,
    setCreateConfirmationDialogOpen,
    setIsPaymentVoucherDialogOpen,
    setIsNettoDialogOpen,
    setIsBulkNettoDialogOpen,
    setIsLostDialogOpen,
    setIsPaymentHistoryModalOpen,
    setIsBulkUpdateDialogOpen,
    setIsSendToOutDialogOpen,
    setIsCreateOpeningDialogOpen,
    setIsSplitPaymentModalOpen,
    setIsInboundPaymentModalOpen,
    setShouldOpenAddForm,
  };

  return { dialogStates, dialogSetters };
}
