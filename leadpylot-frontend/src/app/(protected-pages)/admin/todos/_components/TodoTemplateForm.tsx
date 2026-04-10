'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { TodoTemplate, CreateTodoTemplateRequest } from '@/services/AdminTodoService';
import { useCreateTodoTemplate, useUpdateTodoTemplate, useAvailableProjects } from '@/services/hooks/useTodoTemplates';

interface TodoTemplateFormProps {
  template?: TodoTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TodoTemplateForm: React.FC<TodoTemplateFormProps> = ({
  template,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateTodoTemplateRequest>({
    name: '',
    description: '',
    message: '',
    priority: 3,
    auto_assign_to_agent: false,
    delay_hours: 0,
    trigger_conditions: {
      offer_types: [],
      project_ids: [],
    },
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateTodoTemplate();
  const updateMutation = useUpdateTodoTemplate();
  const { data: projectsData } = useAvailableProjects();

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        message: template.message,
        priority: template.priority,
        auto_assign_to_agent: template.auto_assign_to_agent,
        delay_hours: template.delay_hours,
        trigger_conditions: {
          offer_types: template.trigger_conditions.offer_types || [],
          project_ids: template.trigger_conditions.project_ids || [],
          investment_volume_min: template.trigger_conditions.investment_volume_min,
          investment_volume_max: template.trigger_conditions.investment_volume_max,
        },
        active: template.active,
      });
    }
  }, [template]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTriggerConditionChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      trigger_conditions: {
        ...prev.trigger_conditions,
        [field]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message template is required';
    }

    if (formData.trigger_conditions?.investment_volume_min && 
        formData.trigger_conditions?.investment_volume_max &&
        formData.trigger_conditions.investment_volume_min > formData.trigger_conditions.investment_volume_max) {
      newErrors.investment_volume_max = 'Maximum volume must be greater than minimum volume';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (template) {
        await updateMutation.mutateAsync({
          templateId: template._id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const projects = projectsData?.data || [];

  const placeholders = [
    '{{offer_title}}',
    '{{offer_id}}',
    '{{lead_name}}',
    '{{lead_email}}',
    '{{lead_phone}}',
    '{{agent_name}}',
    '{{project_name}}',
    '{{bank_name}}',
    '{{investment_volume}}',
    '{{interest_rate}}',
    '{{current_date}}',
    '{{current_datetime}}',
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      {/* Basic Information */}
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Review Bank Documents"
              className={errors.name ? 'border-red-500' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for this template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <Select 
              value={{ 
                value: String(formData.priority || 3), 
                label: `${formData.priority || 3} - ${['Very Low', 'Low', 'Medium', 'High', 'Critical'][(formData.priority || 3) - 1]}` 
              }}
              onChange={(selected: any) => handleInputChange('priority', parseInt(selected.value))}
              options={[
                { value: '5', label: '5 - Critical' },
                { value: '4', label: '4 - High' },
                { value: '3', label: '3 - Medium' },
                { value: '2', label: '2 - Low' },
                { value: '1', label: '1 - Very Low' }
              ]}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e: any) => handleInputChange('active', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active (template will create todos)
            </label>
          </div>
        </div>
      </Card>

      {/* Message Template */}
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Message Template</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Todo Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e: any) => handleInputChange('message', e.target.value)}
              placeholder="e.g., Review and verify documents for {{lead_name}} - {{offer_title}}"
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Placeholders
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {placeholders.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => {
                    const newMessage = formData.message + (formData.message ? ' ' : '') + placeholder;
                    handleInputChange('message', newMessage);
                  }}
                  className="text-left p-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Assignment Settings */}
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Assignment Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.auto_assign_to_agent}
              onChange={(e: any) => handleInputChange('auto_assign_to_agent', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-assign to offer agent
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delay (hours)
            </label>
            <Input
              type="number"
              min="0"
              value={formData.delay_hours}
              onChange={(e) => handleInputChange('delay_hours', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hours to wait before creating the todo (0 = immediate)
            </p>
          </div>
        </div>
      </Card>

      {/* Trigger Conditions */}
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Trigger Conditions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Leave empty to trigger for all offers, or set conditions to filter when this template should create todos.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Offer Types
            </label>
            <Input
              value={formData.trigger_conditions?.offer_types?.join(', ') || ''}
              onChange={(e) => handleTriggerConditionChange('offer_types', 
                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              )}
              placeholder="e.g., standard, premium (comma separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Projects
            </label>
            <Select 
              value={formData.trigger_conditions?.project_ids?.[0] ? 
                { value: formData.trigger_conditions.project_ids[0], label: projects.find(p => p._id === formData.trigger_conditions?.project_ids?.[0])?.name || 'Unknown' } : 
                null
              }
              onChange={(selected: any) => handleTriggerConditionChange('project_ids', selected ? [selected.value] : [])}
              options={[
                { value: '', label: 'All projects' },
                ...projects.map((project: any) => ({
                  value: project._id,
                  label: project.name
                }))
              ]}
              placeholder="All projects"
              isClearable
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Investment Amount
              </label>
              <Input
                type="number"
                min="0"
                value={formData.trigger_conditions?.investment_volume_min || ''}
                onChange={(e) => handleTriggerConditionChange('investment_volume_min', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                placeholder="e.g., 10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Investment Amount
              </label>
              <Input
                type="number"
                min="0"
                value={formData.trigger_conditions?.investment_volume_max || ''}
                onChange={(e) => handleTriggerConditionChange('investment_volume_max', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                placeholder="e.g., 100000"
                className={errors.investment_volume_max ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="plain" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
        </Button>
      </div>
    </form>
  );
};

export default TodoTemplateForm;
