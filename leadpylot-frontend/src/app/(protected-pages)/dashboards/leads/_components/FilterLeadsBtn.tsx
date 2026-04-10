import Button from '@/components/ui/Button';
import type { ButtonProps } from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';

// Array of Object that is for Filter button
type Filter = {
  label: string;
  value: number;
  badge: string;
  variant: ButtonProps['variant'];
};

type TFilterLeadsProps = {
  selectedState: number | undefined;
  setSelectedState: (value: number | undefined) => void;
};
//  in this array for Filter Button
const filters: Filter[] = [
  { label: 'New', value: 0, badge: 'greenNew', variant: 'success' },
  { label: '10 Week duplicate', value: 1, badge: 'yellowDuplicate', variant: 'destructive' },
  { label: 'Duplicate', value: 2, badge: 'Red10week_duplicate', variant: 'solid' },
];

export default function FilterLeads({
  selectedState = undefined,
  setSelectedState = () => {},
}: TFilterLeadsProps) {
  // Function to handle filter button clicks
  const handleFilterClick = (value: number) => {
    // Clear all URL parameters first
    const currentPath = window.location.pathname;
    window.history.replaceState({}, '', currentPath);

    // Then set the filter state
    setSelectedState(selectedState === value ? undefined : value);
  };

  // Function to clear filter
  const clearFilter = () => {
    // Clear all URL parameters
    const currentPath = window.location.pathname;
    window.history.replaceState({}, '', currentPath);

    // Clear the filter state
    setSelectedState(undefined);
  };

  return (
    <div className="flex items-center space-x-2">
      <p className="text-sm whitespace-nowrap">Filter by:</p>
      {filters?.map(({ label, value, badge }, index) => (
        <Button
          // size="sm"
          variant={selectedState === value ? filters[index]?.variant : 'default'}
          key={badge}
          onClick={() => handleFilterClick(value)}
          className="rounded-md"
        >
          {label}
        </Button>
      ))}
      {selectedState !== undefined && (
        <Button
          // size="xs"
          onClick={clearFilter}
          icon={<ApolloIcon name="times" />}
          className="rounded-md"
        />
      )}
    </div>
  );
}
