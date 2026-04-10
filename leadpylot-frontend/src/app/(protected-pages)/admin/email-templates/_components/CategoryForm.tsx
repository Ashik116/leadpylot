'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormFieldGroup from './FormFieldGroup';

export interface CategoryFormInitialData {
  _id: string;
  name: string;
}

interface CategoryFormProps {
  initialData?: CategoryFormInitialData;
  onSubmit: (data: { name: string }) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

async function runSubmit(
  fn: (data: { name: string }) => void | Promise<void>,
  data: { name: string }
) {
  const result = fn(data);
  if (result && typeof (result as Promise<void>).then === 'function') {
    await (result as Promise<void>);
  }
}

export default function CategoryForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTimeout(() => {
        setName(initialData.name);
      }, 0);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    await runSubmit(onSubmit, { name: trimmed });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <FormFieldGroup id="category-name" label="Name" error={error ?? undefined}>
        <Input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name"
          disabled={isSubmitting}
        />
      </FormFieldGroup>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="solid" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
