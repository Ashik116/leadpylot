/**
 * CommentForm Component - Add comment form
 */

import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface CommentFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const CommentForm = ({ value, onChange, onSubmit, isLoading }: CommentFormProps) => {
  const isDisabled = !value.trim() || isLoading;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a private note about this email..."
        className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
        disabled={isLoading}
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="solid"
          onClick={onSubmit}
          disabled={isDisabled}
          icon={isLoading ? <Spinner size={14} /> : undefined}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Saving...' : 'Add Comment'}
        </Button>
      </div>
    </div>
  );
};

