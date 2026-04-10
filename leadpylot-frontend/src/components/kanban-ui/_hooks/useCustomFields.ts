import { useState, useCallback, useMemo } from 'react';
import { CustomFieldDefinition, CustomFieldValue, Task } from '../types';
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  searchCustomFields,
  getCustomFieldsByIds,
} from '../_data/custom-fields-data';

interface UseCustomFieldsOptions {
  initialFieldValues?: CustomFieldValue[];
  onUpdate?: (fieldValues: CustomFieldValue[]) => void;
}

export const useCustomFields = (options?: UseCustomFieldsOptions) => {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(getCustomFields());
  const [searchQuery, setSearchQuery] = useState('');
  const [cardFieldValues, setCardFieldValues] = useState<CustomFieldValue[]>(
    options?.initialFieldValues || []
  );

  // Get filtered fields based on search
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return customFields;
    return searchCustomFields(searchQuery);
  }, [customFields, searchQuery]);

  // Create a new custom field definition
  const handleCreateField = useCallback((fieldData: Omit<CustomFieldDefinition, 'id' | 'createdAt'>) => {
    const newField = createCustomField(fieldData);
    setCustomFields(getCustomFields());
    return newField;
  }, []);

  // Update an existing custom field definition
  const handleUpdateField = useCallback(
    (id: string, updates: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => {
      const updated = updateCustomField(id, updates);
      if (updated) {
        setCustomFields(getCustomFields());
      }
      return updated;
    },
    []
  );

  // Delete a custom field definition
  const handleDeleteField = useCallback((id: string) => {
    const success = deleteCustomField(id);
    if (success) {
      setCustomFields(getCustomFields());
    }
    return success;
  }, []);

  // Get field definitions by IDs
  const getFieldsByIds = useCallback((fieldIds: string[]) => {
    return getCustomFieldsByIds(fieldIds);
  }, []);

  // Get field value for a specific field on a task
  const getFieldValue = useCallback((task: Task, fieldId: string): any => {
    const fieldValue = task.customFields?.find((fv) => fv.fieldId === fieldId);
    return fieldValue?.value;
  }, []);

  // Set field value for a specific field on a task
  const setFieldValue = useCallback((fieldId: string, value: any) => {
    const existingIndex = cardFieldValues.findIndex((fv) => fv.fieldId === fieldId);
    let newFieldValues: CustomFieldValue[];

    if (existingIndex >= 0) {
      // Update existing value
      newFieldValues = [...cardFieldValues];
      newFieldValues[existingIndex] = { fieldId, value };
    } else {
      // Add new value
      newFieldValues = [...cardFieldValues, { fieldId, value }];
    }

    setCardFieldValues(newFieldValues);
    options?.onUpdate?.(newFieldValues);
    return newFieldValues;
  }, [cardFieldValues, options]);

  // Remove field from task
  const removeFieldFromTask = useCallback((fieldId: string) => {
    const newFieldValues = cardFieldValues.filter((fv) => fv.fieldId !== fieldId);
    setCardFieldValues(newFieldValues);
    options?.onUpdate?.(newFieldValues);
    return newFieldValues;
  }, [cardFieldValues, options]);

  // Toggle field on task (add if not present, remove if present)
  const toggleFieldOnTask = useCallback((fieldId: string) => {
    const existingIndex = cardFieldValues.findIndex((fv) => fv.fieldId === fieldId);
    if (existingIndex >= 0) {
      return removeFieldFromTask(fieldId);
    } else {
      // Add with default value based on field type
      const fieldDef = customFields.find((f) => f.id === fieldId);
      let defaultValue: any = null;
      if (fieldDef) {
        if (fieldDef.defaultValue !== undefined) {
          defaultValue = fieldDef.defaultValue;
        } else if (fieldDef.field_type === 'checkbox') {
          defaultValue = false;
        } else if (fieldDef.field_type === 'number') {
          defaultValue = 0;
        } else if (fieldDef.field_type === 'select' && fieldDef.options && fieldDef.options.length > 0) {
          defaultValue = fieldDef.options[0];
        }
      }
      return setFieldValue(fieldId, defaultValue);
    }
  }, [cardFieldValues, customFields, removeFieldFromTask, setFieldValue]);

  // Update field values on card
  const updateCardFieldValues = useCallback((newFieldValues: CustomFieldValue[]) => {
    setCardFieldValues(newFieldValues);
    options?.onUpdate?.(newFieldValues);
  }, [options]);

  return {
    customFields,
    filteredFields,
    searchQuery,
    setSearchQuery,
    createField: handleCreateField,
    updateField: handleUpdateField,
    deleteField: handleDeleteField,
    getFieldsByIds,
    getFieldValue,
    setFieldValue,
    removeFieldFromTask,
    toggleFieldOnTask,
    cardFieldValues,
    updateCardFieldValues,
  };
};
