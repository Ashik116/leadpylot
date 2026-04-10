/**
 * AssignmentFormFields Component
 * Form fields for assignment reason and comments
 */

import Input from '@/components/ui/Input';

interface AssignmentFormFieldsProps {
  reason: string;
  comments: string;
  onReasonChange: (reason: string) => void;
  onCommentsChange: (comments: string) => void;
}

export function AssignmentFormFields({
  reason,
  comments,
  onReasonChange,
  onCommentsChange,
}: AssignmentFormFieldsProps) {
  return (
    <>
      {/* Reason (Optional) */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Assignment Reason (Optional)
        </label>
        <Input
          type="text"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g., Customer inquiry, Follow-up request"
          className="w-full"
        />
      </div>

      {/* Additional Comments */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Additional Comments (Optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          placeholder="Add any notes about this assignment..."
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </>
  );
}

