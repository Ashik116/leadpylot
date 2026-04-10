'use client';

import Card from '@/components/ui/Card';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useBank } from '@/services/hooks/useSettings';
import { useBanks } from '@/services/hooks/useSettings';
import { useBanksNavigationStore } from '@/stores/navigationStores';
import { GetAllBanksResponse } from '@/services/SettingsService';
import AccessDenied from '@/components/shared/AccessDenied';
import { handleApiError } from '@/utils/errorHandler';
import BankFormWrapperComponent from './_components/BankFormWrapperComponent';
import BankNavigation from './_components/BankNavigation';
import { useBankNavigation } from './_components/hooks/useBankNavigation';
import BankPageSkeleton from './_components/BankPageSkeleton';
import { useRef } from 'react';

function EditBankPage() {
  const { id } = useParams();
  const bankId = id as string;

  // Get bank data
  const { data: bank, isLoading: isBankLoading, error } = useBank(bankId);

  // Get navigation store methods and data
  const setCurrentIndex = useBanksNavigationStore((state) => state.setCurrentIndex);
  const findItemIndexById = useBanksNavigationStore((state) => state.findIndexById);
  const navigationItems = useBanksNavigationStore((state) => state.items);

  // Check if we need to fetch banks data (only if store is empty)
  const shouldFetchBanks = navigationItems.length === 0;
  const { data: banksData, isLoading: isBanksLoading } = useBanks(
    { limit: 100, sortBy: 'state', sortOrder: 'asc' },
    { enabled: shouldFetchBanks }
    //  add this two also sortBy:'state',sortOrder:'asc'
  );

  // Get navigation data for display
  const { currentPosition, totalBanks } = useBankNavigation();

  // Form submission context
  const formRef = useRef<{ submitForm: () => void; isSubmitting: boolean } | null>(null);

  // Store banks in the navigation store when they're loaded (only if needed)
  useEffect(() => {
    if (shouldFetchBanks && banksData) {
      const isGetAllBanksResponse = (data: typeof banksData): data is GetAllBanksResponse => {
        return 'meta' in data && Array.isArray(data.data);
      };

      if (isGetAllBanksResponse(banksData)) {
        if (banksData?.data) {
          // Add these banks to the store only if store is empty
          const addItems = useBanksNavigationStore.getState().addItems;
          addItems(banksData?.data);

          // Set total banks count if available
          const total = banksData?.meta?.total ?? banksData?.data.length;
          if (total) {
            const setTotalItems = useBanksNavigationStore.getState().setTotalItems;
            setTotalItems(total);
          }
        }
      }
    }
  }, [banksData, shouldFetchBanks]);

  // Set the current bank index when the bank data is loaded
  useEffect(() => {
    if (bank && (navigationItems?.length > 0 || banksData?.data)) {
      // Find the index of the current bank in the collection
      const index = findItemIndexById(bank?._id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [bank, navigationItems?.length, banksData?.data, findItemIndexById, setCurrentIndex]);

  if (isBankLoading || (shouldFetchBanks && isBanksLoading)) {
    return <BankPageSkeleton />;
  }

  if (error) {
    const errorResult = handleApiError(error);

    if (errorResult.isAccessDenied) {
      return (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view this bank. Please contact your administrator if you believe this is an error."
        />
      );
    }

    if (errorResult.isNotFound) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <h2 className="mt-4">No bank found with ID: {bankId}</h2>
          <p className="mt-2 text-gray-600">
            This bank may have been deleted or you may not have access to it.
          </p>
        </div>
      );
    }

    return <div className="p-6">Error: {errorResult.errorMessage}</div>;
  }

  if (!bank) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="mt-4">No bank found with ID: {bankId}</h2>
      </div>
    );
  }

  return (
    <Card className="p-2 xl:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-nowrap">{bank?.name}</h1>
          {/* Bank position counter - same pattern as LeadHeader */}
          <div className="text-sm text-gray-500">
            {currentPosition}/{totalBanks}
          </div>
        </div>
        <BankNavigation onFormSubmit={() => formRef.current?.submitForm()} />
      </div>
      <BankFormWrapperComponent ref={formRef} id={bankId} isPage={true} />
    </Card>
  );
}

export default EditBankPage;
