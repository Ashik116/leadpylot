import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import React from 'react';

interface WiedervorlageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  tooltipTitle: string;
  /** Use inside modals so the tooltip opens on hover without focus quirks */
  tooltipHoverOnly?: boolean;
}

const WiedervorlageButton = ({
  onClick,
  disabled,
  tooltipTitle,
  tooltipHoverOnly,
}: WiedervorlageButtonProps) => {
  const button = (
    <Button
      variant="solid"
      onClick={onClick}
      icon={<ApolloIcon name="refresh" />}
      disabled={disabled}
      className="bg-blue-600 text-white hover:bg-blue-700"
      size="xs"
    >
      Ne
    </Button>
  );

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      wrapperClass="inline-flex"
      className="max-w-sm! text-xs leading-snug"
      hoverOnly={tooltipHoverOnly}
    >
      {button}
    </Tooltip>
  );
};

export default WiedervorlageButton;
