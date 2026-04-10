'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { searchOpeningsData } from '@/app/(protected-pages)/dashboards/openings/_components/openingsSearchUtils';
import { useSearchBarExpandedStore } from '@/stores/searchBarExpandedStore';

interface BankFilterActionsProps {
  selectedState?: string;
  showCheckboxes?: boolean;
  onToggleCheckboxes?: (show: boolean) => void;
}

const BankFilterActions = ({
  selectedState,
  showCheckboxes = false,
  onToggleCheckboxes,
}: BankFilterActionsProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { isExpanded } = useSearchBarExpandedStore()
  const filterStates = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
    { value: 'stop', label: 'Stop', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
    {
      value: 'blocked',
      label: 'Blocked',
      color: ' bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    },
  ];

  const handleFilterClick = (state: string) => {
    // Toggle filter - if same state is clicked, clear filter
    if (selectedState === state) {
      handleStateChange(undefined);
    } else {
      handleStateChange(state);
    }
  };
  const handleStateChange = (state: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (state) params.set('status', state);
    else params.delete('status');

    // Reset to first page when filtering
    params.set('pageIndex', '1');

    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <div className="flex items-center gap-2">
      {/* Checkbox Toggle Button */}
      <Button
        variant="default"
        size="xs"
        icon={<ApolloIcon name="check-square" />}
        onClick={() => onToggleCheckboxes?.(!showCheckboxes)}
        className={showCheckboxes ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}
      >
        <span className={`${!isExpanded ? 'block' : 'hidden lg:inline-block'}`}>{showCheckboxes ? 'Hide Checkboxes' : 'Show Checkboxes'}</span>
      </Button>

      {/* Create Bank Account Button */}
      <Link href="/admin/banks/create">
        <Button variant="solid" size="xs" icon={<ApolloIcon name="plus" />}>
          <span className={`${!isExpanded ? 'md:block' : 'hidden lg:inline-block'}`}>Create Bank</span>
        </Button>
      </Link>
      {/* Filter Buttons */}
      <div className="flex items-center gap-1">
        {filterStates?.length > 0 &&
          filterStates?.map((state) => (
            <Button
              key={state?.value}
              variant="default"
              size="xs"
              className={` ${selectedState === state?.value ? state?.color : ''
                } transition-all duration-200`}
              onClick={() => handleFilterClick(state?.value)}
            >
              {state?.label}
            </Button>
          ))}
      </div>

      {/* Clear Filter Button */}
      {selectedState && (
        <Button
          variant="plain"
          size="xs"
          onClick={() => handleStateChange(undefined)}
          icon={<ApolloIcon name="times" />}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Clear
        </Button>
      )}
    </div>
  );
};

export default BankFilterActions;
