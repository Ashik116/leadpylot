'use client';

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import { useBulkSearchStore } from '@/stores/bulkSearchStore';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useRef } from 'react';

interface BulkSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartnerIds?: string[]; // For editing mode
  isEditMode?: boolean; // To distinguish between new search and edit mode
}

const BulkSearchModal = ({
  isOpen,
  onClose,
  initialPartnerIds = [],
  isEditMode = false,
}: BulkSearchModalProps) => {
  const [bulkSearchText, setBulkSearchText] = useState<string>('');
  const router = useRouter();
  const hasInitialized = useRef(false);

  // Initialize with existing partner IDs if in edit mode
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      // Defer state updates to avoid cascading renders inside the effect
      setTimeout(() => {
        if (isEditMode && initialPartnerIds.length > 0) {
          setBulkSearchText(initialPartnerIds.join(', '));
        } else if (!isEditMode) {
          setBulkSearchText('');
        }
        hasInitialized.current = true;
      }, 0);
    } else if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, isEditMode, initialPartnerIds]);

  // Bulk search functionality - use store instead of hook
  const { performBulkSearch, isLoading } = useBulkSearchStore();

  // Parse values (can be partner IDs, emails, phones, or mixed) with multiple delimiter support
  const parsedValues = useMemo(() => {
    if (!bulkSearchText.trim()) return [];

    return bulkSearchText
      .split(/[\s,;|]+/) // Split by spaces, commas, semicolons, pipes
      .map((value) => value.trim()) // Trim whitespace
      .filter((value) => value !== '' && value.length > 0) // Filter out empty strings
      .filter((value, index, array) => array.indexOf(value) === index); // Remove duplicates
  }, [bulkSearchText]);

  const handleClose = () => {
    setBulkSearchText('');
    onClose();
  };

  const handleBulkSearch = async () => {
    if (parsedValues.length === 0) {
      return;
    }

    try {
      // Use the store function instead of mutation
      await performBulkSearch(parsedValues);

      // Navigate to leads page if not already there
      if (!window.location.pathname.includes('/dashboards/leads')) {
        router.push('/dashboards/leads');
      }
    } finally {
      // Close modal
      handleClose();
    }
  };

  const hasValidInput = parsedValues.length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={700} closable>
      {/* Header Section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Bulk Search' : 'Bulk Search Leads'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode
                ? 'Add more values (Partner IDs, emails, or phone numbers) to your existing search'
                : 'Search multiple leads by Partner ID, email, phone number, or a mix of all'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto md:max-h-[700px]">
        {/* Input Section */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Values (Partner IDs, emails, or phone numbers)
            {hasValidInput && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {parsedValues.length} value{parsedValues.length !== 1 ? 's' : ''} detected
              </span>
            )}
          </label>

          <div className="space-y-3">
            <Input
              textArea
              rows={8}
              placeholder={
                'Enter Partner IDs, emails, or phone numbers separated by spaces, commas, lines, or other delimiters...\n\n' +
                'Examples:\n' +
                '13434, 234, 44, user@example.com, +491234567\n' +
                '13434 user@example.com +491234567\n' +
                '\nOr one per line:\n' +
                '13434\n' +
                'user@example.com\n' +
                '+491234567'
              }
              className="w-full resize-none border-gray-300 transition-colors focus:border-blue-500 focus:ring-blue-500"
              value={bulkSearchText}
              onChange={(e) => setBulkSearchText(e.target.value)}
            />

            {/* Input Helper Text */}
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <ApolloIcon name="circle" className="mt-0.5 shrink-0 text-sm" />
              <div>
                <p className="mb-1 font-medium">
                  Supported formats (you can mix Partner IDs, emails, and phone numbers):
                </p>
                <ul className="space-y-0.5">
                  <li>
                    • Separated by spaces:{' '}
                    <code className="rounded bg-gray-100 px-1">
                      123 456 789 user@example.com +491234567
                    </code>
                  </li>
                  <li>
                    • Separated by commas:{' '}
                    <code className="rounded bg-gray-100 px-1">
                      123, 456, 789, user@example.com, +491234567
                    </code>
                  </li>
                  <li>• One per line or mixed delimiters</li>
                  <li>• Duplicates will be automatically removed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {hasValidInput && (
          <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                Preview ({parsedValues.length} unique value
                {parsedValues.length !== 1 ? 's' : ''})
              </h4>
              <div className="text-xs text-gray-500">Ready to search</div>
            </div>

            <div className="max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {parsedValues.slice(0, 20).map((value, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
                  >
                    {value}
                  </span>
                ))}
                {parsedValues.length > 20 && (
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    +{parsedValues.length - 20} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-500">
          {hasValidInput ? (
            <span className="flex items-center gap-1">
              <ApolloIcon name="check" className="text-green-500" />
              Ready to search {parsedValues.length} value
              {parsedValues.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <ApolloIcon name="circle" className="text-gray-400" />
              Enter values to continue
            </span>
          )}
        </div>

        <div className="flex w-full items-center justify-center gap-3">
          <Button variant="plain" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleBulkSearch}
            icon={<ApolloIcon name="search" />}
            disabled={!hasValidInput || isLoading}
            loading={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Searching...' : isEditMode ? 'Update Search' : 'Search Leads'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default BulkSearchModal;
