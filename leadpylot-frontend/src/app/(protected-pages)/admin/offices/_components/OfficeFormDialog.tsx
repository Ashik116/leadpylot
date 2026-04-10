'use client';

import { useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import FormItem from '@/components/ui/Form/FormItem';
import FormContainer from '@/components/ui/Form/FormContainer';
import Card from '@/components/ui/Card';
import type { Office } from '@/services/OfficeService';

interface OfficeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; country?: string; timezone?: string; capacity?: number }) => void;
  initial?: Office | null;
  loading?: boolean;
}

const defaultTimezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'Europe/London', label: 'Europe/London' },
];

export default function OfficeFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initial,
  loading = false,
}: OfficeFormDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value?.trim();
    if (!name) return;
    const country = (form.elements.namedItem('country') as HTMLInputElement)?.value?.trim() || undefined;
    const timezone = (form.elements.namedItem('timezone') as HTMLSelectElement)?.value || undefined;
    const capacityRaw = (form.elements.namedItem('capacity') as HTMLInputElement)?.value;
    const capacity = capacityRaw ? Number(capacityRaw) : undefined;
    onSubmit({ name, country, timezone, capacity });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={420}>
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">
          {initial ? 'Edit office' : 'New office'}
        </h4>
        <Card className="border-0 shadow-none" bodyClass="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormContainer>
              <FormItem label="Name" asterisk className="text-sm">
                <Input
                  name="name"
                  defaultValue={initial?.name}
                  placeholder="Office name"
                  maxLength={200}
                  required
                  className="w-full rounded-md border-gray-300"
                />
              </FormItem>
              <FormItem label="Country" className="text-sm">
                <Input
                  name="country"
                  defaultValue={initial?.country ?? ''}
                  placeholder="e.g. USA, BD"
                  className="w-full rounded-md border-gray-300"
                />
              </FormItem>
              <FormItem label="Timezone" className="text-sm">
                <select
                  name="timezone"
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  defaultValue={initial?.timezone ?? 'UTC'}
                >
                  {defaultTimezoneOptions.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </FormItem>
              <FormItem label="Capacity (optional)" className="text-sm">
                <Input
                  name="capacity"
                  type="number"
                  min={0}
                  defaultValue={initial?.capacity ?? ''}
                  placeholder="Optional"
                  className="w-full rounded-md border-gray-300"
                />
              </FormItem>
            </FormContainer>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" size="sm" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="solid" loading={loading}>
                {initial ? 'Update Office' : 'Create Office'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Dialog>
  );
}
