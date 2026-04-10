import classNames from 'classnames';
import type { ComponentPropsWithRef, ElementType } from 'react';

export interface TableProps extends ComponentPropsWithRef<'table'> {
  asElement?: ElementType;
  cellBorder?: boolean;
  compact?: boolean;
  hoverable?: boolean;
  overflow?: boolean;
  tableClassName?: string;
  tableWrapperStyle?: React.CSSProperties;
}

const Table = (props: TableProps) => {
  const {
    asElement: Component = 'table',
    cellBorder,
    children,
    className,
    compact = false,
    hoverable = true,
    overflow = true,
    ref,
    tableClassName,
    tableWrapperStyle,
    ...rest
  } = props;

  const tableClass = classNames(
    Component === 'table' ? 'table-default' : 'table-flex',
    hoverable && 'table-hover',
    compact && 'table-compact',
    cellBorder && 'table-border',
    'w-full',
    className
  );

  return (
    <div
      className={classNames(overflow && 'h-full max-h-[80dvh] overflow-x-auto', tableClassName)}
      style={tableWrapperStyle}
    >
      <Component className={tableClass} {...rest} ref={ref}>
        {children}
      </Component>
    </div>
  );
};

export default Table;
