import classNames from '../utils/classNames';
import { useConfig } from '../ConfigProvider';
import { useForm } from '../Form/context';
import { useInputGroup } from '../InputGroup/context';
import { CONTROL_SIZES, SIZES } from '../utils/constants';
import { Spinner } from '../Spinner';
import type { CommonProps, TypeAttributes } from '../@types/common';
import type { ReactNode, ComponentPropsWithRef, MouseEvent, ElementType } from 'react';

export interface ButtonProps extends CommonProps, Omit<ComponentPropsWithRef<'button'>, 'onClick'> {
  asElement?: ElementType;
  active?: boolean;
  block?: boolean;
  clickFeedback?: boolean;
  customColorClass?: (state: { active: boolean; unclickable: boolean }) => string;
  disabled?: boolean;
  icon?: string | ReactNode;
  loading?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  ref?: React.Ref<HTMLButtonElement>;
  shape?: TypeAttributes.Shape;
  size?: TypeAttributes.Size;
  variant?: 'solid' | 'plain' | 'default' | 'destructive' | 'secondary' | 'success' | 'liquidGlass';
  iconAlignment?: 'start' | 'end';
  gapClass?: string;
}

type ButtonColor = {
  bgColor: string;
  hoverColor: string;
  activeColor: string;
  textColor: string;
};

const radiusShape: Record<TypeAttributes.Shape, string> = {
  semiRound: 'rounded-sm',
  round: 'rounded-xl',
  circle: 'rounded-full',
  none: 'rounded-none',
};

const Button = (props: ButtonProps) => {
  const {
    asElement: Component = 'button',
    active = false,
    block = false,
    children,
    className,
    clickFeedback = true,
    customColorClass,
    disabled,
    gapClass,
    icon,
    loading = false,
    ref,
    shape = 'semiRound',
    size = SIZES.SM,
    variant = 'default',
    iconAlignment = 'start',
    ...rest
  } = props;
  const { controlSize, ui } = useConfig();
  const formControlSize = useForm()?.size;
  const inputGroupSize = useInputGroup()?.size;
  const defaultClass = 'button';
  const sizeIconClass = 'inline-flex items-center justify-center';

  const buttonSize = size || inputGroupSize || formControlSize || controlSize;
  const feedback = !ui?.button?.disableClickFeedback || clickFeedback;
  const unclickable = disabled || loading;

  const getButtonSize = () => {
    let sizeClass = '';
    switch (buttonSize) {
      case SIZES.LG:
        sizeClass = classNames(
          CONTROL_SIZES.lg.h,
          radiusShape[shape],
          icon && !children
            ? `${CONTROL_SIZES.lg.w} ${sizeIconClass} text-2xl`
            : 'px-8 py-2 text-base'
        );
        break;
      case SIZES.SM:
        sizeClass = classNames(
          CONTROL_SIZES.sm.h,
          shape === 'round' ? 'rounded-xl' : radiusShape[shape],
          icon && !children ? `${CONTROL_SIZES.sm.w} ${sizeIconClass} text-lg` : 'px-2 text-sm'
        );
        break;
      case SIZES.XS:
        sizeClass = classNames(
          CONTROL_SIZES.xs.h,
          shape === 'round' ? 'rounded-lg' : radiusShape[shape],
          icon && !children ? `${CONTROL_SIZES.xs.w} ${sizeIconClass} text-base` : 'px-2 text-xs'
        );
        break;
      default:
        sizeClass = classNames(
          CONTROL_SIZES.md.h,
          radiusShape[shape],
          icon && !children ? `${CONTROL_SIZES.md.w} ${sizeIconClass} text-xl` : 'px-2 text-sm'
        );
        break;
    }
    return sizeClass;
  };

  const disabledClass = 'opacity-50 cursor-not-allowed';

  const solidColor = () => {
    const btn = {
      bgColor: active ? `bg-sunbeam-3` : `bg-sunbeam-2`,
      textColor: 'text-sand-1',
      hoverColor: active ? '' : `hover:bg-sunbeam-3`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const plainColor = () => {
    const btn = {
      bgColor: active ? `` : `hover:bg-sand-5`,
      textColor: `text-sand-1`,
      hoverColor: active ? '' : `hover:text-sand-1`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const defaultColor = () => {
    const btn = {
      bgColor: active ? `bg-gray-100 border border-gray-300` : `bg-white border border-border`,
      textColor: `text-gray-600`,
      hoverColor: active ? '' : `hover:bg-sand-5`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const destructiveColor = () => {
    const btn = {
      bgColor: `bg-rust`,
      textColor: `text-sand-4`,
      hoverColor: `hover:text-white/80 hover:bg-rust/80`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const successColor = () => {
    const btn = {
      bgColor: `bg-evergreen`,
      textColor: `text-white`,
      hoverColor: `hover:text-white/80`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const secondaryColor = () => {
    const btn = {
      bgColor: `bg-sand-1`,
      textColor: `text-white`,
      hoverColor: `hover:bg-sand-2`,
      activeColor: ``,
    };
    return getBtnColor(btn);
  };

  const liquidGlassColor = () => {
    const base = 'liquid-glass-button text-white';
    return `${base} ${unclickable ? disabledClass : ''}`;
  };

  const getBtnColor = ({ bgColor, hoverColor, activeColor, textColor }: ButtonColor) => {
    return `${bgColor} ${unclickable ? disabledClass : hoverColor + ' ' + activeColor
      } ${textColor}`;
  };

  const btnColor = () => {
    switch (variant) {
      case 'solid':
        return solidColor();
      case 'secondary':
        return secondaryColor();
      case 'plain':
        return plainColor();
      case 'default':
        return defaultColor();
      case 'destructive':
        return destructiveColor();
      case 'success':
        return successColor();
      case 'liquidGlass':
        return liquidGlassColor();
      default:
        return defaultColor();
    }
  };

  const classes = classNames(
    defaultClass,
    'inline-flex items-center justify-center',
    btnColor(),
    getButtonSize(),
    className,
    block ? 'w-full' : '',
    feedback && !unclickable && 'button-press-feedback',
    customColorClass?.({
      active,
      unclickable,
    })
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const { onClick } = props;
    if (unclickable) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const renderChildren = () => {
    if (loading && children) {
      return (
        <span className="flex items-center justify-center">
          <Spinner enableTheme={false} className="mr-1" />
          {children}
        </span>
      );
    }

    if (icon && !children && loading) {
      return <Spinner enableTheme={false} />;
    }

    if (icon && !children && !loading) {
      return <>{icon}</>;
    }

    if (icon && children && !loading) {
      return (
        <span
          className={classNames(
            'inline-flex items-center justify-center',
            gapClass ? gapClass : 'gap-1'
          )}
        >
          {iconAlignment === 'start' && icon && (
            <span className="inline-flex shrink-0 items-center">{icon}</span>
          )}
          {children && <span>{children}</span>}
          {iconAlignment === 'end' && icon && (
            <span className="inline-flex shrink-0 items-center">{icon}</span>
          )}
        </span>
      );
    }

    return <>{children}</>;
  };

  return (
    <Component ref={ref} className={classes} type="button" {...rest} onClick={handleClick}>
      {renderChildren()}
    </Component>
  );
};

export default Button;
