'use client';
import { ApolloIcon } from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useRouter } from 'next/navigation';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { usePathname } from 'next/navigation';

const BACK_BUTTON_TOOLTIP =
  'Back: return to the previous screen. From lead details, this usually goes to the leads list you came from; otherwise it uses the browser back action.';

const BackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { backUrl, clearBackUrl } = useBackNavigationStore();

  const handleBack = () => {
    // Check if we're on a lead details page
    const isLeadDetailsPage =
      pathname?.includes('/dashboards/leads/') && pathname.match(/\/dashboards\/leads\/[^/]+$/);

    if (isLeadDetailsPage && backUrl) {
      // On lead details page: go directly to list page (backUrl)
      router.push(backUrl);
      clearBackUrl();
    } else {
      // On other pages: use normal browser back
      router.back();
    }
  };

  return (
    <Tooltip
      title={BACK_BUTTON_TOOLTIP}
      placement="bottom"
      wrapperClass="inline-flex"
      className="max-w-sm! text-xs leading-snug"
    >
      <Button
        onClick={handleBack}
        variant="plain"
        size="sm"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white p-0 shadow-sm hover:bg-gray-50"
        aria-label="Back"
      >
        <ApolloIcon name="arrow-left" className="text-sm" />
      </Button>
    </Tooltip>
  );
};

export default BackButton;
