
import { StageDetailsForm } from './StageDetailsForm';
import { StageFormWrapper } from './StageFormWrapper';

interface StageFormSidebarProps {
  type: 'create' | 'edit' | 'changePassword';
  stageId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function StageFormSidebar({ type, stageId, onClose, onSuccess }: StageFormSidebarProps) {
  if (type === 'edit' && stageId) {
    return <StageDetailsForm stageId={stageId} onClose={onClose} onSuccess={onSuccess} />;
  }

  if (type === 'create') {
    return (
      <div className="flex h-full flex-col">

        <div className="flex-1">
          <StageFormWrapper onSuccess={onSuccess} onClose={onClose} />
        </div>
      </div>
    );
  }

  return null;
}
