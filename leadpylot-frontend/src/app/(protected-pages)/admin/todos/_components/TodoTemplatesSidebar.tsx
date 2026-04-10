'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TodoTemplate } from '@/services/AdminTodoService';
import { useDeleteTodoTemplate } from '@/services/hooks/useTodoTemplates';
import TodoTemplateForm from './TodoTemplateForm'

interface TodoTemplatesSidebarProps {
  templates: TodoTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

const TodoTemplatesSidebar: React.FC<TodoTemplatesSidebarProps> = ({
  templates,
  onClose,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TodoTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const deleteMutation = useDeleteTodoTemplate();

  const handleEdit = (template: TodoTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
  };

  const handleDelete = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template? This will not affect existing todos.')) {
      await deleteMutation.mutateAsync(templateId);
      onSuccess();
    }
  };

  const handleFormSuccess = () => {
    setSelectedTemplate(null);
    setIsCreating(false);
    onSuccess();
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5:
        return 'bg-red-100 text-red-600';
      case 4:
        return 'bg-orange-100 text-orange-600';
      case 3:
        return 'bg-yellow-100 text-yellow-600';
      case 2:
        return 'bg-blue-100 text-blue-600';
      case 1:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityLabel = (priority: number) => {
    const labels = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Very Low' };
    return labels[priority as keyof typeof labels] || 'Normal';
  };

  // Show form when creating or editing
  if (isCreating || selectedTemplate) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="plain" size="sm" onClick={handleBack}>
              <ApolloIcon name="arrow-left" className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {isCreating ? 'Create Todo Template' : 'Edit Todo Template'}
            </h2>
          </div>
          <Button variant="plain" size="sm" onClick={onClose}>
            <ApolloIcon name="x" className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <TodoTemplateForm
            template={selectedTemplate}
            onSuccess={handleFormSuccess}
            onCancel={handleBack}
          />
        </div>
      </div>
    );
  }

  // Show templates list
  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Todo Templates</h2>
        <Button variant="plain" size="sm" onClick={onClose}>
          <ApolloIcon name="x" className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure templates that automatically create todos when offers are created.
        </p>
        <Button onClick={handleCreate} className="w-full">
          <ApolloIcon name="plus" className="h-4 w-4 mr-2" />
          Create New Template
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <ApolloIcon name="list-ui" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first template to start automatically generating todos from offers.
            </p>
            <Button onClick={handleCreate}>
              <ApolloIcon name="plus" className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template._id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <Badge
                    className={`text-xs ${getPriorityColor(template.priority)}`}
                  >
                    {getPriorityLabel(template.priority)}
                  </Badge>
                  <Badge
                    className={`text-xs ${template.active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {template.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {template.message}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>
                  {template.auto_assign_to_agent ? 'Auto-assign to agent' : 'Admin only'}
                </span>
                {template.delay_hours > 0 && (
                  <span>Delay: {template.delay_hours}h</span>
                )}
              </div>

              {/* Trigger Conditions Summary */}
              {(template.trigger_conditions.offer_types?.length ||
                template.trigger_conditions.project_ids?.length ||
                template.trigger_conditions.investment_volume_min ||
                template.trigger_conditions.investment_volume_max) && (
                <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <strong>Triggers:</strong>
                  {template.trigger_conditions.offer_types?.length && (
                    <div>Types: {template.trigger_conditions.offer_types.join(', ')}</div>
                  )}
                  {template.trigger_conditions.investment_volume_min && (
                    <div>Min Volume: €{template.trigger_conditions.investment_volume_min.toLocaleString()}</div>
                  )}
                  {template.trigger_conditions.investment_volume_max && (
                    <div>Max Volume: €{template.trigger_conditions.investment_volume_max.toLocaleString()}</div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="plain"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <ApolloIcon name="pen" className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="plain"
                  size="sm"
                  onClick={() => handleDelete(template._id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ApolloIcon name="trash" className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoTemplatesSidebar;
