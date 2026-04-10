import React from 'react';
import { Button, Input } from '../ui';
import ApolloIcon from '../ui/ApolloIcon';

interface ConfirmationInputProps {
  confirmationText: string;
  onConfirm: () => void;
  onCancel: () => void;
  buttonLabel: string;
  isLoading?: boolean;
  className?: string;
  description?: string;
  actionType?: 'destructive' | 'warning';
}

const ConfirmationInput: React.FC<ConfirmationInputProps> = ({
  confirmationText = 'DELETE',
  onConfirm,
  onCancel,
  buttonLabel,
  isLoading = false,
  className = '',
  description,
  actionType = 'destructive',
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const isConfirmed = inputValue === confirmationText;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  // Reset input when component mounts
  React.useEffect(() => {
    setInputValue('');
  }, [confirmationText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  const getVariantClass = () => {
    return actionType === 'destructive' ? 'destructive' : 'solid';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Description */}
      {description && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center">
          <p className="text-sm text-gray-700">{description}</p>
        </div>
      )}

      {/* Confirmation Section */}
      <div className="space-y-2">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">
            To confirm this action, type{' '}
            <span className="font-bold text-red-600">&quot;{confirmationText}&quot;</span> in the
            box below:
          </p>
        </div>

        <div className="">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            className={`text-center transition-all duration-200 ${
              inputValue && !isConfirmed
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                : inputValue && isConfirmed
                  ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                  : 'border-gray-300'
            }`}
            placeholder={confirmationText}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onKeyDown={handleKeyDown}
          />

          {/* Visual feedback */}
          {inputValue && (
            <div className="flex items-center justify-center space-x-2 text-xs">
              {isConfirmed ? (
                <></>
              ) : (
                <>
                  <ApolloIcon name="alert-circle" className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">
                    Type &quot;{confirmationText}&quot; to continue
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading} size='xs' className="w-full ">
          Cancel
        </Button>
        <Button
          variant={getVariantClass()}
          onClick={handleConfirm}
          disabled={!isConfirmed || isLoading}
          loading={isLoading}
          className="w-full"
          size='xs'
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationInput;
