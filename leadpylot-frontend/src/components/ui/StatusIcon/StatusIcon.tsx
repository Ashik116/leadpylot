import { ReactNode } from 'react';
import type { CommonProps, TypeAttributes } from '../@types/common';
import ApolloIcon, { APOLLO_ICONS } from '../ApolloIcon';

export interface StatusIconProps extends CommonProps {
  type: TypeAttributes.Status;
  iconColor?: string;
  custom?: ReactNode | string;
}

const ICONS: Record<
  TypeAttributes.Status,
  {
    color: string;
    name: keyof typeof APOLLO_ICONS;
  }
> = {
  success: {
    color: 'text-evergreen',
    name: 'check-circle',
  },
  info: {
    color: 'text-ocean-1',
    name: 'info-circle',
  },
  warning: {
    color: 'text-ember',
    name: 'alert-circle',
  },
  danger: {
    color: 'text-rust',
    name: 'times-circle',
  },
};

const StatusIcon = (props: StatusIconProps) => {
  const { type = 'info', iconColor } = props;

  const icon = ICONS[type];

  return <ApolloIcon name={icon.name} className={`text-2xl ${iconColor || icon.color}`} />;
};

export default StatusIcon;
