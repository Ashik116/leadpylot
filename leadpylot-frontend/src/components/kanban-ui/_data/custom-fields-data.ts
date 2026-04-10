import { CustomFieldDefinition } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for custom field definitions
const customFieldsStorage: CustomFieldDefinition[] = [
  {
    id: 'cf-1',
    title: 'Priority',
    field_type: 'select',
    options: ['Low', 'Medium', 'High', 'Critical'],
    required: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-2',
    title: 'Department',
    field_type: 'select',
    options: ['Engineering', 'Design', 'Marketing', 'Sales'],
    required: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-3',
    title: 'Estimated Hours',
    field_type: 'number',
    required: false,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get all custom field definitions
 */
export const getCustomFields = (): CustomFieldDefinition[] => {
  return [...customFieldsStorage];
};

/**
 * Get a custom field definition by ID
 */
export const getCustomFieldById = (id: string): CustomFieldDefinition | undefined => {
  return customFieldsStorage.find((field) => field.id === id);
};

/**
 * Create a new custom field definition
 */
export const createCustomField = (fieldData: Omit<CustomFieldDefinition, 'id' | 'createdAt'>): CustomFieldDefinition => {
  const newField: CustomFieldDefinition = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...fieldData,
  };
  customFieldsStorage.push(newField);
  return newField;
};

/**
 * Update an existing custom field definition
 */
export const updateCustomField = (
  id: string,
  updates: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>
): CustomFieldDefinition | null => {
  const index = customFieldsStorage.findIndex((field) => field.id === id);
  if (index === -1) return null;

  customFieldsStorage[index] = {
    ...customFieldsStorage[index],
    ...updates,
  };
  return customFieldsStorage[index];
};

/**
 * Delete a custom field definition
 */
export const deleteCustomField = (id: string): boolean => {
  const index = customFieldsStorage.findIndex((field) => field.id === id);
  if (index === -1) return false;

  customFieldsStorage.splice(index, 1);
  return true;
};

/**
 * Search custom fields by name (case-insensitive)
 */
export const searchCustomFields = (query: string): CustomFieldDefinition[] => {
  if (!query.trim()) return getCustomFields();

  const lowerQuery = query.toLowerCase();
  return customFieldsStorage.filter((field) =>
    field.title.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Get custom fields by IDs
 */
export const getCustomFieldsByIds = (ids: string[]): CustomFieldDefinition[] => {
  return customFieldsStorage.filter((field) => ids.includes(field.id));
};
