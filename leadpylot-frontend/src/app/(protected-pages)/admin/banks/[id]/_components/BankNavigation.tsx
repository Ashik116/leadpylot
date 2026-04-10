'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useBankNavigation } from './hooks/useBankNavigation';
import { useBankFormSubmission } from './hooks/useBankFormSubmission';

interface BankNavigationProps {
  className?: string;
  onFormSubmit?: () => void;
}

const BankNavigation = ({ className = '', onFormSubmit }: BankNavigationProps) => {
  const { goToPreviousBank, goToNextBank, canGoToPrevious, canGoToNext } = useBankNavigation();
  const { submitForm, getIsSubmitting } = useBankFormSubmission();

  const handleSubmit = () => {
    if (onFormSubmit) {
      onFormSubmit();
    } else {
      submitForm();
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Submit button used for form submission */}
      <Button
        onClick={handleSubmit}
        disabled={getIsSubmitting()}
        loading={getIsSubmitting()}
        variant="solid"
        icon={<ApolloIcon name="file" className="text-md" />}
        className="px-2"
      >
        <span className="hidden md:block">
          {getIsSubmitting() ? 'Updating...' : 'Update Bank'}
        </span>
      </Button>
      {/* Navigation buttons - same pattern as LeadHeader */}
      <Button
        onClick={goToPreviousBank}
        disabled={!canGoToPrevious()}
        icon={<ApolloIcon name="arrow-left" />}
        className="px-2"
      >
        <span className="hidden md:block">Previous</span>
      </Button>
      <Button
        onClick={goToNextBank}
        disabled={!canGoToNext()}
        icon={<ApolloIcon name="arrow-right" />}
        iconAlignment="end"
        className="px-2"
      >
        <span className="hidden md:block">Next</span>
      </Button>

    </div>
  );
};

export default BankNavigation;
