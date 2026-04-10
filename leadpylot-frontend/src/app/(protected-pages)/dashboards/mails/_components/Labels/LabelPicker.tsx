'use client';

/**
 * LabelPicker Component
 * Select and manage email labels
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LabelBadge from './LabelBadge';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface Label {
  _id: string;
  name: string;
  color?: string;
}

interface LabelPickerProps {
  emailId: string;
  currentLabels: Label[];
  availableLabels: Label[];
  onClose: () => void;
}

export default function LabelPicker({
  emailId,
  currentLabels,
  availableLabels,
  onClose,
}: LabelPickerProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(currentLabels);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('blue');

  // Filter available labels
  const filteredLabels = availableLabels.filter(
    (label) =>
      label.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedLabels.find((l) => l._id === label._id)
  );

  // Toggle label selection
  const toggleLabel = (label: Label) => {
    if (selectedLabels.find((l) => l._id === label._id)) {
      setSelectedLabels(selectedLabels.filter((l) => l._id !== label._id));
    } else {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // await EmailApiService.updateLabels(emailId, selectedLabels.map(l => l._id));
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.push(
        <Notification title="Success" type="success">
          Labels updated successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
      onClose();
    },
    onError: (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error.response?.data?.message || 'Failed to update labels'}
        </Notification>
      );
    },
  });

  // Create new label
  const createLabelMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // return await LabelApiService.createLabel({ name: newLabelName, color: newLabelColor });
      return { _id: Date.now().toString(), name: newLabelName, color: newLabelColor };
    },
    onSuccess: (newLabel) => {
      setSelectedLabels([...selectedLabels, newLabel]);
      setShowCreateNew(false);
      setNewLabelName('');
      toast.push(
        <Notification title="Success" type="success">
          Label created successfully
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });

  const colors = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'gray', 'orange'];

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg border-2 border-blue-400 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            <ApolloIcon name="tag" className="inline mr-2" />
            Manage Labels
          </h3>
          <Button
            variant="plain"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            icon={<ApolloIcon name="cross" />}
          />
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search labels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
          prefix={<ApolloIcon name="search" />}
        />
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {/* Selected Labels */}
        {selectedLabels.length > 0 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">Selected Labels</p>
            <div className="flex flex-wrap gap-2">
              {selectedLabels.map((label) => (
                <LabelBadge
                  key={label._id}
                  label={label}
                  onRemove={() => toggleLabel(label)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Labels */}
        <div className="p-4">
          {!showCreateNew ? (
            <>
              {filteredLabels.length > 0 ? (
                <div className="space-y-2">
                  {filteredLabels.map((label) => (
                    <button
                      key={label._id}
                      onClick={() => toggleLabel(label)}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <LabelBadge label={label} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchTerm ? 'No labels found' : 'No more labels available'}
                </p>
              )}

              {/* Create New Button */}
              <button
                onClick={() => setShowCreateNew(true)}
                className="w-full mt-3 p-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <ApolloIcon name="plus" />
                <span className="text-sm font-medium">Create New Label</span>
              </button>
            </>
          ) : (
            /* Create New Label Form */
            <div className="space-y-3">
              <Input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="w-full"
                autoFocus
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newLabelColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor: `var(--color-${color}-200, #${color === 'gray' ? 'e5e7eb' : '93c5fd'})`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="plain"
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewLabelName('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="solid"
                  onClick={() => createLabelMutation.mutate()}
                  disabled={!newLabelName.trim() || createLabelMutation.isPending}
                  loading={createLabelMutation.isPending}
                  className="flex-1"
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {selectedLabels.length} label{selectedLabels.length !== 1 ? 's' : ''} selected
        </span>
        <Button
          size="sm"
          variant="solid"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          loading={saveMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

