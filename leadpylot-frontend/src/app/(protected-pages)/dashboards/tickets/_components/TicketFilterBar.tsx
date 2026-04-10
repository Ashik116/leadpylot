'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';

// Ticket status: pending (not done), done (completed)
export type TTicketStatus = 'all' | 'pending' | 'done';
export type TTicketOwnership = 'for_me' | 'all_admin' | 'from_me';
export type TTicketSource = 'offer' | 'lead';

export type TTicketFilter = {
  status: TTicketStatus;
  ownership: TTicketOwnership;
  source: TTicketSource;
};

type TicketFilterBarProps = {
  selectedFilter: TTicketFilter;
  onFilterChange: (filter: TTicketFilter) => void;
};

const TicketFilterBar = ({ selectedFilter, onFilterChange }: TicketFilterBarProps) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  const activeColor = 'bg-black text-white';
  const inactiveColor = 'bg-white text-gray-700 hover:bg-gray-100';

  // Handler for status filter
  const handleStatusChange = (status: TTicketStatus) => {
    onFilterChange({ ...selectedFilter, status });
  };

  // Handler for ownership filter
  const handleOwnershipChange = (ownership: TTicketOwnership) => {
    onFilterChange({ ...selectedFilter, ownership });
  };

  // Handler for source filter
  const handleSourceChange = (source: TTicketSource) => {
    onFilterChange({ ...selectedFilter, source });
  };

  return (
    <div className="flex flex-wrap justify-between items-center gap-3 w-full">
      {/* Level 1: Status Filter - pending (not done), done (completed) */}
      <div className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300">
        <Button
          variant="plain"
          onClick={() => handleStatusChange('all')}
          icon={<ApolloIcon name="list-check" />}
          className={`rounded-none px-3 py-1 text-sm ${selectedFilter.status === 'all' ? activeColor : inactiveColor
            }`}
        >
          All
        </Button>
        <Button
          variant="plain"
          onClick={() => handleStatusChange('pending')}
          icon={<ApolloIcon name="circle" />}
          className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${selectedFilter.status === 'pending' ? activeColor : inactiveColor
            }`}
        >
          Pending
        </Button>
        <Button
          variant="plain"
          onClick={() => handleStatusChange('done')}
          icon={<ApolloIcon name="check" />}
          className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${selectedFilter.status === 'done' ? activeColor : inactiveColor
            }`}
        >
          Done
        </Button>
      </div>
      {/* Level 3: Source Filter (Offer vs Lead) - Offer Tickets only visible to Admins */}
      {isAdmin && (
        <div className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300">
          <Button
            variant="plain"
            onClick={() => handleSourceChange('offer')}
            icon={<ApolloIcon name="tag" />}
            className={`rounded-none px-3 py-1 text-sm ${selectedFilter.source === 'offer' ? activeColor : inactiveColor
              }`}
          >
            Offer <span className="md:inline-block hidden">Tickets</span>
          </Button>
          <Button
            variant="plain"
            onClick={() => handleSourceChange('lead')}
            icon={<ApolloIcon name="user-circle" />}
            className={`rounded-none ${isAdmin ? 'border-l border-gray-300' : ''} px-3 py-1 text-sm ${selectedFilter.source === 'lead' ? activeColor : inactiveColor
              }`}
          >
            Lead <span className="md:inline-block hidden">Tickets</span>
          </Button>
        </div>
      )}
      {/* Level 2: Ownership Filter */}
      <div className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300">
        <Button
          variant="plain"
          onClick={() => handleOwnershipChange('all_admin')}
          icon={<ApolloIcon name="users" />}
          className={`rounded-none px-3 py-1 text-sm ${selectedFilter.ownership === 'all_admin' ? activeColor : inactiveColor
            }`}
        >
          All
        </Button>
        <Button
          variant="plain"
          onClick={() => handleOwnershipChange('for_me')}
          icon={<ApolloIcon name="user-check" />}
          className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${selectedFilter.ownership === 'for_me' ? activeColor : inactiveColor
            }`}
        >
          For <span className="md:inline-block hidden">Me</span>
        </Button>
        <Button
          variant="plain"
          onClick={() => handleOwnershipChange('from_me')}
          icon={<ApolloIcon name="user" />}
          className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${selectedFilter.ownership === 'from_me' ? activeColor : inactiveColor
            }`}
        >
          From  <span className="md:inline-block hidden">Me</span>
        </Button>
      </div>
    </div >
  );
};

export default TicketFilterBar;
