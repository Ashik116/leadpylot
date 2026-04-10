'use client';

/**
 * TemplateEditor Component
 * Create and edit canned response templates
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import cannedResponseApiService, { CannedResponse, CreateCannedResponseData } from '../../_services/CannedResponseApiService';

interface TemplateEditorProps {
  template?: CannedResponse;
  onClose: () => void;
  onSave?: () => void;
}

const CATEGORIES = ['sales', 'support', 'follow-up', 'general'];

const CATEGORY_OPTIONS = CATEGORIES.map(cat => ({
  value: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '),
}));
const VARIABLE_SUGGESTIONS = [
  'contact_name',
  'company',
  'project_name',
  'agent_name',
  'date',
  'time',
];

export default function TemplateEditor({ template, onClose, onSave }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({
    name: template?.name || '',
    template_content: template?.template_content || '',
    category: template?.category || 'general',
    hotkey: template?.hotkey || '',
    is_shared: (template as any)?.is_shared ?? true,
    variables: template?.variables || [],
  });

  // Auto-detect variables in content
  useEffect(() => {
    const extractedVars = cannedResponseApiService.extractVariables(formData.template_content);
    setFormData((prev: any) => ({ ...prev, variables: extractedVars }));
  }, [formData.template_content]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: CreateCannedResponseData) => {
      if (template) {
        return cannedResponseApiService.updateCannedResponse(template._id, data);
      }
      return cannedResponseApiService.createCannedResponse(data);
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Template {template ? 'updated' : 'created'} successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      onSave?.();
      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to save template'}
        </Notification>
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => cannedResponseApiService.deleteCannedResponse(template!._id),
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Template deleted successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to delete template'}
        </Notification>
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.template_content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = `${before}{${variable}}${after}`;

    setFormData((prev: any) => ({ ...prev, template_content: newContent }));

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              <ApolloIcon name="file" className="inline mr-2" />
              {template ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ApolloIcon name="cross" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Follow-up Email"
              required
              className="w-full"
            />
          </div>

          {/* Category & Hotkey */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                options={CATEGORY_OPTIONS}
                value={CATEGORY_OPTIONS.find(opt => opt.value === formData.category)}
                onChange={(selected: any) => {
                  setFormData((prev: any) => ({ ...prev, category: selected?.value || 'general' }));
                }}
                className="w-full"
                classNamePrefix="react-select"
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hotkey (optional)
              </label>
              <Input
                type="text"
                value={formData.hotkey || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, hotkey: e.target.value }))}
                placeholder="e.g., Ctrl+1"
                className="w-full"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Content *
            </label>
            <textarea
              id="template-content"
              value={formData.template_content}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, template_content: e.target.value }))}
              placeholder="Hi {contact_name},&#10;&#10;Thank you for your interest in {project_name}...&#10;&#10;Best regards,&#10;{agent_name}"
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use curly braces for variables: {`{contact_name}`}, {`{company}`}, etc.
            </p>
          </div>

          {/* Variable Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Insert Variables
            </label>
            <div className="flex flex-wrap gap-2">
              {VARIABLE_SUGGESTIONS.map(variable => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  {`{${variable}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Detected Variables */}
          {formData.variables && formData.variables.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-2">
                <ApolloIcon name="list-ordered" className="inline mr-1" />
                Detected Variables
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((variable: string) => (
                  <span
                    key={variable}
                    className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                  >
                    {`{${variable}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_shared"
              checked={formData.is_shared}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, is_shared: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_shared" className="ml-2 text-sm text-gray-700">
              Share with team (visible to all team members)
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {template && (
              <Button
                variant="plain"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this template?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <ApolloIcon name="trash" className="mr-1" />
                Delete
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="plain"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              onClick={handleSubmit}
              loading={saveMutation.isPending}
              disabled={!formData.name || !formData.template_content}
            >
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

