'use client';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const STATUS_OPTIONS = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Accepted' },
  { value: 2, label: 'Rejected' },
];

export interface ResolutionCardProps {
  reason?: string;
  response: string;
  status: number | null;
  onResponseChange: (value: string) => void;
  onStatusChange: (value: number | null) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  canEdit: boolean;
  isPending: boolean;
  isSubmitting: boolean;
}

const ResolutionCard = ({
  reason,
  response,
  status,
  onResponseChange,
  onStatusChange,
  onSubmit,
  canEdit,
  isPending,
  isSubmitting,
}: ResolutionCardProps) => {
  const isEditable = canEdit && isPending;

  return (
    <Card bodyClass="p-4">
      <h6 className="mb-4 font-semibold text-black">Resolution</h6>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600">Reason</label>
          <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
            {reason ?? '—'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">Response</label>
          {isEditable ? (
            <Input
              value={response}
              onChange={(e) => onResponseChange(e.target.value)}
              rows={3}
              textArea
              className="mt-1"
              placeholder="Enter your response to this reclamation"
            />
          ) : (
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {response || '—'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">Status</label>
          {isEditable ? (
            <Select
              value={STATUS_OPTIONS?.find((opt) => opt?.value === status)}
              onChange={(val) => onStatusChange(val?.value ?? null)}
              options={STATUS_OPTIONS}
              className="mt-1"
              isDisabled={isSubmitting}
            />
          ) : (
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {STATUS_OPTIONS?.find((opt) => opt?.value === status)?.label ?? '—'}
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {!canEdit && (
                <span className="text-rust">Only Admin or Provider roles can update status</span>
              )}
            </div>
            {canEdit && (
              <Button
                type="submit"
                variant="solid"
                size="sm"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Update Status
              </Button>
            )}
          </div>
        )}
      </form>
    </Card>
  );
};

export default ResolutionCard;
