import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import classNames from '@/utils/classNames';

interface CustomMenuItemProps {
  item: {
    type: 'custom';
    key: string;
    label: string;
    icon?: string;
  };
  isActive: boolean;
  onClick: () => void;
  pendingTaskCount?: number;
}

export const CustomMenuItem = ({
  item,
  isActive,
  onClick,
  pendingTaskCount = 0,
}: CustomMenuItemProps) => {
  return (
    <button
      key={item.key}
      onClick={onClick}
      className={classNames(
        'flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors outline-none focus:ring-0 focus:outline-none',
        isActive
          ? 'bg-primary-50 text-primary-600'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      {item.icon && <VerticalMenuIcon icon={item.icon} />}
      <span className="hidden 2xl:inline">{item.label}</span>
      {pendingTaskCount > 0 && (
        <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
          {pendingTaskCount}
        </span>
      )}
    </button>
  );
};
