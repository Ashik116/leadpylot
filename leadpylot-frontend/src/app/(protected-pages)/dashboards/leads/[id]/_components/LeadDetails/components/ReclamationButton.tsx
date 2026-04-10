import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import React from 'react';

const RECLAMATION_TOOLTIP =
  'Reclamation: opens the dialog to start or continue a reclamation for this lead (e.g. customer dispute, reclaim, or claw-back). Use to track compliance and next steps.';

interface ReclamationButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const ReclamationButton = ({ onClick, disabled }: ReclamationButtonProps) => {
  return (
    <Tooltip
      title={RECLAMATION_TOOLTIP}
      placement="top"
      wrapperClass="inline-flex"
      className="max-w-sm! text-xs leading-snug"
    >
      <Button
        variant="destructive"
        size="xs"
        onClick={onClick}
        disabled={disabled}
        className="border-transparent bg-rust hover:bg-rust/80"
        icon={<ApolloIcon name="user-times" />}
      >
        <span className="lg:hidden">Rac</span>
        <span className="hidden lg:inline">Reclamation</span>
      </Button>
    </Tooltip>
  );
};

export default ReclamationButton;
