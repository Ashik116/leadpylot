import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TTodoFilter } from './TodoDashboard';

type TodoFilterBtnProps = {
  selectedFilter: TTodoFilter;
  onFilterChange: (filter: TTodoFilter) => void;
  mode: 'todo' | 'ticket';
};

const TodoFilterBtn = ({
  selectedFilter,
  onFilterChange,
  mode,
}: TodoFilterBtnProps) => {
  // Determine active states
  const isDoneActive = selectedFilter?.completedTodos && selectedFilter?.filter === undefined;
  const isFromMeActive = selectedFilter?.filter === 'assigned_by_me';
  const isForMeActive = selectedFilter?.filter === 'assigned_to_me';
  const isPendingActive = selectedFilter?.pendingTodos && selectedFilter?.filter === undefined;
  const isAllActive = !selectedFilter?.completedTodos && !selectedFilter?.pendingTodos && selectedFilter?.filter === undefined;

  const activeColor = 'bg-black text-white';
  const inactiveColor = 'bg-white text-gray-700 hover:bg-gray-100';

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-gray-300">
      <Button
        variant="plain"
        onClick={() =>
          onFilterChange({ completedTodos: true, pendingTodos: false, filter: undefined })
        }
        icon={<ApolloIcon name="check" />}
        className={`rounded-none px-3 py-1 text-sm ${isDoneActive ? activeColor : inactiveColor
          }`}
      >
        Done
      </Button>
      <Button
        variant="plain"
        onClick={() =>
          onFilterChange({ completedTodos: false, pendingTodos: false, filter: 'assigned_by_me' })
        }
        icon={<ApolloIcon name="user" />}
        className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${isFromMeActive ? activeColor : inactiveColor
          }`}
      >
        From Me
      </Button>
      <Button
        variant="plain"
        onClick={() =>
          onFilterChange({ completedTodos: false, pendingTodos: false, filter: 'assigned_to_me' })
        }
        icon={<ApolloIcon name="user-check" />}
        className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${isForMeActive ? activeColor : inactiveColor
          }`}
      >
        For Me
      </Button>
      <Button
        variant="plain"
        onClick={() =>
          onFilterChange({ completedTodos: false, pendingTodos: true, filter: undefined })
        }
        icon={<ApolloIcon name="user-check" />}
        className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${isPendingActive ? activeColor : inactiveColor
          }`}
      >
        Pending
      </Button>
      <Button
        variant="plain"
        onClick={() =>
          onFilterChange({ completedTodos: false, pendingTodos: false, filter: undefined })
        }
        icon={<ApolloIcon name="check-circle" />}
        className={`rounded-none border-l border-gray-300 px-3 py-1 text-sm ${isAllActive ? activeColor : inactiveColor
          }`}
      >
        {mode === 'ticket' ? 'All Ticket' : 'All Todo'}
      </Button>
    </div>
  );
};

export default TodoFilterBtn;
