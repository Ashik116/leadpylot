import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';

type TRevertButtonProps = {
  revertInfo: any;
  onRevertClick: (objectId: string, fileName: string) => void;
};

const RevertButton = ({ revertInfo, onRevertClick }: TRevertButtonProps) => {
  if (revertInfo?.revert_info?.is_reverted) {
    return (
      <Button
        icon={<ApolloIcon name="check" className="text-md text-green-500" />}
        size="xs"
        variant="default"
        className="text-sm"
      >
        Reverted
      </Button>
    );
  }
  return (
    <Button
      icon={<ApolloIcon name="rotate-right" className="text-md" />}
      size="xs"
      variant="solid"
      className="text-sm"
      onClick={() => {
        if (onRevertClick) {
          const objectId = revertInfo?._id;
          const fileName = revertInfo?.file?.original_filename || 'Unknown';
          onRevertClick(objectId, fileName);
        }
      }}
    >
      Revert
    </Button>
  );
};

export default RevertButton;
