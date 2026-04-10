import { CategoryDetailsForm } from './CategoryDetailsForm';
import { CategoryFormWrapper } from './CategoryFormWrapper';

interface CategoryFormSidebarProps {
  type: 'create' | 'edit';
  categoryId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function CategoryFormSidebar({
  type,
  categoryId,
  onClose,
  onSuccess,
}: CategoryFormSidebarProps) {
  if (type === 'edit' && categoryId) {
    return <CategoryDetailsForm categoryId={categoryId} onClose={onClose} onSuccess={onSuccess} />;
  }

  if (type === 'create') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <CategoryFormWrapper onSuccess={onSuccess} onClose={onClose} />
        </div>
      </div>
    );
  }

  return null;
}
