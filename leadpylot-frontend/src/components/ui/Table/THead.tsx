import classNames from 'classnames';
import type { ComponentPropsWithRef, ElementType } from 'react';

export interface THeadProps extends ComponentPropsWithRef<'thead'> {
  asElement?: ElementType;
  headerSticky?: boolean;
}

const THead = (props: THeadProps) => {
  const { asElement: Component = 'thead', children, ref, headerSticky = true, ...rest } = props;

  return (
    <Component
      className={classNames(headerSticky && 'sticky top-0 z-20 bg-white shadow-2xs')}
      {...rest}
      ref={ref}
    >
      {children}
    </Component>
  );
};

export default THead;
