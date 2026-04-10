'use client';

import { useExtension } from '@/services/hooks/useFreePBXExtensions';
import ExtensionForm from './ExtensionForm';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface ExtensionFormWrapperProps {
  type?: 'create' | 'edit' | 'view';
  extension?: string;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

const ExtensionFormWrapper = ({
  type = 'create',
  extension,
  onSuccess,
  onClose,
}: ExtensionFormWrapperProps) => {
  // Fetch extension details if we're in edit/view mode
  const { data: extensionData, isLoading } = useExtension(extension || '', {
    enabled: (type === 'edit' || type === 'view') && !!extension,
  });

  // Show loading state
  if ((type === 'edit' || type === 'view') && isLoading) {
    return (
      <Card className='border-none mx-0 p-0 inset-0'>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  // Show create form
  if (type === 'create') {
    return <ExtensionForm onSuccess={onSuccess} onClose={onClose} isPage={true} />;
  }

  // Show edit form (which can also serve as details view in edit mode)
  if ((type === 'edit' || type === 'view') && extensionData) {
    return (
      <ExtensionForm
        initialData={extensionData.data}
        onSuccess={onSuccess}
        onClose={onClose}
        isPage={true}
        mode="edit"
      />
    );
  }

  return null;
};

export default ExtensionFormWrapper;

