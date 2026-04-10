'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import type { FormMode, ActionFormData } from './quickActions.types';

interface QuickActionFormDialogProps {
  isOpen: boolean;
  mode: FormMode;
  initial: ActionFormData;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: ActionFormData) => void;
}

export function QuickActionFormDialog({
  isOpen,
  mode,
  initial,
  isLoading,
  onClose,
  onSubmit,
}: QuickActionFormDialogProps) {
  const [form, setForm] = useState<ActionFormData>(initial);

  const set =
    (k: keyof ActionFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={560}>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">
          {mode === 'create' ? 'Add Quick Action' : 'Edit Quick Action'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
            <input
              required
              value={form.label}
              onChange={set('label')}
              placeholder="e.g. Lead Summary"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Displayed on the chip button in the chat UI.</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              required
              value={form.message}
              onChange={set('message')}
              rows={3}
              placeholder="e.g. Give me a detailed summary of this lead."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Sent to the AI when the user clicks the chip.</p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={form.slug}
              onChange={set('slug')}
              placeholder="e.g. lead_summary"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Auto-generated if left blank.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="default" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" size="sm" loading={isLoading}>
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
