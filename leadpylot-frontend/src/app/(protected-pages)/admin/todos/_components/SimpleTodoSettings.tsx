'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { 
  useSimpleTodoTemplates, 
  useCreateSimpleTodoTemplate, 
  useUpdateSimpleTodoTemplate, 
  useDeleteSimpleTodoTemplate 
} from '@/services/hooks/useSimpleTodos';

interface SimpleTodoSettingsProps {
  onClose: () => void;
}

const SimpleTodoSettings: React.FC<SimpleTodoSettingsProps> = ({ onClose }) => {
  const [todoTexts, setTodoTexts] = useState<string[]>(Array(10).fill(''));
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing templates
  const { data: templatesData, isLoading: loadingTemplates } = useSimpleTodoTemplates();
  const createMutation = useCreateSimpleTodoTemplate();
  const updateMutation = useUpdateSimpleTodoTemplate();
  const deleteMutation = useDeleteSimpleTodoTemplate();

  // Load existing templates into form
  useEffect(() => {
    if (templatesData?.data) {
      const newTodoTexts = Array(10).fill('');
      templatesData.data.forEach((template, index) => {
        if (index < 10) {
          newTodoTexts[index] = template.message;
        }
      });
      setTodoTexts(newTodoTexts);
    }
  }, [templatesData]);

  const handleTodoChange = (index: number, value: string) => {
    const newTodoTexts = [...todoTexts];
    newTodoTexts[index] = value;
    setTodoTexts(newTodoTexts);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const existingTemplates = templatesData?.data || [];
      
      // Process each todo text
      for (let i = 0; i < 10; i++) {
        const text = todoTexts[i].trim();
        const existingTemplate = existingTemplates[i];

        if (text && !existingTemplate) {
          // Create new template
          await createMutation.mutateAsync({
            message: text,
            order: i + 1,
          });
        } else if (text && existingTemplate) {
          // Update existing template
          if (existingTemplate.message !== text) {
            await updateMutation.mutateAsync({
              templateId: existingTemplate._id,
              data: { message: text },
            });
          }
        } else if (!text && existingTemplate) {
          // Delete template if text is empty
          await deleteMutation.mutateAsync(existingTemplate._id);
        }
      }

      // Delete any extra templates beyond 10
      for (let i = 10; i < existingTemplates.length; i++) {
        await deleteMutation.mutateAsync(existingTemplates[i]._id);
      }

      onClose();
    } catch (error) {
      console.error('Error saving todo templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingTemplates) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Todo Settings</h2>
          <Button variant="plain" size="sm" onClick={onClose}>
            <ApolloIcon name="x" className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading todo settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Todo Settings</h2>
          <p className="text-sm text-gray-600">Configure todos that will be created for every new offer</p>
        </div>
        <Button variant="plain" size="sm" onClick={onClose}>
          <ApolloIcon name="x" className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-md font-medium mb-2">Default Todos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter up to 10 todo items. These will be automatically created for every new offer.
              Leave empty fields for todos you don&apos;t want to create.
            </p>
          </div>

          <div className="space-y-4">
            {todoTexts.map((text, index) => (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500 w-8">
                  {index + 1}.
                </span>
                <Input
                  value={text}
                  onChange={(e) => handleTodoChange(index, e.target.value)}
                  placeholder={`Todo ${index + 1} (optional)`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="plain" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Todos'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimpleTodoSettings;
