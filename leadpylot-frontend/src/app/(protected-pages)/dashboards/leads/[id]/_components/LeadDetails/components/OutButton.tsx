import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import React from 'react';

const OUT_STATUS_TOOLTIP =
  'Out: sets this lead to the Out status in the negative pipeline so it leaves your active follow-up queue. Use when the opportunity is closed or should not be worked further here.';

interface OutButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const OutButton = ({ onClick, disabled }: OutButtonProps) => {
  return (
    <Tooltip
      title={OUT_STATUS_TOOLTIP}
      placement="top"
      wrapperClass="inline-flex"
      className="max-w-sm! text-xs leading-snug"
    >
      <Button
        variant="default"
        size="xs"
        onClick={onClick}
        icon={<ApolloIcon name="times-circle" />}
        disabled={disabled}
      >
        Out
      </Button>
    </Tooltip>
  );
};

export default OutButton;
