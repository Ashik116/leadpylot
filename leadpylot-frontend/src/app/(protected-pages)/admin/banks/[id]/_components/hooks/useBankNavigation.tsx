import { useRouter } from 'next/navigation';
import { useBanksNavigationStore } from '@/stores/navigationStores';

export const useBankNavigation = () => {
  const router = useRouter();

  // Get navigation state and functions from the bank navigation store
  const getPreviousBank = useBanksNavigationStore((state) => state.getPreviousItem);
  const getNextBank = useBanksNavigationStore((state) => state.getNextItem);
  const getCurrentPosition = useBanksNavigationStore((state) => state.getCurrentPosition);
  const getTotalBanks = useBanksNavigationStore((state) => state.getTotalItems);
  const setCurrentIndex = useBanksNavigationStore((state) => state.setCurrentIndex);
  const currentIndex = useBanksNavigationStore((state) => state.currentIndex);

  const goToPreviousBank = () => {
    const previousBank = getPreviousBank();
    if (previousBank) {
      // Update the current index to the previous position
      setCurrentIndex(currentIndex - 1);
      router.push(`/admin/banks/${previousBank._id}`);
    } else {
      // Fallback: Navigate to banks list if we can't determine previous bank
      router.push('/admin/banks');
    }
  };

  const goToNextBank = () => {
    const nextBank = getNextBank();
    if (nextBank) {
      // Update the current index to the next position
      setCurrentIndex(currentIndex + 1);
      router.push(`/admin/banks/${nextBank._id}`);
    } else {
      router.push('/admin/banks');
    }
  };

  // Get the current position and total banks count
  const currentPosition = getCurrentPosition();
  const totalBanks = getTotalBanks();

  return {
    currentPosition,
    totalBanks,
    goToPreviousBank,
    goToNextBank,
    canGoToPrevious: useBanksNavigationStore((state) => state.hasPreviousItem),
    canGoToNext: useBanksNavigationStore((state) => state.hasNextItem),
  };
};
