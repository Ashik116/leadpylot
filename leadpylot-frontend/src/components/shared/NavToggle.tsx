import type { CommonProps } from '@/@types/common';
import ApolloIcon from '../ui/ApolloIcon';
import classNames from '@/utils/classNames';

export interface NavToggleProps extends CommonProps {
  toggled?: boolean;
}

const NavToggle = ({ toggled, className }: NavToggleProps) => {
  return (
    <div
      className={classNames(
        'relative flex h-9 w-9 cursor-pointer items-center justify-center',
        'rounded-full border border-gray-200 bg-white shadow-sm dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]',
        'transition-all duration-200 ease-in-out',
        'hover:border-gray-300 hover:shadow-md',
        'active:scale-95',

        // Simple toggled state
        toggled && 'border-gray-300 bg-gray-50',

        className
      )}
    >
      <ApolloIcon
        name={toggled ? 'chevron-arrow-right' : 'chevron-arrow-left'}
        className={classNames(
          'hidden text-gray-600 transition-colors duration-200 lg:block',
          toggled ? 'text-gray-700' : 'text-gray-600'
        )}
      />
      <ApolloIcon name="hide-arrow-right" className="opacity-60 lg:hidden" />
    </div>
  );
};

export default NavToggle;
