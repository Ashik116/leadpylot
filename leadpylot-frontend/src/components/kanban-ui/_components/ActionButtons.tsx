'use client';

import Button from '@/components/ui/Button';
import { Calendar, CheckSquare, FileText, Plus, Tag, Users } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { AddToCardDropdown } from '../_dropdowns/AddToCardDropdown';
import { ChecklistsDropdown } from '../_dropdowns/checklists/ChecklistsDropdown';
import { CreateCustomFieldDropdown } from '../_dropdowns/custom-fields/CreateCustomFieldDropdown';
import { CustomFieldValueEditor } from '../_dropdowns/custom-fields/CustomFieldValueEditor';
import { CustomFieldsDropdown } from '../_dropdowns/custom-fields/CustomFieldsDropdown';
import { DatesDropdown } from '../_dropdowns/dates/DatesDropdown';
import { CreateLabelDropdown } from '../_dropdowns/labels/CreateLabelDropdown';
import { LabelsDropdown } from '../_dropdowns/labels/LabelsDropdown';
import { UnifiedMemberAssignment } from './MemberComponents/UnifiedMemberAssignment';
import { useLabelsDropdown } from '../_hooks/useLabelsDropdown';
import { CardDates, Checklist, CustomFieldDefinition, CustomFieldValue, Label } from '../types';
import { CompactFileUpload } from './CompactFileUpload';

// ============================================================================
// Action Button Component
// ============================================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  buttonRef,
}) => (
  <Button
    ref={buttonRef}
    onClick={onClick}
    size="xs"
    className="flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
  >
    {icon}
    <span>{label}</span>
  </Button>
);

// ============================================================================
// Main Component
// ============================================================================

interface ActionButtonsProps {
  // Labels
  taskId: string; // Task ID for updating labels
  currentLabels: any[]; // Current labels array from API
  createNewLabel: (data: { name: string; color: string }) => Label;
  editLabel: (id: string, data: { name: string; color: string }) => void;

  // Members
  taskMembers: string[];
  boardId?: string | string[] | Array<{ _id?: string;[key: string]: any }>;

  // Attachments
  compactFileUploadProps?: {
    taskId: string;
    currentAttachments?: string[];
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    onUploadComplete?: () => void;
  };

  // Dates
  taskDates?: CardDates;
  saveDates: (dates: CardDates) => void;
  removeDates: () => void;

  // Checklists
  createChecklist: (title: string, selectedTodoTypeIds?: string[]) => Promise<Checklist>;

  // Custom Fields
  taskCustomFields: CustomFieldValue[];
  currentCustomFields?: Array<{
    _id?: string;
    title: string;
    field_type: string;
    value?: any;
    options?: string[];
  }>;
  getCustomFieldDefinitions: (fieldIds: string[]) => CustomFieldDefinition[];
  createCustomField: (data: Omit<CustomFieldDefinition, 'id' | 'createdAt'>) => CustomFieldDefinition;
  updateCustomFieldDef: (id: string, data: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => void;
  setCustomFieldValue: (fieldId: string, value: any) => void;
  removeCustomFieldValue: (fieldId: string) => void;
  toggleCustomFieldOnTask: (fieldId: string) => void;
  hideBoardFeatures?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  // Labels
  taskId,
  currentLabels,
  createNewLabel,
  editLabel,

  // Members
  taskMembers,
  boardId,

  // Attachments
  compactFileUploadProps,

  // Dates
  taskDates,
  saveDates,
  removeDates,

  // Checklists
  createChecklist,

  // Custom Fields
  taskCustomFields,
  currentCustomFields = [],
  getCustomFieldDefinitions,
  createCustomField,
  updateCustomFieldDef,
  setCustomFieldValue,
  removeCustomFieldValue,
  toggleCustomFieldOnTask,
  hideBoardFeatures = false,
}) => {

  // Refs for dropdown positioning
  const addButtonRef = useRef<HTMLElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const labelsButtonRef = useRef<HTMLElement>(null);
  const datesButtonRef = useRef<HTMLElement>(null);
  const checklistButtonRef = useRef<HTMLElement>(null);
  const membersButtonRef = useRef<HTMLElement>(null);
  const customFieldsButtonRef = useRef<HTMLElement>(null);

  // Use shared hook for LabelsDropdown state management
  const labelsDropdown = useLabelsDropdown({
    createNewLabel,
    editLabel,
  });

  // Dropdown states
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [datesDropdownOpen, setDatesDropdownOpen] = useState(false);
  const [checklistDropdownOpen, setChecklistDropdownOpen] = useState(false);
  const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
  const [customFieldsDropdownOpen, setCustomFieldsDropdownOpen] = useState(false);
  const [createCustomFieldDropdownOpen, setCreateCustomFieldDropdownOpen] = useState(false);
  const [customFieldValueEditorOpen, setCustomFieldValueEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | undefined>();
  const [editingFieldId, setEditingFieldId] = useState<string>('');
  const hasTaskDates = Boolean(taskDates?.dueDate || taskDates?.startDate);
  const labelsTriggerRef = !hideBoardFeatures && !hasTaskDates ? labelsButtonRef : addButtonRef;
  const datesTriggerRef = !hasTaskDates ? datesButtonRef : addButtonRef;
  const membersTriggerRef = !hasTaskDates ? membersButtonRef : addButtonRef;

  const handleSelectOption = (
    option: 'labels' | 'dates' | 'checklist' | 'members' | 'attachment' | 'customFields'
  ) => {
    setAddDropdownOpen(false);
    if (option === 'labels') labelsDropdown.openLabelsDropdown();
    else if (option === 'dates') setDatesDropdownOpen(true);
    else if (option === 'checklist') setChecklistDropdownOpen(true);
    else if (option === 'members') setMembersDropdownOpen(true);
    else if (option === 'customFields') setCustomFieldsDropdownOpen(true);
    else if (option === 'attachment') {
      if (compactFileUploadProps) {
        attachmentInputRef.current?.click();
      }
    }
  };

  // Custom field handlers
  const handleEditCustomFieldValue = (fieldId: string) => {
    const fields = getCustomFieldDefinitions([fieldId]);
    if (fields.length > 0) {
      setEditingField(fields[0]);
      setEditingFieldId(fieldId);
      setCustomFieldsDropdownOpen(false);
      setTimeout(() => setCustomFieldValueEditorOpen(true), 100);
    }
  };

  // const handleCreateCustomField = (fieldData: Omit<CustomFieldDefinition, 'id' | 'createdAt'>) => {
  //   const newField = createCustomField(fieldData);
  //   setCreateCustomFieldDropdownOpen(false);
  //   toggleCustomFieldOnTask(newField.id);
  // };

  // const handleUpdateCustomField = (id: string, fieldData: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => {
  //   updateCustomFieldDef(id, fieldData);
  //   setCreateCustomFieldDropdownOpen(false);
  //   setEditingField(undefined);
  // };

  const handleSaveCustomFieldValue = (value: any) => {
    if (editingFieldId) {
      setCustomFieldValue(editingFieldId, value);
    }
  };

  const handleRemoveCustomFieldValue = () => {
    if (editingFieldId) {
      removeCustomFieldValue(editingFieldId);
    }
  };

  const handleCreateCustomFieldClick = () => {
    setEditingField(undefined);
    setCustomFieldsDropdownOpen(false);
    setCreateCustomFieldDropdownOpen(true);
  };

  const handleBackToCustomFields = () => {
    setCreateCustomFieldDropdownOpen(false);
    setEditingField(undefined);
    setCustomFieldsDropdownOpen(true);
  };

  const getCurrentFieldValue = (): any => {
    if (!editingFieldId) return undefined;
    const fieldValue = taskCustomFields.find((fv) => fv.fieldId === editingFieldId);
    return fieldValue?.value;
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {!hideBoardFeatures && (
          <ActionButton
            icon={<Plus className="h-4 w-4" />}
            label="Add"
            onClick={() => setAddDropdownOpen(!addDropdownOpen)}
            buttonRef={addButtonRef as React.RefObject<HTMLButtonElement>}
          />
        )}

        {!hideBoardFeatures && !hasTaskDates && (
          <ActionButton
            icon={<Tag className="h-4 w-4" />}
            label="Labels"
            onClick={() => {
              setAddDropdownOpen(false);
              labelsDropdown.openLabelsDropdown();
            }}
            buttonRef={labelsButtonRef as React.RefObject<HTMLButtonElement>}
          />
        )}

        {!hasTaskDates && (
          <ActionButton
            icon={<Calendar className="h-4 w-4" />}
            label="Dates"
            onClick={() => {
              setAddDropdownOpen(false);
              setDatesDropdownOpen(true);
            }}
            buttonRef={datesButtonRef as React.RefObject<HTMLButtonElement>}
          />
        )}

        {
           
           !hideBoardFeatures && <> <ActionButton
           icon={<CheckSquare className="h-4 w-4" />}
           label="Subtasks"
           onClick={() => {
             setAddDropdownOpen(false);
             setChecklistDropdownOpen(true);
           }}
           buttonRef={checklistButtonRef as React.RefObject<HTMLButtonElement>}
         />
 
         {!hasTaskDates && (
           <ActionButton
             icon={<Users className="h-4 w-4" />}
             label="Members"
             onClick={() => {
               setAddDropdownOpen(false);
               setMembersDropdownOpen(true);
             }}
             buttonRef={membersButtonRef as React.RefObject<HTMLButtonElement>}
           />
         )}
 
         <ActionButton
           icon={<FileText className="h-4 w-4" />}
           label="Custom Fields"
           onClick={() => {
             setAddDropdownOpen(false);
             setCustomFieldsDropdownOpen(true);
           }}
           buttonRef={customFieldsButtonRef as React.RefObject<HTMLButtonElement>}
         />
         </>
        }
         {!hideBoardFeatures && compactFileUploadProps && (
          <CompactFileUpload
            {...compactFileUploadProps}
            variant="button"
            label="Add attachment"
            inputRef={attachmentInputRef as React.RefObject<HTMLInputElement>}
          />
         )}
      </div>

      {/* Add to Card Dropdown */}
      <AddToCardDropdown
        isOpen={addDropdownOpen}
        onClose={() => setAddDropdownOpen(false)}
        triggerRef={addButtonRef as React.RefObject<HTMLElement>}
        onSelectOption={handleSelectOption}
      />

      {/* Labels Dropdown */}
      <LabelsDropdown
        isOpen={labelsDropdown.labelsDropdownOpen}
        onClose={labelsDropdown.closeLabelsDropdown}
        triggerRef={labelsTriggerRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        currentLabels={currentLabels}
        onCreateLabel={labelsDropdown.handleCreateLabelClick}
        onEditLabel={labelsDropdown.handleEditLabel}
      />

      {/* Create/Edit Label Dropdown */}
      <CreateLabelDropdown
        isOpen={labelsDropdown.createLabelDropdownOpen}
        onClose={labelsDropdown.closeCreateLabelDropdown}
        triggerRef={labelsTriggerRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        editingLabel={labelsDropdown.editingLabel}
        onCreate={labelsDropdown.handleCreateLabel}
        onUpdate={labelsDropdown.handleUpdateLabel}
        onBack={labelsDropdown.editingLabel ? undefined : labelsDropdown.handleBackToLabels}
      />

      {/* Dates Dropdown */}
      <DatesDropdown
        isOpen={datesDropdownOpen}
        onClose={() => setDatesDropdownOpen(false)}
        triggerRef={datesTriggerRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        dates={taskDates}
        onSave={saveDates}
        onRemove={removeDates}
      />

      {/* Checklists Dropdown */}
      <ChecklistsDropdown
        isOpen={checklistDropdownOpen}
        onClose={() => setChecklistDropdownOpen(false)}
        triggerRef={checklistButtonRef as React.RefObject<HTMLElement>}
        onCreate={(title, selectedTodoTypeIds) => createChecklist(title, selectedTodoTypeIds)}
      />

      {/* Members Dropdown */}
      <UnifiedMemberAssignment
        isOpen={membersDropdownOpen}
        onClose={() => setMembersDropdownOpen(false)}
        triggerRef={membersTriggerRef as React.RefObject<HTMLElement>}
        context="task"
        taskId={taskId}
        boardId={boardId}
        assignedMemberIds={taskMembers}
        autoSave={true}
      />

      {/* Custom Fields Dropdown */}
      <CustomFieldsDropdown
        isOpen={customFieldsDropdownOpen}
        onClose={() => {
          setCustomFieldsDropdownOpen(false);
          setEditingField(undefined);
        }}
        triggerRef={customFieldsButtonRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        cardFieldValues={taskCustomFields}
        onEditFieldValue={handleEditCustomFieldValue}
        onCreateField={handleCreateCustomFieldClick}
      />

      {/* Create/Edit Custom Field Dropdown */}
      <CreateCustomFieldDropdown
        isOpen={createCustomFieldDropdownOpen}
        onClose={() => {
          setCreateCustomFieldDropdownOpen(false);
          setEditingField(undefined);
        }}
        triggerRef={customFieldsButtonRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        editingField={editingField ? {
          _id: editingField.id,
          title: editingField.title,
          field_type: editingField.field_type,
          options: editingField.options,
        } : undefined}
        allCustomFields={currentCustomFields}
        onBack={editingField ? undefined : handleBackToCustomFields}
      />

      {/* Custom Field Value Editor */}
      {editingField && (
        <CustomFieldValueEditor
          isOpen={customFieldValueEditorOpen}
          onClose={() => {
            setCustomFieldValueEditorOpen(false);
            setEditingField(undefined);
            setEditingFieldId('');
          }}
          triggerRef={customFieldsButtonRef as React.RefObject<HTMLElement>}
          fieldDefinition={editingField}
          currentValue={getCurrentFieldValue()}
          onSave={handleSaveCustomFieldValue}
          onRemove={handleRemoveCustomFieldValue}
        />
      )}
    </div>
  );
};
