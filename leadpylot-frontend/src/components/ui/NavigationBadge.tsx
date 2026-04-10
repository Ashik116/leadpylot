import { useTotalPendingTodo } from '@/stores/userStore';

interface NavigationBadgeProps {
  count?: number;
  color?: string;
  variant?: 'solid' | 'tint';
  max?: number;
  menuKey?: string;
  showTitle?: boolean;
}

const NavigationBadge = ({ count, max = 99, menuKey }: NavigationBadgeProps) => {
  const totalPendingTodo = useTotalPendingTodo();

  // Determine the display count based on menu key
  let displayCount = 0;

  if (menuKey === 'dashboard.todo') {
    displayCount = totalPendingTodo;
  } else if (typeof count === 'number') {
    displayCount = count;
  }

  // Don't render badge if count is 0
  if (displayCount <= 0) {
    return null;
  }

  // Limit count to max value
  const finalCount = displayCount > max ? `${max}+` : displayCount.toString();

  return (
    <div className="flex size-5 items-center justify-center rounded-full bg-amber-600 text-center text-xs text-white">
      {finalCount}
    </div>
  );
};

export default NavigationBadge;
