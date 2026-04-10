'use client';

import { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import { useCreateEmailTemplateCategory } from '@/services/hooks/useEmailTemplateCategories';
import { EmailTemplateDetailsForm } from './EmailTemplateDetailsForm';
import { EmailTemplateFormWrapper } from './EmailTemplateFormWrapper';
import CategoryForm from './CategoryForm';

interface EmailTemplateFormSidebarProps {
  type: 'create' | 'edit';
  templateId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function EmailTemplateFormSidebar({
  type,
  templateId,
  onClose,
  onSuccess,
}: EmailTemplateFormSidebarProps) {
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const createCategoryMutation = useCreateEmailTemplateCategory();

  const handleCreateCategorySubmit = useCallback(
    async (payload: { name: string }) => {
      await createCategoryMutation.mutateAsync(payload);
      setCreateCategoryModalOpen(false);
    },
    [createCategoryMutation]
  );

  if (type === 'edit' && templateId) {
    return (
      <>
        <EmailTemplateDetailsForm
          templateId={templateId}
          onSuccess={onSuccess}
          onClose={onClose}
          extraActions={
            <Button
              variant="secondary"
              size="xs"
              icon={<ApolloIcon name="plus" className="text-md" />}
              onClick={() => setCreateCategoryModalOpen(true)}
            >
              Add category
            </Button>
          }
        />
        <Dialog
          isOpen={createCategoryModalOpen}
          onClose={() => setCreateCategoryModalOpen(false)}
          width={420}
          contentClassName="p-6"
        >
          <div className="mb-4 border-b border-gray-200 pb-4">
            <h4 className="text-base font-semibold text-gray-900">Add new category</h4>
          </div>
          <CategoryForm
            onSubmit={handleCreateCategorySubmit}
            onCancel={() => setCreateCategoryModalOpen(false)}
            submitLabel="Create"
            isSubmitting={createCategoryMutation.isPending}
          />
        </Dialog>
      </>
    );
  }

  if (type === 'create') {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between">
          <h2>Add New Email Template</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<ApolloIcon name="times" className="text-md" />}
            onClick={onClose}
          />
        </div>
        <div className="flex-1">
          <EmailTemplateFormWrapper onSuccess={onSuccess} onClose={onClose} />
        </div>
      </div>
    );
  }

  return null;
}
