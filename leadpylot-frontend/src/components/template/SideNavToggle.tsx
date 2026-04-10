import withHeaderItem from '@/utils/hoc/withHeaderItem';
import useTheme from '@/utils/hooks/useTheme';
import classNames from '@/utils/classNames';
import NavToggle from '@/components/shared/NavToggle';
import type { CommonProps } from '@/@types/common';

type SideNavToggleProps = CommonProps & { onToggle?: () => void };

const SideNavToggleBefore = ({ className, onToggle }: SideNavToggleProps) => {
  const { layout, setSideNavCollapse } = useTheme((state) => state);

  const sideNavCollapse = layout.sideNavCollapse;

  const onCollapse = () => {
    setSideNavCollapse(!sideNavCollapse);
    onToggle?.();
  };

  return (
    <div
      className={classNames(
        'absolute top-1/2 -right-4 z-10 hidden border border-transparent shadow-2xl lg:flex',
        'transition-all duration-300 ease-in-out',
        !sideNavCollapse && 'border-gray-100',
        className
      )}
      role="button"
      onClick={onCollapse}
      style={{ transitionProperty: 'border-color, box-shadow' }}
    >
      <NavToggle className="h-7 w-7 shadow-lg" toggled={sideNavCollapse} />
    </div>
  );
};

const SideNavToggle = withHeaderItem<SideNavToggleProps>(SideNavToggleBefore);

export default SideNavToggle;
