import type { ComponentPropsWithRef, ElementType } from 'react';

export interface TdProps extends ComponentPropsWithRef<'td'> {
  asElement?: ElementType;
}

const Td = (props: TdProps) => {
  const { asElement: Component = 'td', children, ref, className, ...rest } = props;

  return (
    <Component className={`px-1 py-0 ${className || ''}`} ref={ref} {...rest}>
      {children}
    </Component>
  );
};

export default Td;
