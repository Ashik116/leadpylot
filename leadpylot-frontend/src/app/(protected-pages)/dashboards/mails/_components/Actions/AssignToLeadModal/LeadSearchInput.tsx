/**
 * LeadSearchInput Component
 * Search input for finding leads
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import Input from '@/components/ui/Input';

interface LeadSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  minSearchLength?: number;
  onClear?: () => void;
}

export function LeadSearchInput({
  value,
  onChange,
  minSearchLength = 2,
  onClear,
}: LeadSearchInputProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Search Lead <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <ApolloIcon
          name="search"
          className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-10"
          autoFocus
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <ApolloIcon name="cross" className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Type at least {minSearchLength} characters to search
      </p>
    </div>
  );
}

