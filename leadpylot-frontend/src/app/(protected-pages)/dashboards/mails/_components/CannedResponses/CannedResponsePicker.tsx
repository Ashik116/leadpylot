'use client';

/**
 * CannedResponsePicker Component
 * Dropdown to select and insert canned responses/templates
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import cannedResponseApiService, { CannedResponse } from '../../_services/CannedResponseApiService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface CannedResponsePickerProps {
  onSelect: (template_content: string, variables?: string[]) => void;
  onClose: () => void;
}

export default function CannedResponsePicker({ onSelect, onClose }: CannedResponsePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch canned responses
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: () => cannedResponseApiService.getCannedResponses(),
  });

  // Extract categories
  const categories = Array.from(
    new Set(responses.map((r: CannedResponse) => r.category).filter(Boolean))
  );

  // Filter responses
  const filteredResponses = responses.filter((response) => {
    const matchesSearch =
      response.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.template_content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || response.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (response: CannedResponse) => {
    onSelect(response.template_content, response.variables);
  };

  // Strip HTML for preview display
  const stripHtml = (html: string | undefined | null) => {
    if (html === null || html === undefined || typeof html !== 'string') return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 absolute right-0 bottom-full left-0 z-50 mb-2 rounded-lg border-2 border-blue-400 bg-white shadow-2xl duration-200"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            <ApolloIcon name="file" className="mr-2 inline" />
            Canned Responses
          </h3>
          <Button onClick={onClose} variant="destructive" size="sm">
            <ApolloIcon name="cross" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <ApolloIcon
            name="search"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
            autoFocus
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category!)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Response List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <ApolloIcon name="loading" className="animate-spin text-2xl text-gray-400" />
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="p-8 text-center">
            <ApolloIcon name="file" className="mb-2 text-4xl text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No templates found' : 'No canned responses yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Create templates to speed up your email responses
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredResponses.map((response) => (
              <button
                key={response._id}
                onClick={() => handleSelect(response)}
                className="group w-full p-4 text-left transition-colors hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                        {response.name}
                      </h4>
                      {response.hotkey && (
                        <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {response.hotkey}
                        </kbd>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {stripHtml(response.template_content)}
                    </p>
                    {response.variables && response.variables.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {response.variables.slice(0, 3).map((variable: string) => (
                          <span
                            key={variable}
                            className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-700"
                            title={`{{${variable}}}`}
                          >
                            {`{{${variable.length > 15 ? variable.substring(0, 15) + '...' : variable}}}`}
                          </span>
                        ))}
                        {response.variables.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{response.variables.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {response.category && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 capitalize">
                      {response.category}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex gap-3">
            <span>
              <kbd className="rounded bg-gray-200 px-1 py-0.5">↑</kbd>
              <kbd className="ml-1 rounded bg-gray-200 px-1 py-0.5">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded bg-gray-200 px-1 py-0.5">Enter</kbd> Select
            </span>
            <span>
              <kbd className="rounded bg-gray-200 px-1 py-0.5">Esc</kbd> Close
            </span>
          </div>
          <span className="text-gray-400">
            {filteredResponses.length} template{filteredResponses.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
