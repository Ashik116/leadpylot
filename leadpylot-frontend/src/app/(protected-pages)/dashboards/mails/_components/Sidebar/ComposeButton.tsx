'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';

interface ComposeButtonProps {
  onClick: () => void;
  isCompact?: boolean;
}

export default function ComposeButton({ onClick, isCompact }: ComposeButtonProps) {
  if (isCompact) {
    return (
      <Tooltip title="Send Mail">
        <Button
          variant="solid"
          size="md"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center"
          onClick={onClick}
          icon={<ApolloIcon name="plus" />}
        />
      </Tooltip>
    );
  }

  return (
    <Button
      variant="solid"
      size="md"
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      onClick={onClick}
      icon={<ApolloIcon name="plus" />}
    >
      Send Mail
    </Button>
  );
}

