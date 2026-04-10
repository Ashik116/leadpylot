import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { SourceDetailsForm } from './SourceDetailsForm';
import { SourceFormWrapper } from './SourceFormWrapper';

interface SourceFormSidebarProps {
  type: 'create' | 'edit' | 'changePassword';
  sourceId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function SourceFormSidebar({ type, sourceId, onClose, onSuccess }: SourceFormSidebarProps) {
  if (type === 'edit' && sourceId) {
    return <SourceDetailsForm sourceId={sourceId} onClose={onClose} onSuccess={onSuccess} />;
  }

  if (type === 'create') {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg capitalize">Add New Source</h2>
          <Button
            variant="secondary"
            size="xs"
            icon={<ApolloIcon name="times" className="text-md" />}
            onClick={onClose}
          />
        </div>
        <div className="flex-1">
          <SourceFormWrapper onSuccess={onSuccess} onClose={onClose} />
        </div>
      </div>
    );
  }

  return null;
}
