import { Label } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Extended color palette (30 colors)
export const LABEL_COLOR_PALETTE = [
  '#4bce97', // green
  '#f5cd47', // yellow
  '#fea362', // orange
  '#f87168', // red
  '#9f8fef', // purple
  '#579dff', // blue
  '#6cc3e0', // sky
  '#e774bb', // pink
  '#60c6d2', // teal
  '#f5a623', // amber
  '#b7791f', // brown
  '#7f8c8d', // gray
  '#95a5a6', // light gray
  '#34495e', // dark gray
  '#2c3e50', // darker gray
  '#e74c3c', // bright red
  '#3498db', // bright blue
  '#2ecc71', // bright green
  '#f39c12', // bright orange
  '#9b59b6', // bright purple
  '#1abc9c', // turquoise
  '#16a085', // dark turquoise
  '#27ae60', // dark green
  '#c0392b', // dark red
  '#8e44ad', // dark purple
  '#2980b9', // dark blue
  '#d35400', // dark orange
  '#7d3c98', // deep purple
  '#1a237e', // deep blue
  '#004d40', // deep green
];

// In-memory storage for labels
const labelsStorage: Label[] = [
  { id: 'l-1', name: 'Frontend', color: '#f5cd47' },
  { id: 'l-2', name: 'Backend', color: '#4bce97' },
  { id: 'l-3', name: 'Urgent', color: '#f87168' },
  { id: 'l-4', name: 'High Priority', color: '#9f8fef' },
  { id: 'l-5', name: 'Bug', color: '#f87168' },
  { id: 'l-6', name: 'Feature', color: '#579dff' },
  { id: 'l-7', name: 'Documentation', color: '#6cc3e0' },
  { id: 'l-8', name: 'Review', color: '#fea362' },
];

/**
 * Get all labels
 */
export const getLabels = (): Label[] => {
  return [...labelsStorage];
};

/**
 * Get a label by ID
 */
export const getLabelById = (id: string): Label | undefined => {
  return labelsStorage.find((label) => label.id === id);
};

/**
 * Create a new label
 */
export const createLabel = (labelData: Omit<Label, 'id'>): Label => {
  const newLabel: Label = {
    id: uuidv4(),
    ...labelData,
  };
  labelsStorage.push(newLabel);
  return newLabel;
};

/**
 * Update an existing label
 */
export const updateLabel = (id: string, updates: Partial<Omit<Label, 'id'>>): Label | null => {
  const index = labelsStorage.findIndex((label) => label.id === id);
  if (index === -1) return null;

  labelsStorage[index] = {
    ...labelsStorage[index],
    ...updates,
  };
  return labelsStorage[index];
};

/**
 * Delete a label
 */
export const deleteLabel = (id: string): boolean => {
  const index = labelsStorage.findIndex((label) => label.id === id);
  if (index === -1) return false;

  labelsStorage.splice(index, 1);
  return true;
};

/**
 * Search labels by name (case-insensitive)
 */
export const searchLabels = (query: string): Label[] => {
  if (!query.trim()) return getLabels();

  const lowerQuery = query.toLowerCase();
  return labelsStorage.filter((label) =>
    label.name?.toLowerCase().includes(lowerQuery) || false
  );
};

/**
 * Get labels by IDs
 */
export const getLabelsByIds = (ids: string[]): Label[] => {
  return labelsStorage.filter((label) => ids.includes(label.id || ''));
};
