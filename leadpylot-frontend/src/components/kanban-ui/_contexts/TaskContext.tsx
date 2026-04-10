'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode
} from 'react';
import {
  Task,
  Comment,
  CardDates,
  Checklist,
  ChecklistItem,
  Label,
  Member,
  CustomFieldDefinition,
  CustomFieldValue,
  Attachment,
  ReminderOption
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  getLabels,
  createLabel,
  updateLabel as updateLabelData,
  deleteLabel as deleteLabelData,
  getLabelsByIds
} from '../_data/labels-data';
import { getMembers, getMembersByIds } from '../_data/members-data';
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCustomFieldsByIds
} from '../_data/custom-fields-data';
import { calculateChecklistProgress } from '../_data/checklists-data';
import {
  formatDateForDisplay,
  calculateDateStatus,
  getDateStatusBadge,
} from '../_data/dates-data';
import { TLabel } from '@/services/TaskService';

// ============================================================================
// Types
// ============================================================================

interface TaskContextValue {
  // Task data
  task: Task;
  title: string;
  description: string;
  isCompleted: boolean;
  isSummarizing: boolean;

  // Labels
  taskLabels: TLabel[];
  taskLabelObjects: Label[];
  allLabels: Label[];
  toggleLabel: (label: TLabel) => void;
  createNewLabel: (data: { name: string; color: string }) => Label;
  editLabel: (id: string, data: { name: string; color: string }) => void;
  removeLabel: (id: string) => void;

  // Members
  taskMembers: string[];
  taskMemberObjects: Member[];
  allMembers: Member[];
  toggleMember: (memberId: string) => void;

  // Dates
  taskDates?: CardDates;
  formattedDate: string | null;
  dateStatus: 'overdue' | 'due-soon' | 'due-today' | 'upcoming' | 'complete' | null;
  dateStatusBadge: { color: string; text: string } | null;
  hasDates: boolean;
  saveDates: (dates: CardDates) => void;
  removeDates: () => void;

  // Checklists
  checklists: Checklist[];
  createChecklist: (title: string) => Checklist;
  updateChecklist: (id: string, updates: Partial<Omit<Checklist, 'id'>>) => void;
  deleteChecklist: (id: string) => void;
  addChecklistItem: (checklistId: string, text: string, metadata?: { assignedMembers?: string[]; dueDate?: string; dueTime?: string; reminder?: ReminderOption }) => ChecklistItem;
  updateChecklistItem: (checklistId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id'>>) => void;
  deleteChecklistItem: (checklistId: string, itemId: string) => void;
  toggleChecklistItem: (checklistId: string, itemId: string) => void;
  setChecklistItemDueDate: (checklistId: string, itemId: string, date?: string, time?: string, reminder?: ReminderOption) => void;
  removeChecklistItemDueDate: (checklistId: string, itemId: string) => void;
  assignChecklistMembers: (checklistId: string, itemId: string, memberIds: string[]) => void;
  getChecklistProgress: (checklistId: string) => number;

  // Custom Fields
  customFields: CustomFieldDefinition[];
  taskCustomFields: CustomFieldValue[];
  getCustomFieldDefinitions: (fieldIds: string[]) => CustomFieldDefinition[];
  createCustomField: (data: Omit<CustomFieldDefinition, 'id' | 'createdAt'>) => CustomFieldDefinition;
  updateCustomFieldDef: (id: string, data: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => void;
  deleteCustomFieldDef: (id: string) => void;
  setCustomFieldValue: (fieldId: string, value: any) => void;
  removeCustomFieldValue: (fieldId: string) => void;
  toggleCustomFieldOnTask: (fieldId: string) => void;

  // Attachments
  attachments: Attachment[];
  uploadFiles: (files: File[]) => void;
  deleteAttachment: (attachmentId: string) => void;
  downloadAttachment: (attachment: Attachment) => void;

  // Comments
  comments: Comment[];
  addComment: (comment: Comment) => void;

  // Actions
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  toggleComplete: () => void;
  summarize: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface TaskProviderProps {
  children: ReactNode;
  task: Task;
  onUpdate: (task: Task) => void;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({
  children,
  task,
  onUpdate,
}) => {
  // Local state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [taskLabels, setTaskLabels] = useState<TLabel[]>(task.labels);
  const [taskMembers, setTaskMembers] = useState<string[]>(task.members || []);
  const [taskDates, setTaskDates] = useState<CardDates | undefined>(task.dates);
  const [checklists, setChecklists] = useState<Checklist[]>(task.checklists || []);
  const [taskCustomFields, setTaskCustomFields] = useState<CustomFieldValue[]>(task.customFields || []);
  const [attachments, setAttachments] = useState<Attachment[]>(task.attachments || []);
  const [comments, setComments] = useState<Comment[]>(task.comments);

  // All available data
  const [allLabels, setAllLabels] = useState<Label[]>(getLabels());
  const [allMembers] = useState<Member[]>(getMembers());
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(getCustomFields());

  // Track task ID changes
  const prevTaskId = useRef(task.id);

  // Sync when task changes
  useEffect(() => {
    if (prevTaskId.current !== task.id) {
      setTitle(task.title);
      setDescription(task.description);
      setIsCompleted(task.isCompleted);
      setTaskLabels(task.labels);
      setTaskMembers(task.members || []);
      setTaskDates(task.dates);
      setChecklists(task.checklists || []);
      setTaskCustomFields(task.customFields || []);
      setAttachments(task.attachments || []);
      setComments(task.comments);
      prevTaskId.current = task.id;
    }
  }, [task]);

  // Helper to update the task
  const updateTask = useCallback((updates: Partial<Task>) => {
    onUpdate({ ...task, ...updates });
  }, [task, onUpdate]);

  // ============================================================================
  // Labels
  // ============================================================================

  const taskLabelObjects = useMemo(() => getLabelsByIds(taskLabels.map((label) => label._id)), [taskLabels]);

  const toggleLabel = useCallback((label: TLabel) => {
    const newLabels = taskLabels.includes(label)
      ? taskLabels.filter((l) => l._id !== label._id)
      : [...taskLabels, label];
    setTaskLabels(newLabels);
    updateTask({ labels: newLabels });
  }, [taskLabels, updateTask]);

  const createNewLabel = useCallback((data: { name: string; color: string }) => {
    const newLabel = createLabel(data);
    setAllLabels(getLabels());
    return newLabel;
  }, []);

  const editLabel = useCallback((id: string, data: { name: string; color: string }) => {
    updateLabelData(id, data);
    setAllLabels(getLabels());
  }, []);

  const removeLabel = useCallback((id: string) => {
    deleteLabelData(id);
    setAllLabels(getLabels());
    // Also remove from task if present
    if (taskLabels.some((label) => label._id === id)) {
      const newLabels = taskLabels.filter((label) => label._id !== id);
      setTaskLabels(newLabels);
      updateTask({ labels: newLabels });
    }
  }, [taskLabels, updateTask]);

  // ============================================================================
  // Members
  // ============================================================================

  const taskMemberObjects = useMemo(() => getMembersByIds(taskMembers), [taskMembers]);

  const toggleMember = useCallback((memberId: string) => {
    const newMembers = taskMembers.includes(memberId)
      ? taskMembers.filter((id) => id !== memberId)
      : [...taskMembers, memberId];
    setTaskMembers(newMembers);
    updateTask({ members: newMembers });
  }, [taskMembers, updateTask]);

  // ============================================================================
  // Dates
  // ============================================================================

  const formattedDate = useMemo(() => {
    if (!taskDates?.dueDate) return null;
    return formatDateForDisplay(taskDates.dueDate, taskDates.dueTime);
  }, [taskDates]);

  const dateStatus = useMemo(() => {
    return calculateDateStatus(taskDates?.dueDate, taskDates?.dueTime);
  }, [taskDates]);

  const dateStatusBadge = useMemo(() => {
    return getDateStatusBadge(dateStatus);
  }, [dateStatus]);

  const hasDates = !!taskDates?.startDate || !!taskDates?.dueDate;

  const saveDates = useCallback((dates: CardDates) => {
    setTaskDates(dates);
    updateTask({ dates });
  }, [updateTask]);

  const removeDates = useCallback(() => {
    setTaskDates(undefined);
    updateTask({ dates: undefined });
  }, [updateTask]);

  // ============================================================================
  // Checklists
  // ============================================================================

  const createChecklist = useCallback((checklistTitle: string): Checklist => {
    const newChecklist: Checklist = {
      id: `checklist-${Date.now()}`,
      title: checklistTitle,
      items: [],
      hideCheckedItems: false,
    };
    const updated = [...checklists, newChecklist];
    setChecklists(updated);
    updateTask({ checklists: updated });
    return newChecklist;
  }, [checklists, updateTask]);

  const updateChecklistFn = useCallback((id: string, updates: Partial<Omit<Checklist, 'id'>>) => {
    const updated = checklists.map((checklist) =>
      checklist.id === id ? { ...checklist, ...updates } : checklist
    );
    setChecklists(updated);
    updateTask({ checklists: updated });
  }, [checklists, updateTask]);

  const deleteChecklist = useCallback((id: string) => {
    const updated = checklists.filter((checklist) => checklist.id !== id);
    setChecklists(updated);
    updateTask({ checklists: updated });
  }, [checklists, updateTask]);

  const addChecklistItem = useCallback((
    checklistId: string,
    text: string,
    metadata?: {
      assignedMembers?: string[];
      dueDate?: string;
      dueTime?: string;
      reminder?: ReminderOption
    }
  ): ChecklistItem => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text,
      completed: false,
      // Include metadata in the initial item creation to avoid stale closure issues
      assignedMembers: metadata?.assignedMembers,
      dueDate: metadata?.dueDate,
      dueTime: metadata?.dueTime,
      reminder: metadata?.reminder,
    };
    const updated = checklists.map((checklist) =>
      checklist.id === checklistId
        ? { ...checklist, items: [...checklist.items, newItem] }
        : checklist
    );
    setChecklists(updated);
    updateTask({ checklists: updated });
    return newItem;
  }, [checklists, updateTask]);

  const updateChecklistItem = useCallback((
    checklistId: string,
    itemId: string,
    updates: Partial<Omit<ChecklistItem, 'id'>>
  ) => {
    const updated = checklists.map((checklist) =>
      checklist.id === checklistId
        ? {
          ...checklist,
          items: checklist.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }
        : checklist
    );
    setChecklists(updated);
    updateTask({ checklists: updated });
  }, [checklists, updateTask]);

  const deleteChecklistItem = useCallback((checklistId: string, itemId: string) => {
    const updated = checklists.map((checklist) =>
      checklist.id === checklistId
        ? { ...checklist, items: checklist.items.filter((item) => item.id !== itemId) }
        : checklist
    );
    setChecklists(updated);
    updateTask({ checklists: updated });
  }, [checklists, updateTask]);

  const toggleChecklistItem = useCallback((checklistId: string, itemId: string) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    const item = checklist?.items.find((i) => i.id === itemId);
    if (item) {
      updateChecklistItem(checklistId, itemId, { completed: !item.completed });
    }
  }, [checklists, updateChecklistItem]);

  const setChecklistItemDueDate = useCallback((
    checklistId: string,
    itemId: string,
    date?: string,
    time?: string,
    reminder?: ReminderOption
  ) => {
    updateChecklistItem(checklistId, itemId, {
      dueDate: date,
      dueTime: time,
      reminder: reminder || undefined,
    });
  }, [updateChecklistItem]);

  const removeChecklistItemDueDate = useCallback((checklistId: string, itemId: string) => {
    updateChecklistItem(checklistId, itemId, {
      dueDate: undefined,
      dueTime: undefined,
      reminder: undefined,
    });
  }, [updateChecklistItem]);

  const assignChecklistMembers = useCallback((checklistId: string, itemId: string, memberIds: string[]) => {
    updateChecklistItem(checklistId, itemId, { assignedMembers: memberIds });
  }, [updateChecklistItem]);

  const getChecklistProgress = useCallback((checklistId: string): number => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return 0;
    return calculateChecklistProgress(checklist.items);
  }, [checklists]);

  // ============================================================================
  // Custom Fields
  // ============================================================================

  const getCustomFieldDefinitions = useCallback((fieldIds: string[]): CustomFieldDefinition[] => {
    return getCustomFieldsByIds(fieldIds);
  }, []);

  const createCustomFieldFn = useCallback((data: Omit<CustomFieldDefinition, 'id' | 'createdAt'>): CustomFieldDefinition => {
    const newField = createCustomField(data);
    setCustomFields(getCustomFields());
    return newField;
  }, []);

  const updateCustomFieldDef = useCallback((id: string, data: Partial<Omit<CustomFieldDefinition, 'id' | 'createdAt'>>) => {
    updateCustomField(id, data);
    setCustomFields(getCustomFields());
  }, []);

  const deleteCustomFieldDef = useCallback((id: string) => {
    deleteCustomField(id);
    setCustomFields(getCustomFields());
  }, []);

  const setCustomFieldValue = useCallback((fieldId: string, value: any) => {
    const existingIndex = taskCustomFields.findIndex((fv) => fv.fieldId === fieldId);
    let newFieldValues: CustomFieldValue[];

    if (existingIndex >= 0) {
      newFieldValues = [...taskCustomFields];
      newFieldValues[existingIndex] = { fieldId, value };
    } else {
      newFieldValues = [...taskCustomFields, { fieldId, value }];
    }

    setTaskCustomFields(newFieldValues);
    updateTask({ customFields: newFieldValues });
  }, [taskCustomFields, updateTask]);

  const removeCustomFieldValue = useCallback((fieldId: string) => {
    const newFieldValues = taskCustomFields.filter((fv) => fv.fieldId !== fieldId);
    setTaskCustomFields(newFieldValues);
    updateTask({ customFields: newFieldValues });
  }, [taskCustomFields, updateTask]);

  const toggleCustomFieldOnTask = useCallback((fieldId: string) => {
    const existingIndex = taskCustomFields.findIndex((fv) => fv.fieldId === fieldId);
    if (existingIndex >= 0) {
      removeCustomFieldValue(fieldId);
    } else {
      const fieldDef = customFields.find((f) => f.id === fieldId);
      let defaultValue: any = null;
      if (fieldDef) {
        if (fieldDef.defaultValue !== undefined) {
          defaultValue = fieldDef.defaultValue;
        } else if (fieldDef.field_type === 'checkbox') {
          defaultValue = false;
        } else if (fieldDef.field_type === 'number') {
          defaultValue = 0;
        } else if (fieldDef.field_type === 'select' && fieldDef.options?.length) {
          defaultValue = fieldDef.options[0];
        }
      }
      setCustomFieldValue(fieldId, defaultValue);
    }
  }, [taskCustomFields, customFields, removeCustomFieldValue, setCustomFieldValue]);

  // ============================================================================
  // Attachments
  // ============================================================================

  const uploadFiles = useCallback((files: File[]) => {
    const newAttachments: Attachment[] = files.map((file) => ({
      id: uuidv4(),
      filename: file.name,
      size: file.size,
      type: file.type,
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    }));
    const updated = [...newAttachments, ...attachments];
    setAttachments(updated);
    updateTask({ attachments: updated });
  }, [attachments, updateTask]);

  const deleteAttachment = useCallback((attachmentId: string) => {
    const updated = attachments.filter((att) => att.id !== attachmentId);
    setAttachments(updated);
    updateTask({ attachments: updated });
  }, [attachments, updateTask]);

  const downloadAttachment = useCallback((attachment: Attachment) => {
    if (attachment.url) {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // ============================================================================
  // Comments
  // ============================================================================

  const addComment = useCallback((comment: Comment) => {
    const updated = [comment, ...comments];
    setComments(updated);
    updateTask({ comments: updated });
  }, [comments, updateTask]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleSetTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    updateTask({ title: newTitle });
  }, [updateTask]);

  const handleSetDescription = useCallback((newDesc: string) => {
    setDescription(newDesc);
    updateTask({ description: newDesc });
  }, [updateTask]);

  const toggleComplete = useCallback(() => {
    const newVal = !isCompleted;
    setIsCompleted(newVal);
    updateTask({ isCompleted: newVal });
  }, [isCompleted, updateTask]);

  const summarize = useCallback(async () => {
    setIsSummarizing(true);
    try {
      // Dynamic import to avoid SSR issues
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this lead and email thread to draft a concise CRM update. Lead: ${task.contact}. Title: ${title}.`,
      });
      const generatedText = response.text || description;
      setDescription(generatedText);
      updateTask({ description: generatedText });
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setIsSummarizing(false);
    }
  }, [task.contact, title, description, updateTask]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<TaskContextValue>(() => ({
    // Task data
    task,
    title,
    description,
    isCompleted,
    isSummarizing,

    // Labels
    taskLabels,
    taskLabelObjects,
    allLabels,
    toggleLabel,
    createNewLabel,
    editLabel,
    removeLabel,

    // Members
    taskMembers,
    taskMemberObjects,
    allMembers,
    toggleMember,

    // Dates
    taskDates,
    formattedDate,
    dateStatus,
    dateStatusBadge,
    hasDates,
    saveDates,
    removeDates,

    // Checklists
    checklists,
    createChecklist,
    updateChecklist: updateChecklistFn,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    setChecklistItemDueDate,
    removeChecklistItemDueDate,
    assignChecklistMembers,
    getChecklistProgress,

    // Custom Fields
    customFields,
    taskCustomFields,
    getCustomFieldDefinitions,
    createCustomField: createCustomFieldFn,
    updateCustomFieldDef,
    deleteCustomFieldDef,
    setCustomFieldValue,
    removeCustomFieldValue,
    toggleCustomFieldOnTask,

    // Attachments
    attachments,
    uploadFiles,
    deleteAttachment,
    downloadAttachment,

    // Comments
    comments,
    addComment,

    // Actions
    setTitle: handleSetTitle,
    setDescription: handleSetDescription,
    toggleComplete,
    summarize,
  }), [
    task,
    title,
    description,
    isCompleted,
    isSummarizing,
    taskLabels,
    taskLabelObjects,
    allLabels,
    toggleLabel,
    createNewLabel,
    editLabel,
    removeLabel,
    taskMembers,
    taskMemberObjects,
    allMembers,
    toggleMember,
    taskDates,
    formattedDate,
    dateStatus,
    dateStatusBadge,
    hasDates,
    saveDates,
    removeDates,
    checklists,
    createChecklist,
    updateChecklistFn,
    deleteChecklist,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    setChecklistItemDueDate,
    removeChecklistItemDueDate,
    assignChecklistMembers,
    getChecklistProgress,
    customFields,
    taskCustomFields,
    getCustomFieldDefinitions,
    createCustomFieldFn,
    updateCustomFieldDef,
    deleteCustomFieldDef,
    setCustomFieldValue,
    removeCustomFieldValue,
    toggleCustomFieldOnTask,
    attachments,
    uploadFiles,
    deleteAttachment,
    downloadAttachment,
    comments,
    addComment,
    handleSetTitle,
    handleSetDescription,
    toggleComplete,
    summarize,
  ]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useTaskProvider = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
