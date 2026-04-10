import type { ComponentPropsWithRef, ElementType } from 'react';

export interface ThProps extends ComponentPropsWithRef<'th'> {
  asElement?: ElementType;
}

const Th = (props: ThProps) => {
  const { asElement: Component = 'th', children, ref, className, ...rest } = props;

  return (
    <Component
      className={`p-0.5 text-sm font-medium tracking-normal text-black ${className || ''}`}
      {...rest}
      ref={ref}
    >
      {children}
    </Component>
  );
};

export default Th;
