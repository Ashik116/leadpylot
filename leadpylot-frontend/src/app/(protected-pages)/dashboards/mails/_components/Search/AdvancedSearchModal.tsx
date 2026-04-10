'use client';

/**
 * AdvancedSearchModal Component
 * Advanced search with filters, operators, and saved searches
 */

import { useState } from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';

interface AdvancedSearchModalProps {
  onClose: () => void;
  onSearch: (filters: any) => void;
}

const searchOperators = [
  { operator: 'from:', description: 'Search by sender email', example: 'from:john@example.com' },
  { operator: 'to:', description: 'Search by recipient', example: 'to:jane@example.com' },
  { operator: 'subject:', description: 'Search in subject line', example: 'subject:invoice' },
  { operator: 'has:attachment', description: 'Emails with attachments', example: 'has:attachment' },
  { operator: 'label:', description: 'Search by label', example: 'label:important' },
  { operator: 'before:', description: 'Before date (YYYY-MM-DD)', example: 'before:2024-01-01' },
  { operator: 'after:', description: 'After date (YYYY-MM-DD)', example: 'after:2024-01-01' },
  { operator: 'is:unread', description: 'Unread emails', example: 'is:unread' },
  { operator: 'is:starred', description: 'Starred emails', example: 'is:starred' },
  { operator: 'is:snoozed', description: 'Snoozed emails', example: 'is:snoozed' },
];

export default function AdvancedSearchModal({ onClose, onSearch }: AdvancedSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    subject: '',
    hasAttachment: false,
    label: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    isUnread: false,
    isStarred: false,
    isSnoozed: false,
  });
  const [showOperators, setShowOperators] = useState(false);

  const handleSearch = () => {
    // Build search query from filters
    const parts: string[] = [];
    if (searchQuery) parts.push(searchQuery);
    if (filters.from) parts.push(`from:${filters.from}`);
    if (filters.to) parts.push(`to:${filters.to}`);
    if (filters.subject) parts.push(`subject:${filters.subject}`);
    if (filters.hasAttachment) parts.push('has:attachment');
    if (filters.label) parts.push(`label:${filters.label}`);
    if (filters.dateFrom) parts.push(`after:${filters.dateFrom.toISOString().split('T')[0]}`);
    if (filters.dateTo) parts.push(`before:${filters.dateTo.toISOString().split('T')[0]}`);
    if (filters.isUnread) parts.push('is:unread');
    if (filters.isStarred) parts.push('is:starred');
    if (filters.isSnoozed) parts.push('is:snoozed');

    const finalQuery = parts.join(' ');
    onSearch({ search: finalQuery });
    onClose();
  };

  const insertOperator = (operator: string) => {
    setSearchQuery(prev => (prev ? `${prev} ${operator}` : operator));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">
              <ApolloIcon name="search" className="inline mr-2" />
              Advanced Search
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ApolloIcon name="cross" className="text-xl" />
            </button>
          </div>

          {/* Main Search Input */}
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails... (try: from:john@example.com subject:invoice)"
              className="w-full text-base"
              autoFocus
            />
            <button
              onClick={() => setShowOperators(!showOperators)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showOperators ? 'Hide' : 'Show'} Operators
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Operators Guide */}
          {showOperators && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                Search Operators
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {searchOperators.map((op) => (
                  <button
                    key={op.operator}
                    onClick={() => insertOperator(op.operator)}
                    className="text-left p-2 rounded-lg hover:bg-blue-100 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-blue-700 font-semibold">
                        {op.operator}
                      </code>
                      <ApolloIcon
                        name="plus"
                        className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{op.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{op.example}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Filter Options
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From (Sender)
                </label>
                <Input
                  type="text"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To (Recipient)
                </label>
                <Input
                  type="text"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  placeholder="jane@example.com"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Contains
                </label>
                <Input
                  type="text"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  placeholder="invoice, meeting, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <DatePicker
                  value={filters.dateFrom}
                  onChange={(date) => setFilters({ ...filters, dateFrom: date })}
                  placeholder="Select start date"
                  className="w-full"
                  clearable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <DatePicker
                  value={filters.dateTo}
                  onChange={(date) => setFilters({ ...filters, dateTo: date })}
                  placeholder="Select end date"
                  className="w-full"
                  clearable
                  minDate={filters.dateFrom || undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <Input
                  type="text"
                  value={filters.label}
                  onChange={(e) => setFilters({ ...filters, label: e.target.value })}
                  placeholder="important, work, etc."
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className=" flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasAttachment"
                  checked={filters.hasAttachment}
                  onChange={(e) => setFilters({ ...filters, hasAttachment: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasAttachment" className="ml-2 text-sm text-gray-700">
                  Has attachments
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isUnread"
                  checked={filters.isUnread}
                  onChange={(e) => setFilters({ ...filters, isUnread: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isUnread" className="ml-2 text-sm text-gray-700">
                  Unread only
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isStarred"
                  checked={filters.isStarred}
                  onChange={(e) => setFilters({ ...filters, isStarred: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isStarred" className="ml-2 text-sm text-gray-700">
                  Starred only
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSnoozed"
                  checked={filters.isSnoozed}
                  onChange={(e) => setFilters({ ...filters, isSnoozed: e.target.checked })}
                  className=" text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isSnoozed" className="ml-2 text-sm text-gray-700">
                  Snoozed emails
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            💡 Tip: Combine multiple operators for powerful searches
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={onClose} icon={<ApolloIcon name="cross" />}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSearch} icon={<ApolloIcon name="search" />}>
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

